import { getAdminDb } from "@/lib/firebase-admin";
import type { BranchConfig } from "@/lib/types";

/**
 * Secretos de la vista pública. Viven en la colección branchAuth/{uid}, que NO
 * es la que lee el navegador: users/{uid} es público (la vista pública necesita
 * los nombres y colores de los grupos), así que las contraseñas no pueden estar
 * ahí. Solo se leen desde el servidor con el Admin SDK.
 */
export interface BranchSecrets {
  /** Contraseña única para todos, cuando authMode = "shared". */
  shared?: string | null;
  /** branchId → contraseña, cuando authMode = "perGroup". */
  perGroup?: Record<string, string>;
}

export type BranchAuthResult =
  | { ok: false }
  /** Contraseña compartida: puede marcar cobros de cualquier grupo. */
  | { ok: true; scope: "all" }
  /** Contraseña propia de un grupo: solo puede marcar los suyos. */
  | { ok: true; scope: "group"; branchId: string };

export async function loadBranchSecrets(userId: string): Promise<BranchSecrets> {
  const snap = await getAdminDb().collection("branchAuth").doc(userId).get();
  return snap.exists ? (snap.data() as BranchSecrets) : {};
}

export async function saveBranchSecrets(userId: string, secrets: BranchSecrets): Promise<void> {
  await getAdminDb().collection("branchAuth").doc(userId).set(secrets);
}

/**
 * Valida una contraseña de la vista pública y devuelve hasta dónde llega.
 *
 * Compatibilidad: las cuentas viejas guardaban la contraseña dentro de
 * branchConfig.password. Si todavía no migraron, se acepta esa.
 */
export async function verifyBranchPassword(
  userId: string,
  branchConfig: BranchConfig,
  password: string
): Promise<BranchAuthResult> {
  if (!password) return { ok: false };

  const secrets = await loadBranchSecrets(userId);
  const authMode = branchConfig.authMode ?? "shared";

  if (authMode === "perGroup") {
    const perGroup = secrets.perGroup ?? {};
    // Solo grupos que sigan existiendo en la configuración
    const validIds = new Set(branchConfig.branches.map((b) => b.id));
    for (const [branchId, pass] of Object.entries(perGroup)) {
      if (pass && pass === password && validIds.has(branchId)) {
        return { ok: true, scope: "group", branchId };
      }
    }
    // La contraseña compartida sigue sirviendo como "llave maestra" del dueño
    const master = secrets.shared ?? branchConfig.password;
    if (master && master === password) return { ok: true, scope: "all" };
    return { ok: false };
  }

  const shared = secrets.shared ?? branchConfig.password;
  if (shared && shared === password) return { ok: true, scope: "all" };
  return { ok: false };
}
