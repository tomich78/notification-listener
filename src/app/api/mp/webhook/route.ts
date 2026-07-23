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
      billingMode: "auto",
      // Con débito automático el acceso no vence solo: lo controla MercadoPago
      planExpiresAt: null,
      mpLastPaymentFailed: false,
      planActivatedAt: new Date(),
    });
    sendNewSubscriberEmail(userEmail, preapprovalId).catch(console.error);
    sendWelcomeProEmail(userEmail).catch(console.error);
  } else if (status === "cancelled" || status === "paused") {
    // Si la baja la hizo el usuario desde la app, /api/mp/cancel ya dejó
    // planExpiresAt con el fin del período pago: no lo pisamos ni re-avisamos.
    if (userData?.mpStatus === "cancelled" && !userData?.mpSubscriptionId) return;

    const reason = userData?.mpLastPaymentFailed ? "payment_failed" : "manual";

    // Si el pago falló, el período no está pago: se corta ya.
    // Si fue una baja normal, respetamos lo que ya pagó (next_payment_date).
    let accessUntil: Date | null = null;
    if (!userData?.mpLastPaymentFailed && preapproval?.next_payment_date) {
      const d = new Date(preapproval.next_payment_date);
      if (!isNaN(d.getTime()) && d > new Date()) accessUntil = d;
    }

    await userRef.update({
      plan: accessUntil ? "pro" : "free",
      planExpiresAt: accessUntil,
      mpStatus: status,
      mpSubscriptionId: null,
      billingMode: accessUntil ? "manual" : null,
      mpLastPaymentFailed: false,
    });
    sendCancellationEmail(userEmail).catch(console.error);
    sendUserCancellationEmail(userEmail, reason).catch(console.error);
  }
}

/**
 * Pago único (Checkout Pro): suma meses al vencimiento en vez de crear una
 * suscripción. El external_reference viene como "manual:{uid}:{period}".
 */
async function handleManualPayment(uid: string, period: string, amount: number, paymentId: string) {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);

  // Idempotencia: si este pago ya se acreditó, no sumar los meses de nuevo.
  // (MercadoPago reenvía el mismo evento varias veces.)
  const creditRef = db.collection("processedPayments").doc(String(paymentId));
  const alreadyCredited = await db.runTransaction(async (tx) => {
    const snap = await tx.get(creditRef);
    if (snap.exists) return true;
    tx.set(creditRef, { uid, period, amount, at: new Date() });
    return false;
  });
  if (alreadyCredited) return;

  const userSnap = await userRef.get();
  const userData = userSnap.data();
  const userEmail = userData?.email ?? "";

  const months = period === "annual" ? 12 : 1;
  // Si todavía tiene plan vigente, el tiempo nuevo se acumula sobre el vencimiento
  const current = userData?.planExpiresAt?.toDate?.();
  const base = current && current > new Date() ? current : new Date();
  const expiresAt = new Date(base);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const wasAlreadyPro = userData?.plan === "pro";

  await userRef.update({
    plan: "pro",
    planExpiresAt: expiresAt,
    billingMode: "manual",
    mpLastPaymentFailed: false,
    planActivatedAt: userData?.planActivatedAt ?? new Date(),
  });

  if (wasAlreadyPro) {
    sendPaymentRenewedEmail(userEmail, amount).catch(console.error);
  } else {
    sendNewSubscriberEmail(userEmail, `pago único ${period}`).catch(console.error);
    sendWelcomeProEmail(userEmail).catch(console.error);
  }
}

async function handlePaymentEvent(paymentId: string | undefined) {
  if (!paymentId) return;

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) return;

  const payment = await res.json();
  const reference = String(payment.external_reference ?? "");
  const status = payment.status; // "approved" | "rejected" | "pending" | "in_process" | ...
  if (!reference) return;

  // Pago único desde Checkout Pro: "manual:{uid}:{period}"
  if (reference.startsWith("manual:")) {
    if (status !== "approved") return; // los pagos únicos solo importan si se aprobaron
    const [, manualUid, manualPeriod] = reference.split(":");
    if (!manualUid) return;
    await handleManualPayment(
      manualUid,
      manualPeriod ?? "monthly",
      payment.transaction_amount ?? 0,
      String(payment.id ?? paymentId)
    );
    return;
  }

  // Cobro generado por una suscripción con débito automático
  const uid = reference;

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
