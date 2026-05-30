import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  const mpUserId = userDoc.data()?.mercadopago?.mpUserId;

  if (mpUserId) {
    await db.collection("mp_connections").doc(mpUserId).delete();
  }

  await db.collection("users").doc(uid).update({
    "mercadopago.connected": false,
    "mercadopago.mpUserId":  FieldValue.delete(),
  });

  return NextResponse.json({ ok: true });
}
