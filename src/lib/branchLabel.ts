/**
 * La función de "grupos" nació como modo sucursales, pero se usa también para
 * vendedores, turnos o cajas. El dueño elige la palabra y toda la interfaz la
 * respeta. Estos helpers centralizan cómo se muestra.
 */

export const DEFAULT_BRANCH_LABEL = "Sucursal";

/** Opciones sugeridas en la configuración. El dueño puede escribir otra. */
export const BRANCH_LABEL_PRESETS = ["Sucursal", "Vendedor", "Empleado", "Turno", "Caja"];

/** Etiqueta en singular, con fallback si todavía no eligió ninguna. */
export function branchLabel(label?: string | null): string {
  const l = (label ?? "").trim();
  return l.length > 0 ? l : DEFAULT_BRANCH_LABEL;
}

/**
 * Plural en español: las palabras terminadas en vocal suman "s"
 * (Turno → Turnos), las terminadas en consonante suman "es"
 * (Sucursal → Sucursales, Vendedor → Vendedores).
 */
export function branchLabelPlural(label?: string | null): string {
  const l = branchLabel(label);
  const last = l.slice(-1).toLowerCase();
  return "aeiouáéíóú".includes(last) ? `${l}s` : `${l}es`;
}

/** Igual que branchLabel pero en minúscula, para usar dentro de una oración. */
export function branchLabelLower(label?: string | null): string {
  return branchLabel(label).toLowerCase();
}

/** Igual que branchLabelPlural pero en minúscula. */
export function branchLabelPluralLower(label?: string | null): string {
  return branchLabelPlural(label).toLowerCase();
}
