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
  return notifs.filter((n) => !isHiddenFromPublic(n.text, filter));
}
