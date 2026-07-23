import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { manualPrice, manualMonths, type ManualPeriod } from "@/lib/pricing";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

/**
 * POST /api/mp/checkout
 * Crea un pago ÚNICO (Checkout Pro) para quienes no quieren débito automático.
 * No genera cobros recurrentes: suma 1 o 12 meses al vencimiento del plan y
 * el cliente vuelve a pagar cuando quiera renovar.
 *
 * Body: { period: "monthly" | "annual" }
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let uid: string;
  let email: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const period: ManualPeriod = body?.period === "annual" ? "annual" : "monthly";

  const db = getAdminDb();
  const configSnap = await db.collection("config").doc("plans").get();
  const proPrice = configSnap.exists ? (configSnap.data()?.proPrice ?? 2500) : 2500;

  const amount = manualPrice(proPrice, period);
  const months = manualMonths(period);
  const label = period === "annual" ? "1 año" : "1 mes";

  // external_reference con prefijo "manual:" para que el webhook distinga
  // este pago único de los cobros generados por una suscripción recurrente.
  const externalReference = `manual:${uid}:${period}`;

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: `NListener Pro — ${label}`,
          description: `Acceso al plan Pro por ${label}. Sin débito automático.`,
          quantity: 1,
          unit_price: amount,
          currency_id: "ARS",
        },
      ],
      payer: { email },
      external_reference: externalReference,
      metadata: { uid, period, months, kind: "manual" },
      back_urls: {
        success: `${APP_URL}/upgrade/success`,
        pending: `${APP_URL}/upgrade/success`,
        failure: `${APP_URL}/upgrade`,
      },
      auto_return: "approved",
      statement_descriptor: "NLISTENER",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[mp/checkout] Error de MercadoPago:", err);
    return NextResponse.json({ error: "Error al crear el pago" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ init_point: data.init_point });
}
