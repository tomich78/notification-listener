import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { sendNewUserEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: true });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const { name, email } = await req.json();
    // Fire and forget — no bloqueamos el registro si falla el mail
    sendNewUserEmail(name ?? decoded.name ?? "Sin nombre", email ?? decoded.email ?? "").catch(console.error);
  } catch {
    // Silencioso
  }

  return NextResponse.json({ ok: true });
}
