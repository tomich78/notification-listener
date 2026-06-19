import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Cache token → docRef para no releer Firestore en cada heartbeat
// El heartbeat se llama cada ~4 minutos — sin cache son 360 reads/día por dispositivo
const tokenCache = new Map<string, { docPath: string; expiry: number }>();
const TOKEN_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// POST /api/heartbeat
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deviceToken = authHeader.slice(7);
  const db = getAdminDb();

  let docPath: string | null = null;

  // Buscar en cache primero
  const cached = tokenCache.get(deviceToken);
  if (cached && Date.now() < cached.expiry) {
    docPath = cached.docPath;
  } else {
    // Solo leer Firestore si no está en cache o expiró
    const deviceSnap = await db
      .collection("devices")
      .where("token", "==", deviceToken)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (deviceSnap.empty) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    docPath = deviceSnap.docs[0].ref.path;
    tokenCache.set(deviceToken, { docPath, expiry: Date.now() + TOKEN_CACHE_TTL });
  }

  await db.doc(docPath).update({ lastSeen: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true });
}
