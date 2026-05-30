import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// GET /api/cron/mp-sync
// Ejecutado por Vercel Cron cada 2 minutos.
// Busca pagos aprobados nuevos en todas las cuentas MP conectadas.
export async function GET(req: NextRequest) {
  // Verificar que viene de Vercel Cron (o de nosotros en desarrollo)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = getAdminDb();
  const connections = await db.collection("mp_connections").get();

  if (connections.empty) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  let totalSaved = 0;

  for (const connDoc of connections.docs) {
    const { userId, accessToken } = connDoc.data();

    try {
      // Buscar pagos aprobados de los últimos 3 minutos (overlap para no perder ninguno)
      const since = new Date(Date.now() - 3 * 60 * 1000).toISOString();

      const searchRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&status=approved&begin_date=${since}&limit=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!searchRes.ok) {
        console.error(`MP sync error for ${connDoc.id}:`, await searchRes.text());
        continue;
      }

      const data = await searchRes.json();
      const payments = data.results ?? [];

      for (const payment of payments) {
        const paymentId = String(payment.id);

        // Verificar si ya está guardado
        const existing = await db
          .collection("notifications")
          .where("mpPaymentId", "==", paymentId)
          .limit(1)
          .get();

        if (!existing.empty) continue;

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
          mpPaymentId: paymentId,
          timestamp:   payment.date_approved
            ? new Date(payment.date_approved)
            : FieldValue.serverTimestamp(),
        });

        totalSaved++;
      }
    } catch (err) {
      console.error(`MP sync error for connection ${connDoc.id}:`, err);
    }
  }

  console.log(`MP sync completed: ${totalSaved} new payments saved`);
  return NextResponse.json({ ok: true, synced: totalSaved });
}
