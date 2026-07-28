import type { PublicFilter, Notification } from "@/lib/types";

/**
 * Decide si un cobro debe ocultarse de la vista pública (lo que ven los
 * empleados). Solo aplica al modo "blacklist": el cobro se oculta si su texto
 * contiene alguno de los términos de la lista negra.
 *
 * El match es por substring, sin distinguir mayúsculas/acentos-no. Es el mismo
 * enfoque que el filtro anti-spam: se apoya en que la notificación del banco
 * incluya el nombre del emisor de forma reconocible.
 */
export function isHiddenFromPublic(text: string, filter?: PublicFilter | null): boolean {
  if (!filter?.enabled) return false;
  if (filter.mode !== "blacklist") return false;
  const terms = filter.blacklist ?? [];
  if (terms.length === 0) return false;

  const t = (text ?? "").toLowerCase();
  return terms.some((term) => {
    const q = term.trim().toLowerCase();
    return q.length > 0 && t.includes(q);
  });
}

/** Filtra una lista de cobros dejando solo los visibles para los empleados. */
export function visibleForPublic(
  notifs: Notification[],
  filter?: PublicFilter | null
): Notification[] {
  if (!filter?.enabled) return notifs;
  if (filter.mode === "blacklist") {
    return notifs.filter((n) => !isHiddenFromPublic(n.text, filter));
  }
  return notifs;
}

/**
 * ¿Este cobro no lo ve NINGÚN empleado? Se usa para el badge "oculto" del panel
 * del dueño.
 * - blacklist: oculto si matchea la lista negra.
 * - whitelist: oculto si no está en la lista de ningún grupo.
 */
export function isHiddenForEveryone(text: string, filter?: PublicFilter | null): boolean {
  if (!filter?.enabled) return false;
  if (filter.mode === "blacklist") return isHiddenFromPublic(text, filter);
  // whitelist: visible solo si algún grupo lo tiene en su lista
  const lists = Object.values(filter.whitelists ?? {});
  return !lists.some((terms) => matchesTerms(text, terms));
}

/** ¿El texto coincide con alguno de los términos de la lista? (substring, sin mayúsculas) */
export function matchesTerms(text: string, terms?: string[] | null): boolean {
  if (!terms || terms.length === 0) return false;
  const t = (text ?? "").toLowerCase();
  return terms.some((term) => {
    const q = term.trim().toLowerCase();
    return q.length > 0 && t.includes(q);
  });
}

/**
 * Cobros que puede ver un espectador de la vista pública, según su alcance.
 *
 * - modo apagado → ve todo.
 * - blacklist → se ocultan los que matchean la lista negra (para todos).
 * - whitelist + scope "group" → ve SOLO los que matchean la lista de su grupo.
 * - whitelist + scope "all" (contraseña maestra / encargado) → ve todo.
 */
export function visibleForViewer(
  notifs: Notification[],
  filter: PublicFilter | null | undefined,
  scope: "all" | "group",
  activeBranchId: string | null
): Notification[] {
  if (!filter?.enabled) return notifs;

  if (filter.mode === "blacklist") {
    return notifs.filter((n) => !isHiddenFromPublic(n.text, filter));
  }

  // whitelist
  if (scope === "all") return notifs; // encargado con contraseña maestra
  const terms = activeBranchId ? filter.whitelists?.[activeBranchId] : undefined;
  return notifs.filter((n) => matchesTerms(n.text, terms));
}
