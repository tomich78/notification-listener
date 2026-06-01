import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// PATCH /api/branch
// Body: { userId, notifId, branchId, password }
// Asigna una sucursal a una notificación verificando la contraseña del usuario
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { userId, notifId, branchId, password } = body ?? {};

  if (!userId || !notifId || !password) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const db = getAdminDb();

  // Verificar contraseña
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const branchConfig = userSnap.data()?.branchConfig;
  if (!branchConfig?.enabled) {
    return NextResponse.json({ error: "Modo sucursales no activo" }, { status: 403 });
  }
  if (branchConfig.password !== password) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  // Verificar que la notificación pertenece al usuario
  const notifRef = db.collection("notifications").doc(notifId);
  const notifSnap = await notifRef.get();
  if (!notifSnap.exists || notifSnap.data()?.userId !== userId) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }

  // Asignar (branchId null = desasignar)
  await notifRef.update({ branchId: branchId ?? null });
  return NextResponse.json({ ok: true });
}
