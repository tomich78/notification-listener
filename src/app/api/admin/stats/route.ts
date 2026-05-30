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
  const [usersSnap, devicesSnap, notifsSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("devices").get(),
    db.collection("notifications").count().get(),
  ]);

  const proUsers = usersSnap.docs.filter((d) => d.data().plan === "pro").length;

  return NextResponse.json({
    users: usersSnap.size,
    proUsers,
    devices: devicesSnap.size,
    notifications: notifsSnap.data().count,
  });
}
