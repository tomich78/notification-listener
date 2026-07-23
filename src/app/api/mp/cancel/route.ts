import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

/**
 * POST /api/mp/cancel
 * Da de baja el débito automático del usuario autenticado.
 *
 * El acceso Pro NO se corta al instante: el usuario ya pagó el período en curso,
 * así que se mantiene hasta la fecha del próximo cobro que ya no se va a hacer.
 * A partir de ahí, checkPlanExpiry lo baja a Free automáticamente.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const data = userSnap.data();

  const subscriptionId = data?.mpSubscriptionId;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "No tenés una suscripción con débito automático activa" },
      { status: 400 }
    );
  }

  // 1) Consultar la suscripción para saber hasta cuándo está paga
  let paidUntil: Date | null = null;
  try {
    const getRes = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (getRes.ok) {
      const pre = await getRes.json();
      // next_payment_date = cuándo se cobraría de nuevo, o sea el fin del período pago
      if (pre?.next_payment_date) {
        const d = new Date(pre.next_payment_date);
        if (!isNaN(d.getTime())) paidUntil = d;
      }
    }
  } catch (err) {
    console.error("[mp/cancel] No se pudo leer la suscripción:", err);
  }

  // 2) Cancelar en MercadoPago
  const cancelRes = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  if (!cancelRes.ok) {
    const err = await cancelRes.json().catch(() => ({}));
    console.error("[mp/cancel] Error de MercadoPago:", err);
    return NextResponse.json(
      { error: "No pudimos cancelar la suscripción. Intentá de nuevo en unos minutos." },
      { status: 502 }
    );
  }

  // 3) Mantener el acceso hasta el fin del período ya pagado.
  //    Si MP no informó la fecha, damos 30 días desde hoy para no perjudicar al cliente.
  if (!paidUntil) {
    paidUntil = new Date();
    paidUntil.setDate(paidUntil.getDate() + 30);
  }

  await userRef.update({
    mpStatus: "cancelled",
    mpSubscriptionId: null,
    mpLastPaymentFailed: false,
    billingMode: "manual",
    planExpiresAt: paidUntil,
    // plan sigue en "pro" hasta planExpiresAt; checkPlanExpiry lo baja después
  });

  return NextResponse.json({ ok: true, accessUntil: paidUntil.toISOString() });
}
