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
  const snap = await db.collection("devices").get();

  const devices = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        active: data.active as boolean,
        name: data.name as string,
        token: data.token as string,
        userId: data.userId as string,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        lastSeen: data.lastSeen?.toDate?.()?.toISOString() ?? null,
      };
    })
    .filter((d) => d.active === true)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return NextResponse.json(devices);
}
