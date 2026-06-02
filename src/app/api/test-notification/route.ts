import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// POST /api/test-notification
// Crea una notificación de prueba para el usuario autenticado.
// Header: Authorization: Bearer {firebaseIdToken}
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const idToken = authHeader.slice(7);
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getAdminDb();
    await db.collection("notifications").add({
      userId: uid,
      deviceId: null,
      deviceName: "Prueba",
      source: "manual",
      app: "NListener Test",
      text: "✅ Notificación de prueba — la conexión funciona correctamente.",
      amount: null,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
