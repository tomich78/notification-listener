import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/devices
// Header: Authorization: Bearer {firebaseIdToken}
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const idToken = authHeader.slice(7);
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "Mi dispositivo").slice(0, 60);
  const token = randomBytes(32).toString("hex");

  const ref = await getAdminDb().collection("devices").add({
    userId: uid,
    name,
    token,
    active: true,
    lastSeen: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ deviceId: ref.id, token });
}

// DELETE /api/devices?id={deviceId}
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const idToken = authHeader.slice(7);
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const deviceId = req.nextUrl.searchParams.get("id");
  if (!deviceId) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const db = getAdminDb();
  const deviceRef = db.collection("devices").doc(deviceId);
  const deviceSnap = await deviceRef.get();

  if (!deviceSnap.exists || deviceSnap.data()?.userId !== uid) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await deviceRef.update({ active: false });
  return NextResponse.json({ ok: true });
}
