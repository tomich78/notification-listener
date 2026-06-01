import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const { type, data } = body;

  // Solo procesamos eventos de suscripciones
  if (type !== "subscription_preapproval") {
    return NextResponse.json({ ok: true });
  }

  const preapprovalId = data?.id;
  if (!preapprovalId) return NextResponse.json({ ok: true });

  // Consultar el estado de la suscripción en MP
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ ok: true });

  const preapproval = await res.json();
  const uid = preapproval.external_reference;
  const status = preapproval.status; // "authorized" | "paused" | "cancelled" | "pending"

  if (!uid) return NextResponse.json({ ok: true });

  const db = getAdminDb();

  if (status === "authorized") {
    // Activar plan Pro
    await db.collection("users").doc(uid).update({
      plan: "pro",
      mpSubscriptionId: preapprovalId,
      mpStatus: status,
      planActivatedAt: new Date(),
    });
  } else if (status === "cancelled" || status === "paused") {
    // Bajar a Free si se cancela o pausa
    await db.collection("users").doc(uid).update({
      plan: "free",
      mpStatus: status,
    });
  }

  return NextResponse.json({ ok: true });
}
