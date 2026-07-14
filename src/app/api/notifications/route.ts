import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { extractAmount, isPaymentNotification } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface IncomingNotification {
  app: string;
  text: string;
  timestamp?: number;
  // ID determinista calculado por la app (hash de sbnKey + text).
  // Se usa como ID del documento para que reenvíos de la misma notificación
  // sobrescriban el mismo doc en vez de crear duplicados.
  dedupeId?: string;
}

// Cache en módulo — sobrevive entre requests en la misma instancia de Vercel
const planConfigCache = {
  value: null as { freeNotifLimit: number } | null,
  expiry: 0,
};

const userPlanCache = new Map<string, { plan: string; expiry: number }>();

interface DeviceInfo { docPath: string; userId: string; name: string | null }
const deviceTokenCache = new Map<string, { device: DeviceInfo; expiry: number }>();

const PLAN_CONFIG_TTL   = 10 * 60 * 1000; // 10 minutos
const USER_PLAN_TTL     =  5 * 60 * 1000; // 5 minutos
const DEVICE_TOKEN_TTL  = 60 * 60 * 1000; // 1 hora (igual que heartbeat)

async function getPlansConfig(db: FirebaseFirestore.Firestore): Promise<{ freeNotifLimit: number }> {
  if (planConfigCache.value && Date.now() < planConfigCache.expiry) {
    return planConfigCache.value;
  }
  const snap = await db.collection("config").doc("plans").get();
  const config = { freeNotifLimit: snap.data()?.freeNotifLimit ?? 100 };
  planConfigCache.value = config;
  planConfigCache.expiry = Date.now() + PLAN_CONFIG_TTL;
  return config;
}

async function getUserPlan(db: FirebaseFirestore.Firestore, userId: string): Promise<string> {
  const cached = userPlanCache.get(userId);
  if (cached && Date.now() < cached.expiry) return cached.plan;

  const ref = db.collection("users").doc(userId);
  const snap = await ref.get();
  const data = snap.data();
  let plan = data?.plan ?? "free";

  // Plan otorgado por cupón vencido — revertir a free
  const expiresAt = data?.planExpiresAt?.toDate?.();
  if (plan === "pro" && expiresAt && expiresAt < new Date()) {
    plan = "free";
    await ref.update({ plan: "free", planExpiresAt: null });
  }

  userPlanCache.set(userId, { plan, expiry: Date.now() + USER_PLAN_TTL });
  return plan;
}

