import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: NextRequest) {
  // Verificar usuario autenticado
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

  // Leer precio del plan desde Firestore
  const db = getAdminDb();
  const configSnap = await db.collection("config").doc("plans").get();
  const proPrice = configSnap.exists ? (configSnap.data()?.proPrice ?? 2500) : 2500;

  // Crear suscripción en MercadoPago (Preapproval)
  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      reason: "NListener Pro",
      external_reference: uid,
      payer_email: email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: proPrice,
        currency_id: "ARS",
      },
      back_url: `${APP_URL}/upgrade/success`,
      status: "pending",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("MP error:", err);
    return NextResponse.json({ error: "Error al crear suscripción" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ init_point: data.init_point });
}
