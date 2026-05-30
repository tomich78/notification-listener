import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// POST /api/heartbeat
// Lo llama la app Android al iniciar el servicio.
// Solo actualiza lastSeen del dispositivo para mostrar "Activo" en el dashboard.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deviceToken = authHeader.slice(7);
  const db = getAdminDb();

  const deviceSnap = await db
    .collection("devices")
    .where("token", "==", deviceToken)
    .where("active", "==", true)
    .limit(1)
    .get();

  if (deviceSnap.empty) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  await deviceSnap.docs[0].ref.update({
    lastSeen: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
