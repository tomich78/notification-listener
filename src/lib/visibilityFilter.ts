import type { PublicFilter, Notification } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** ¿El texto coincide con alguno de los términos? (substring, sin mayúsculas) */
export function matchesTerms(text: string, terms?: string[] | null): boolean {
  if (!terms || terms.length === 0) return false;
  const t = (text ?? "").toLowerCase();
  return terms.some((term) => {
    const q = term.trim().toLowerCase();
    return q.length > 0 && t.includes(q);
  });
}

/** ¿Este cobro está en la lista negra (oculto para TODOS los empleados)? */
export function isBlacklisted(text: string, filter?: PublicFilter | null): boolean {
  if (!filter?.enabled) return false;
  return matchesTerms(text, filter.blacklist);
}

/** ¿Algún grupo está configurado como "solo su lista"? */
export function anyGroupRestricted(filter?: PublicFilter | null): boolean {
  if (!filter?.enabled) return false;
  return Object.values(filter.groups ?? {}).some((g) => g?.visibility === "restricted");
}

/**
 * Normaliza el objeto guardado (soporta el formato viejo con `mode`/`whitelists`)
 * al formato actual. Devuelve null si no hay filtro.
 */
export function normalizePublicFilter(raw: any): PublicFilter | null {
  if (!raw) return null;

  const groups: Record<string, { visibility: "full" | "restricted"; whitelist?: string[] }> =
    raw.groups ? { ...raw.groups } : {};

  // Migración del formato anterior: whitelists por grupo → groups "restricted".
  if (!raw.groups && raw.whitelists) {
    for (const [id, terms] of Object.entries(raw.whitelists)) {
      groups[id] = { visibility: "restricted", whitelist: (terms as string[]) ?? [] };
    }
  }

  return {
    enabled: !!raw.enabled,
    blacklist: raw.blacklist ?? [],
    sharedWhitelist: raw.sharedWhitelist ?? [],
    groups,
  };
}

/**
 * Cobros que puede ver un espectador de la vista pública, según su alcance.
 *
 * - filtro apagado → ve todo.
 * - siempre se saca lo de la lista negra (para todos).
 * - scope "all" (contraseña maestra / encargado) → ve todo lo no oculto.
 * - grupo "full" (ej: la caja) → ve todo lo no oculto.
 * - grupo "restricted" → ve solo lo que matchea su lista + la lista general.
 */
export function visibleForViewer(
  notifs: Notification[],
  filter: PublicFilter | null | undefined,
  scope: "all" | "group",
  activeBranchId: string | null
): Notification[] {
  if (!filter?.enabled) return notifs;

  const base = notifs.filter((n) => !isBlacklisted(n.text, filter));

  if (scope === "all") return base;

  const group = activeBranchId ? filter.groups?.[activeBranchId] : undefined;
  // Sin config o "full" → ve todo lo no oculto.
  if (!group || group.visibility === "full") return base;

  // "restricted": solo su lista + la lista general.
  const allowed = [...(group.whitelist ?? []), ...(filter.sharedWhitelist ?? [])];
  return base.filter((n) => matchesTerms(n.text, allowed));
}

/** Para el PDF del encargado / vista abierta: saca solo lo de la lista negra. */
export function visibleForPublic(
  notifs: Notification[],
  filter?: PublicFilter | null
): Notification[] {
  if (!filter?.enabled) return notifs;
  return notifs.filter((n) => !isBlacklisted(n.text, filter));
}

/**
 * ¿Este cobro no lo ve NINGÚN empleado? Se usa para el badge "oculto" del panel
 * del dueño.
 * - Si está en la lista negra → oculto para todos.
 * - Si hay algún grupo "full" (o no hay grupos restringidos) → lo ve ese grupo,
 *   así que NO está oculto (salvo lista negra).
 * - Si TODOS los grupos son restringidos → oculto si no matchea ninguna lista.
 */
export function isHiddenForEveryone(text: string, filter?: PublicFilter | null): boolean {
  if (!filter?.enabled) return false;
  if (isBlacklisted(text, filter)) return true;

  const groups = Object.values(filter.groups ?? {});
  const hasFullGroup = groups.length === 0 || groups.some((g) => g?.visibility === "full");
  if (hasFullGroup) return false;

  // Todos restringidos: visible solo si matchea alguna lista (propia o general).
  const anyWhitelist = groups.some((g) => matchesTerms(text, g.whitelist));
  const inShared = matchesTerms(text, filter.sharedWhitelist);
  return !anyWhitelist && !inShared;
}
