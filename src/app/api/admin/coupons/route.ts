import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "tdsdeveloper00@gmail.com";

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.email !== ADMIN_EMAIL) return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET /api/admin/coupons — listar todos los cupones
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.collection("coupons").orderBy("createdAt", "desc").get();
  const coupons = snap.docs.map((d) => ({
    code: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json(coupons);
}

// POST /api/admin/coupons — crear un cupón nuevo
// Body: { code: string, durationDays: number, maxUses: number | null }
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, durationDays, maxUses } = await req.json();
  const normalizedCode = String(code ?? "").trim().toUpperCase();

  if (!normalizedCode || !/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) {
    return NextResponse.json({ error: "Código inválido (3-30 caracteres, letras/números/-/_ )" }, { status: 400 });
  }
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return NextResponse.json({ error: "Duración inválida" }, { status: 400 });
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    return NextResponse.json({ error: "Máximo de usos inválido" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("coupons").doc(normalizedCode);
  const existing = await ref.get();
  if (existing.exists) {
    return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
  }

  await ref.set({
    durationDays,
    maxUses: maxUses ?? null,
    usedCount: 0,
    active: true,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, code: normalizedCode });
}

// PATCH /api/admin/coupons — activar/desactivar un cupón
// Body: { code: string, active: boolean }
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, active } = await req.json();
  if (!code || typeof active !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("coupons").doc(code).update({ active });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/coupons?code=XXX — eliminar un cupón
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("coupons").doc(code).delete();
  return NextResponse.json({ ok: true });
}
