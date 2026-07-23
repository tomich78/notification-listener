import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBranchPassword } from "@/lib/branchAuth";
import type { BranchConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/branch/auth
 * Body: { userId, password }
 *
 * Valida la contraseña de la vista pública EN EL SERVIDOR. Antes se comparaba
 * en el navegador, lo que dejaba la contraseña a la vista de cualquiera que
 * abriera las herramientas de desarrollo.
 *
 * Devuelve el alcance:
 *  - scope "all"   → contraseña compartida: puede marcar cobros de cualquier grupo
 *  - scope "group" → contraseña propia: solo puede marcar los de su grupo
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { userId, password } = body ?? {};

  if (!userId || typeof password !== "string") {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const userSnap = await getAdminDb().collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const branchConfig = userSnap.data()?.branchConfig as BranchConfig | undefined;
  if (!branchConfig?.enabled) {
    return NextResponse.json({ error: "No está activo" }, { status: 403 });
  }

  const result = await verifyBranchPassword(userId, branchConfig, password);
  if (!result.ok) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  return NextResponse.json(
    result.scope === "all"
      ? { ok: true, scope: "all" }
      : { ok: true, scope: "group", branchId: result.branchId }
  );
}
