import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "tdsdeveloper00@gmail.com";

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.email !== ADMIN_EMAIL) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.collection("users").orderBy("createdAt", "desc").get();
  const users = snap.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid, plan } = await req.json();
  if (!uid || !["free", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("users").doc(uid).update({ plan });
  return NextResponse.json({ ok: true });
}
