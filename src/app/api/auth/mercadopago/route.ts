import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/auth/mercadopago
// Inicia el flujo OAuth de MercadoPago.
// El usuario debe estar autenticado con Firebase (manda el idToken como query param).
export async function GET(req: NextRequest) {
  const idToken = req.nextUrl.searchParams.get("token");
  if (!idToken) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL!;
  const clientId  = process.env.MERCADOPAGO_CLIENT_ID!;
  const redirectUri = `${appUrl}/api/auth/mercadopago/callback`;

  const mpUrl = new URL("https://auth.mercadopago.com.ar/authorization");
  mpUrl.searchParams.set("client_id",    clientId);
  mpUrl.searchParams.set("response_type", "code");
  mpUrl.searchParams.set("platform_id",  "mp");
  mpUrl.searchParams.set("redirect_uri", redirectUri);
  mpUrl.searchParams.set("state",        uid); // usamos el UID para identificar al usuario en el callback

  return NextResponse.redirect(mpUrl.toString());
}
