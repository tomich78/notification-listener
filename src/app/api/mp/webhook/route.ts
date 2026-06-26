import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  sendNewSubscriberEmail,
  sendCancellationEmail,
  sendWelcomeProEmail,
  sendPaymentRenewedEmail,
  sendPaymentFailedEmail,
  sendUserCancellationEmail,
} from "@/lib/email";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const { type, data } = body;

  if (type === "subscription_preapproval") {
    await handlePreapprovalEvent(data?.id);
  } else if (type === "payment") {
    await handlePaymentEvent(data?.id);
  }

  return NextResponse.json({ ok: true });
}

async function handlePreapprovalEvent(preapprovalId: string | undefined) {
  if (!preapprovalId) return;

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) return;

  const preapproval = await res.json();
  const uid = preapproval.external_reference;
  const status = preapproval.status; // "authorized" | "paused" | "cancelled" | "pending"
  if (!uid) return;

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data();
  const userEmail = userData?.email ?? "";

  if (status === "authorized") {
    await userRef.update({
      plan: "pro",
      mpSubscriptionId: preapprovalId,
      mpStatus: status,
      planActivatedAt: new Date(),
    });
    sendNewSubscriberEmail(userEmail, preapprovalId).catch(console.error);
    sendWelcomeProEmail(userEmail).catch(console.error);
  } else if (status === "cancelled" || status === "paused") {
    const reason = userData?.mpLastPaymentFailed ? "payment_failed" : "manual";
    await userRef.update({
      plan: "free",
      mpStatus: status,
      mpLastPaymentFailed: false,
    });
    sendCancellationEmail(userEmail).catch(console.error);
    sendUserCancellationEmail(userEmail, reason).catch(console.error);
  }
}

async function handlePaymentEvent(paymentId: string | undefined) {
  if (!paymentId) return;

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) return;

  const payment = await res.json();
  const uid = payment.external_reference;
  const status = payment.status; // "approved" | "rejected" | "pending" | "in_process" | ...
  // Solo nos interesan pagos recurrentes de suscripción (tienen monto fijo, no son el primer cobro manual)
  if (!uid) return;

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data();
  const userEmail = userData?.email ?? "";
  if (!userEmail) return;

  // Si ya era Pro antes de este pago, es una renovación. Si no, es la activación
  // inicial — ese mail de bienvenida ya lo manda el evento subscription_preapproval.
  const wasAlreadyPro = userData?.plan === "pro";

  if (status === "approved") {
    await userRef.update({ mpLastPaymentFailed: false });
    if (wasAlreadyPro) {
      sendPaymentRenewedEmail(userEmail, payment.transaction_amount ?? 0).catch(console.error);
    }
  } else if (status === "rejected") {
    await userRef.update({ mpLastPaymentFailed: true });
    sendPaymentFailedEmail(userEmail).catch(console.error);
  }
}
