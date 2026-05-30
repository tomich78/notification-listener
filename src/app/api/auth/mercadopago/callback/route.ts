import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// GET /api/auth/mercadopago/callback
// MercadoPago redirige acá después de que el usuario autoriza.
export async function GET(req: NextRequest) {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!;
  const code    = req.nextUrl.searchParams.get("code");
  const uid     = req.nextUrl.searchParams.get("state"); // UID que mandamos en el paso anterior

  if (!code || !uid) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error`);
  }

  try {
    // Intercambiar el código por un access_token
    const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     process.env.MERCADOPAGO_CLIENT_ID,
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  `${appUrl}/api/auth/mercadopago/callback`,
      }),
    });

    if (!tokenRes.ok) {
      console.error("MP token error:", await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, user_id } = tokenData;

    const db = getAdminDb();

    // Guardar la conexión en una colección separada (lookup rápido por mpUserId en webhooks)
    await db.collection("mp_connections").doc(String(user_id)).set({
      userId:       uid,
      accessToken:  access_token,
      refreshToken: refresh_token,
      mpUserId:     String(user_id),
      connectedAt:  FieldValue.serverTimestamp(),
    });

    // También marcar en el documento del usuario que MP está conectado
    await db.collection("users").doc(uid).update({
      "mercadopago.connected": true,
      "mercadopago.mpUserId":  String(user_id),
      "mercadopago.connectedAt": FieldValue.serverTimestamp(),
    });

    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=connected`);
  } catch (err) {
    console.error("MP callback error:", err);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error`);
  }
}
