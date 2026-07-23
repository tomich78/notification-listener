/**
 * Precios del plan Pro.
 *
 * El plan anual se cobra de una sola vez por los 12 meses, con un descuento
 * sobre el precio mensual de lista. Fuente única de verdad: la usan la landing,
 * la página de upgrade y la creación de la suscripción en MercadoPago.
 */

/** 0.75 = 25% de descuento sobre el precio mensual. */
export const ANNUAL_DISCOUNT_FACTOR = 0.75;

/** Porcentaje de ahorro, para mostrar en la UI (ej: "-25%"). */
export const ANNUAL_DISCOUNT_PCT = Math.round((1 - ANNUAL_DISCOUNT_FACTOR) * 100);

/** Equivalente mensual al pagar por año. */
export function annualMonthlyPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * ANNUAL_DISCOUNT_FACTOR);
}

/** Total que se cobra de una vez al contratar el plan anual. */
export function annualTotalPrice(monthlyPrice: number): number {
  return annualMonthlyPrice(monthlyPrice) * 12;
}

/** Cuánto ahorra en un año respecto de pagar mes a mes. */
export function annualSavings(monthlyPrice: number): number {
  return monthlyPrice * 12 - annualTotalPrice(monthlyPrice);
}

/** Período de un pago manual (pago único, sin débito automático). */
export type ManualPeriod = "monthly" | "annual";

/** Precio total a cobrar en un pago único, según el período. */
export function manualPrice(monthlyPrice: number, period: ManualPeriod): number {
  return period === "annual" ? annualTotalPrice(monthlyPrice) : monthlyPrice;
}

/** Meses de acceso que otorga un pago manual. */
export function manualMonths(period: ManualPeriod): number {
  return period === "annual" ? 12 : 1;
}

/**
 * Suma meses a una fecha. Si el usuario ya tiene plan vigente, el tiempo nuevo
 * se acumula sobre el vencimiento actual en vez de pisarlo.
 */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}
