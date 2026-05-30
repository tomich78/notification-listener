import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// GET /api/cron/mp-sync
// Puede ser llamado:
//   - Por Vercel Cron (con Authorization: Bearer CRON_SECRET)
//   - Por el dashboard cuando el usuario lo abre (con Authorization: Bearer {firebase idToken})
//   - Con ?uid=USER_UID para sincronizar solo un usuario
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // Si no es el cron de Vercel, debe venir con un Firebase ID token
  let targetUserId: string | null = null;

  if (!isVercelCron) {
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
      const { getAdminAuth } = await import("@/lib/firebase-admin");
      const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
      targetUserId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
  }

  const db = getAdminDb();
  let connectionsQuery = db.collection("mp_connections");
  const connections = await connectionsQuery.get();

  if (connections.empty) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  let totalSaved = 0;

  for (const connDoc of connections.docs) {
    const { userId, accessToken } = connDoc.data();

    // Si es llamado desde el dashboard, solo sincronizar ese usuario
    if (targetUserId && userId !== targetUserId) continue;

    try {
      // Buscar pagos aprobados de los últimos 10 minutos
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

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
      console.error(`MP sync error for ${connDoc.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, synced: totalSaved });
}
