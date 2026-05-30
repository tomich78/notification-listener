import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// POST /api/webhooks/mercadopago
// MercadoPago llama a este endpoint cada vez que entra un pago.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Solo nos interesan los pagos aprobados
    if (body.type !== "payment" || body.action !== "payment.created") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    const mpUserId  = String(body.user_id);

    if (!paymentId || !mpUserId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const db = getAdminDb();

    // Buscar la conexión del usuario por mpUserId
    const connSnap = await db.collection("mp_connections").doc(mpUserId).get();
    if (!connSnap.exists) {
      // No tenemos este usuario conectado — ignoramos
      return NextResponse.json({ ok: true });
    }

    const conn = connSnap.data()!;
    const { userId, accessToken } = conn;

    // Obtener los detalles del pago desde la API de MercadoPago
    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!paymentRes.ok) {
      console.error("MP payment fetch error:", await paymentRes.text());
      return NextResponse.json({ ok: true }); // No frenamos — MP reintenta si devolvemos error
    }

    const payment = await paymentRes.json();

    // Solo guardar pagos aprobados
    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const amount      = payment.transaction_amount as number;
    const description = payment.description || "Pago recibido";
    const payerEmail  = payment.payer?.email || "";
    const currency    = payment.currency_id || "ARS";

    // Formatear el texto de la notificación
    const amountFormatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
    }).format(amount);

    const text = payerEmail
      ? `${description} - ${amountFormatted} de ${payerEmail}`
      : `${description} - ${amountFormatted}`;

    // Guardar en Firestore (misma colección que las notificaciones de Android)
    await db.collection("notifications").add({
      userId,
      deviceId:  null,
      source:    "mercadopago",
      app:       "MercadoPago",
      text,
      amount,
      timestamp: payment.date_approved
        ? new Date(payment.date_approved)
        : FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    // Devolvemos 200 igual para que MP no reintente indefinidamente
    return NextResponse.json({ ok: true });
  }
}
