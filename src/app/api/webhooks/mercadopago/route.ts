import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// POST /api/webhooks/mercadopago
// MercadoPago llama a este endpoint cuando entra o se actualiza un pago.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("MP webhook received:", JSON.stringify(body));

    // Aceptamos payment.created y payment.updated
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    const mpUserId  = String(body.user_id);

    if (!paymentId || !mpUserId) {
      console.log("MP webhook: missing paymentId or mpUserId");
      return NextResponse.json({ ok: true });
    }

    const db = getAdminDb();

    // Buscar la conexión del usuario por mpUserId
    const connSnap = await db.collection("mp_connections").doc(mpUserId).get();
    if (!connSnap.exists) {
      console.log("MP webhook: no connection found for mpUserId", mpUserId);
      // Loguear todas las conexiones para debug
      const allConns = await db.collection("mp_connections").get();
      console.log("MP connections in DB:", allConns.docs.map(d => d.id));
      return NextResponse.json({ ok: true });
    }

    const { userId, accessToken } = connSnap.data()!;

    // Obtener los detalles del pago
    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!paymentRes.ok) {
      const errText = await paymentRes.text();
      console.error("MP payment fetch error:", errText);
      return NextResponse.json({ ok: true });
    }

    const payment = await paymentRes.json();
    console.log("MP payment status:", payment.status, "amount:", payment.transaction_amount);

    // Solo guardar pagos aprobados
    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    // Evitar duplicados: verificar si ya guardamos este pago
    const existing = await db
      .collection("notifications")
      .where("mpPaymentId", "==", String(paymentId))
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log("MP webhook: payment already saved", paymentId);
      return NextResponse.json({ ok: true });
    }

    const amount      = payment.transaction_amount as number;
    const description = (payment.description || "Pago recibido").trim();
    const payerEmail  = payment.payer?.email || "";
    const currency    = payment.currency_id || "ARS";

    const amountFormatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
    }).format(amount);

    const text = payerEmail
      ? `${description} - ${amountFormatted} de ${payerEmail}`
      : `${description} - ${amountFormatted}`;

    await db.collection("notifications").add({
      userId,
      deviceId:    null,
      source:      "mercadopago",
      app:         "MercadoPago",
      text,
      amount,
      mpPaymentId: String(paymentId),
      timestamp:   payment.date_approved
        ? new Date(payment.date_approved)
        : FieldValue.serverTimestamp(),
    });

    console.log("MP webhook: saved payment", paymentId, "for user", userId);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
