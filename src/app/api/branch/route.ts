import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBranchPassword } from "@/lib/branchAuth";
import type { BranchConfig } from "@/lib/types";

// PATCH /api/branch
// Body: { userId, notifId, branchId, password }
// Asigna un grupo (sucursal / vendedor / turno...) a un cobro.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { userId, notifId, branchId, password } = body ?? {};

  if (!userId || !notifId || !password) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const db = getAdminDb();

  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const branchConfig = userSnap.data()?.branchConfig as BranchConfig | undefined;
  if (!branchConfig?.enabled) {
    return NextResponse.json({ error: "Modo no activo" }, { status: 403 });
  }

  const auth = await verifyBranchPassword(userId, branchConfig, password);
  if (!auth.ok) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  // El grupo destino tiene que existir (null = desasignar)
  if (branchId && !branchConfig.branches.some((b) => b.id === branchId)) {
    return NextResponse.json({ error: "Grupo inexistente" }, { status: 400 });
  }

  const notifRef = db.collection("notifications").doc(notifId);
  const notifSnap = await notifRef.get();
  if (!notifSnap.exists || notifSnap.data()?.userId !== userId) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }

  // Con contraseña propia solo puede tocar lo suyo: marcarse un cobro a sí mismo
  // o soltar uno que ya tenía. No puede asignárselo a otro ni quitarle uno a otro.
  if (auth.scope === "group") {
    const current = notifSnap.data()?.branchId ?? null;
    const isClaimingForSelf = branchId === auth.branchId;
    const isReleasingOwn = !branchId && current === auth.branchId;

    if (!isClaimingForSelf && !isReleasingOwn) {
      return NextResponse.json(
        { error: "Solo podés marcar tus propios cobros" },
        { status: 403 }
      );
    }
    if (isClaimingForSelf && current && current !== auth.branchId) {
      return NextResponse.json(
        { error: "Ese cobro ya está asignado a otro" },
        { status: 403 }
      );
    }
  }

  await notifRef.update({ branchId: branchId ?? null });
  return NextResponse.json({ ok: true });
}
