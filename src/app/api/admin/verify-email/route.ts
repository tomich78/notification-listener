import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const SECRET = "nlistener-verify-2026";

export async function POST(req: NextRequest) {
  const { email, secret } = await req.json();

  if (secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getAdminAuth().getUserByEmail(email);
    await getAdminAuth().updateUser(user.uid, { emailVerified: true });
    return NextResponse.json({ ok: true, uid: user.uid });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
