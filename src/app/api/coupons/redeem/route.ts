import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// POST /api/coupons/redeem
// Header: Authorization: Bearer {firebaseIdToken}
// Body: { code: string }
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
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Ingresá un código" }, { status: 400 });
  }

  const db = getAdminDb();
  const couponRef = db.collection("coupons").doc(code);
  const redemptionRef = couponRef.collection("redemptions").doc(uid);
  const userRef = db.collection("users").doc(uid);

  try {
    const expiresAt = await db.runTransaction(async (tx) => {
      const [couponSnap, redemptionSnap] = await Promise.all([
        tx.get(couponRef),
        tx.get(redemptionRef),
      ]);

      if (!couponSnap.exists) throw new Error("NOT_FOUND");
      const coupon = couponSnap.data()!;
      if (!coupon.active) throw new Error("INACTIVE");
      if (redemptionSnap.exists) throw new Error("ALREADY_USED");
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new Error("MAX_USES");
      }

      const expires = new Date();
      expires.setDate(expires.getDate() + coupon.durationDays);

      tx.update(couponRef, { usedCount: FieldValue.increment(1) });
      tx.set(redemptionRef, { redeemedAt: new Date() });
      tx.update(userRef, { plan: "pro", planExpiresAt: expires });

      return expires;
    });

    return NextResponse.json({ ok: true, plan: "pro", expiresAt: expiresAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ERROR";
    const errors: Record<string, { status: number; error: string }> = {
      NOT_FOUND:    { status: 404, error: "Código inválido" },
      INACTIVE:     { status: 410, error: "Este cupón ya no está disponible" },
      ALREADY_USED: { status: 409, error: "Ya usaste este cupón" },
      MAX_USES:     { status: 410, error: "Este cupón alcanzó el límite de usos" },
    };
    const e = errors[message] ?? { status: 500, error: "Error al canjear el cupón" };
    return NextResponse.json({ error: e.error }, { status: e.status });
  }
}
