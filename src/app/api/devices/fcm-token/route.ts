import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// POST /api/devices/fcm-token
// Guarda el token FCM del dispositivo para poder enviarle mensajes remotos.
// Header: Authorization: Bearer {deviceToken}
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deviceToken = authHeader.slice(7);
  const { fcmToken } = await req.json().catch(() => ({}));
  if (!fcmToken) return NextResponse.json({ error: "fcmToken requerido" }, { status: 400 });

  const db = getAdminDb();
  const snap = await db.collection("devices")
    .where("token", "==", deviceToken)
    .where("active", "==", true)
    .limit(1).get();

  if (snap.empty) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  await snap.docs[0].ref.update({ fcmToken });
  return NextResponse.json({ ok: true });
}
