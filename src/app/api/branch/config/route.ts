import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { loadBranchSecrets, saveBranchSecrets, type BranchSecrets } from "@/lib/branchAuth";
import type { BranchConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BRANCHES = 20;

async function requireUid(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

/**
 * GET /api/branch/config
 * Devuelve la configuración junto con las contraseñas. Solo para el dueño:
 * el navegador de los empleados nunca las recibe.
 */
export async function GET(req: NextRequest) {
  const uid = await requireUid(req);
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db.collection("users").doc(uid).get();
  const branchConfig = (snap.data()?.branchConfig ?? null) as BranchConfig | null;
  const secrets = await loadBranchSecrets(uid);

  // Cuentas viejas: la contraseña estaba dentro de branchConfig
  const shared = secrets.shared ?? branchConfig?.password ?? "";

  return NextResponse.json({
    branchConfig,
    secrets: { shared, perGroup: secrets.perGroup ?? {} },
  });
}

/**
 * POST /api/branch/config
 * Body: { branchConfig, secrets: { shared, perGroup } }
 *
 * Guarda la configuración pública en users/{uid} y las contraseñas aparte, en
 * branchAuth/{uid}. Nunca deja contraseñas en el documento que lee la vista
 * pública.
 */
export async function POST(req: NextRequest) {
  const uid = await requireUid(req);
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const incoming = body?.branchConfig as BranchConfig | undefined;
  const incomingSecrets = (body?.secrets ?? {}) as BranchSecrets;

  if (!incoming || !Array.isArray(incoming.branches)) {
    return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
  }
  if (incoming.branches.length > MAX_BRANCHES) {
    return NextResponse.json(
      { error: `Máximo ${MAX_BRANCHES} grupos` },
      { status: 400 }
    );
  }

  const authMode = incoming.authMode === "perGroup" ? "perGroup" : "shared";
  const branches = incoming.branches.map((b) => ({
    id: String(b.id),
    name: String(b.name ?? "").slice(0, 40),
    color: String(b.color ?? "#2563EB"),
  }));
  const validIds = new Set(branches.map((b) => b.id));

  if (incoming.enabled) {
    if (branches.length === 0 || branches.some((b) => !b.name.trim())) {
      return NextResponse.json(
        { error: "Todos los grupos necesitan un nombre" },
        { status: 400 }
      );
    }
    if (authMode === "shared" && !String(incomingSecrets.shared ?? "").trim()) {
      return NextResponse.json({ error: "Falta la contraseña" }, { status: 400 });
    }
    if (authMode === "perGroup") {
      const missing = branches.filter(
        (b) => !String(incomingSecrets.perGroup?.[b.id] ?? "").trim()
      );
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Falta la contraseña de: ${missing.map((b) => b.name).join(", ")}` },
          { status: 400 }
        );
      }
    }
  }

  // Descartar contraseñas de grupos que ya no existen
  const perGroup: Record<string, string> = {};
  for (const [id, pass] of Object.entries(incomingSecrets.perGroup ?? {})) {
    if (validIds.has(id) && String(pass ?? "").trim()) perGroup[id] = String(pass).trim();
  }

  const publicConfig: BranchConfig = {
    enabled: Boolean(incoming.enabled),
    branches,
    label: String(incoming.label ?? "").trim() || "Sucursal",
    authMode,
  };

  const db = getAdminDb();
  await db.collection("users").doc(uid).update({ branchConfig: publicConfig });
  await saveBranchSecrets(uid, {
    shared: String(incomingSecrets.shared ?? "").trim() || null,
    perGroup,
  });

  return NextResponse.json({ ok: true, branchConfig: publicConfig });
}
