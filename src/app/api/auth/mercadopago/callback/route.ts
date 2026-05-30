import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// GET /api/auth/mercadopago/callback
// MercadoPago redirige acá después de que el usuario autoriza.
export async function GET(req: NextRequest) {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!;
  const code    = req.nextUrl.searchParams.get("code");
  const uid     = req.nextUrl.searchParams.get("state");

  if (!code || !uid) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error`);
  }

  try {
    // 1. Intercambiar el código por un access_token
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

    console.log("MP OAuth success for user_id:", user_id);

    // 2. Registrar el webhook en la cuenta del merchant usando SU access_token.
    //    Esto permite recibir notificaciones de TODOS sus pagos entrantes,
    //    no solo los que pasen por nuestro checkout.
    const webhookUrl = `${appUrl}/api/webhooks/mercadopago`;
    const webhookRes = await fetch(
      `https://api.mercadopago.com/v1/users/${user_id}/webhooks`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          url:    webhookUrl,
          events: ["payment"],
        }),
      }
    );

    if (!webhookRes.ok) {
      const errText = await webhookRes.text();
      console.warn("MP webhook registration warning:", errText);
      // No bloqueamos el flujo si falla el registro del webhook
    } else {
      console.log("MP webhook registered for user_id:", user_id);
    }

    const db = getAdminDb();

    // 3. Guardar la conexión
    await db.collection("mp_connections").doc(String(user_id)).set({
      userId:       uid,
      accessToken:  access_token,
      refreshToken: refresh_token,
      mpUserId:     String(user_id),
      connectedAt:  FieldValue.serverTimestamp(),
    });

    await db.collection("users").doc(uid).update({
      "mercadopago.connected":   true,
      "mercadopago.mpUserId":    String(user_id),
      "mercadopago.connectedAt": FieldValue.serverTimestamp(),
    });

    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=connected`);
  } catch (err) {
    console.error("MP callback error:", err);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error`);
  }
}
