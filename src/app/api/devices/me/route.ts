import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Cache token → { uid } para no releer Firestore cada vez que la app pide el link
const tokenCache = new Map<string, { uid: string; expiry: number }>();
const TOKEN_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// GET /api/devices/me
// Header: Authorization: Bearer {deviceToken}
// Devuelve el uid del dueño del dispositivo, para que la app pueda armar
// el link público /view/{uid} y compartirlo.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deviceToken = authHeader.slice(7);

  const cached = tokenCache.get(deviceToken);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ uid: cached.uid });
  }

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

  const uid = deviceSnap.docs[0].data().userId as string;
  tokenCache.set(deviceToken, { uid, expiry: Date.now() + TOKEN_CACHE_TTL });

  return NextResponse.json({ uid });
}
