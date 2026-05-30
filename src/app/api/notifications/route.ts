import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { extractAmount } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface IncomingNotification {
  app: string;
  text: string;
  timestamp?: number;
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
  const db = getAdminDb();

  // Verificar el token del dispositivo
  const deviceSnap = await db
    .collection("devices")
    .where("token", "==", deviceToken)
    .where("active", "==", true)
    .limit(1)
    .get();

  if (deviceSnap.empty) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const deviceDoc = deviceSnap.docs[0];
  const device = deviceDoc.data();

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

  // Guardar cada notificación en Firestore (batch write)
  const batch = db.batch();
  for (const n of incoming) {
    const text = String(n.text ?? "").slice(0, 1000);
    const app  = String(n.app  ?? "").slice(0, 100);
    if (!text || !app) continue;

    const ref = db.collection("notifications").doc();
    batch.set(ref, {
      userId:    device.userId,
      deviceId:  deviceDoc.id,
      source:    "android",
      app,
      text,
      amount:    extractAmount(text),
      timestamp: n.timestamp
        ? new Date(n.timestamp)
        : FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  // Actualizar lastSeen del dispositivo
  await deviceDoc.ref.update({ lastSeen: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true, saved: incoming.length });
}