// POST /api/notifications
// Recibe un lote de notificaciones desde la app Android.
// Header: Authorization: Bearer {deviceToken}
// Body: { notifications: [{ app, text, timestamp? }] }
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deviceToken = authHeader.slice(7);

  try {
    const db = getAdminDb();

    // Verificar el token del dispositivo — con cache de 1h para no leer Firestore en cada notificación
    let deviceInfo: DeviceInfo | null = null;
    let deviceDocRef: FirebaseFirestore.DocumentReference | null = null;

    const cachedDevice = deviceTokenCache.get(deviceToken);
    if (cachedDevice && Date.now() < cachedDevice.expiry) {
      deviceInfo = cachedDevice.device;
      deviceDocRef = db.doc(deviceInfo.docPath);
    } else {
      const deviceSnap = await db
        .collection("devices")
        .where("token", "==", deviceToken)
        .where("active", "==", true)
        .limit(1)
        .get();

      if (deviceSnap.empty) {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      }

      const d = deviceSnap.docs[0];
      deviceInfo = { docPath: d.ref.path, userId: d.data().userId, name: d.data().name ?? null };
      deviceDocRef = d.ref;
      deviceTokenCache.set(deviceToken, { device: deviceInfo, expiry: Date.now() + DEVICE_TOKEN_TTL });
    }

    // Validar body
    const body = await req.json().catch(() => null);
    if (!body?.notifications || !Array.isArray(body.notifications)) {
      return NextResponse.json(
        { error: "Body debe tener { notifications: [...] }" },
        { status: 400 }
      );
    }

    const incoming: IncomingNotification[] = body.notifications;
    if (incoming.length === 0) {
      return NextResponse.json({ ok: true, saved: 0 });
    }

    // Filtrar notificaciones que no son cobros reales antes de cualquier lectura extra
    // El botón "notificación de prueba" de la app siempre pasa, para que el usuario
    // pueda confirmar que la conexión funciona sin que el filtro la descarte.
    const filtered = incoming.filter((n) => {
      if (n.app === "NListener Test") return true;
      const text = String(n.text ?? "").trim();
      return text.length > 0 && isPaymentNotification(text);
    });

    if (filtered.length === 0) {
      await deviceDocRef!.update({ lastSeen: FieldValue.serverTimestamp() });
      return NextResponse.json({ ok: true, saved: 0 });
    }

    // Verificar plan — usando cache para no leer Firestore en cada request
    const userPlan = await getUserPlan(db, deviceInfo.userId);

    let toSave = filtered;
    if (userPlan === "free") {
      const config = await getPlansConfig(db);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const countSnap = await db
        .collection("notifications")
        .where("userId", "==", deviceInfo.userId)
        .where("timestamp", ">=", startOfMonth)
        .count()
        .get();

      const monthCount = countSnap.data().count;
      if (monthCount >= config.freeNotifLimit) {
        return NextResponse.json(
          { error: "Límite mensual alcanzado", limit: config.freeNotifLimit, count: monthCount },
          { status: 429 }
        );
      }
      const remaining = config.freeNotifLimit - monthCount;
      toSave = filtered.slice(0, remaining);
    }

    // Guardar en Firestore (batch write)
    // Usamos dedupeId como ID del documento cuando la app lo envía: así, si la
    // misma notificación se reenvía (reintento por respuesta perdida, recaptura
    // al reconectar, o re-post del OEM), sobrescribe el mismo doc en vez de
    // duplicarlo. Firestore no permite escribir dos veces el mismo doc en un
    // batch, así que también deduplicamos dentro del propio request.
    const batch = db.batch();
    const seenIds = new Set<string>();
    let saved = 0;
    for (const n of toSave) {
      const text = String(n.text).slice(0, 1000);
      const app  = String(n.app  ?? "").slice(0, 100);
      if (!app) continue;

      const dedupeId =
        typeof n.dedupeId === "string" && n.dedupeId.length > 0 && !n.dedupeId.includes("/")
          ? n.dedupeId
          : null;

      if (dedupeId) {
        if (seenIds.has(dedupeId)) continue; // duplicado dentro del mismo lote
        seenIds.add(dedupeId);
      }

      const ref = dedupeId
        ? db.collection("notifications").doc(dedupeId)
        : db.collection("notifications").doc();

      batch.set(ref, {
        userId:     deviceInfo.userId,
        deviceId:   deviceInfo.docPath.split("/").pop(),
        deviceName: deviceInfo.name,
        source:     "android",
        app,
        text,
        amount:     extractAmount(text),
        timestamp:  n.timestamp
          ? new Date(n.timestamp)
          : FieldValue.serverTimestamp(),
      });
      saved++;
    }
    await batch.commit();

    await deviceDocRef!.update({ lastSeen: FieldValue.serverTimestamp() });

    return NextResponse.json({ ok: true, saved });

  } catch (err: unknown) {
    // RESOURCE_EXHAUSTED (código 8) → cuota de Firestore agotada
    // Devolver 503 para que el Android reintente y no pierda la notificación
    const code = (err as { code?: number })?.code;
    if (code === 8) {
      console.error("[notifications] Firestore quota exceeded:", err);
      return NextResponse.json(
        { error: "Servicio temporalmente no disponible, reintentá en unos minutos" },
        { status: 503 }
      );
    }
    console.error("[notifications] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
