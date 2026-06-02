import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// POST /api/devices/reconnect
// Envía un mensaje FCM al dispositivo para que reinicie el servicio.
// Body: { deviceId: string }
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const idToken = authHeader.slice(7);
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { deviceId } = await req.json().catch(() => ({}));
    if (!deviceId) return NextResponse.json({ error: "deviceId requerido" }, { status: 400 });

    const db = getAdminDb();
    const deviceDoc = await db.collection("devices").doc(deviceId).get();

    if (!deviceDoc.exists || deviceDoc.data()?.userId !== uid) {
      return NextResponse.json({ error: "Dispositivo no encontrado" }, { status: 404 });
    }

    const fcmToken = deviceDoc.data()?.fcmToken;
    if (!fcmToken) {
      return NextResponse.json(
        { error: "El dispositivo no tiene token FCM. Actualizá la app." },
        { status: 400 }
      );
    }

    await getMessaging().send({
      token: fcmToken,
      data: { action: "reconnect" },
      android: {
        priority: "high",
        ttl: 60000, // 1 minuto de validez
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    // FCM token inválido/expirado
    if (msg.includes("registration-token-not-registered")) {
      return NextResponse.json(
        { error: "Token FCM inválido. El dispositivo debe reconectarse manualmente." },
        { status: 410 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
