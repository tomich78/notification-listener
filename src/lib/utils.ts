import { Timestamp } from "firebase/firestore";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

export function formatDate(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateShort(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Determina si una notificación corresponde a un cobro/transferencia real.
 * Filtra promos, recordatorios, puntos y cualquier notificación que no sea un pago entrante.
 * Se usa en el servidor antes de guardar en Firestore.
 */
export function isPaymentNotification(text: string): boolean {
  const t = text.toLowerCase();

  // Palabras que CONFIRMAN que es un cobro real
  const paymentKeywords = [
    "recibiste",
    "recibió",
    "te enviaron",
    "te transfirieron",
    "transferencia recibida",
    "transferencia acreditada",
    "acreditamos",
    "acreditado",
    "se acreditó",
    "ingresó",
    "ingreso de",
    "pago recibido",
    "te pagaron",
    "cobro recibido",
    "cobraste",
    "llegó tu pago",
    "llegó un pago",
    "depositaron",
    "depósito recibido",
    "nueva venta",
    "venta aprobada",
    "venta exitosa",
    "te hicieron una transferencia",
    "dinero recibido",
    "saldo recibido",
  ];

  // Palabras que DESCARTAN la notificación (promos, recordatorios, etc.)
  const spamKeywords = [
    "descuento",
    "promoción",
    "promo",
    "oferta",
    "beneficio",
    "puntos",
    "cuotas sin interés",
    "préstamo",
    "vence",
    "vencimiento",
    "recordatorio",
    "te prestamos",
    "crédito disponible",
    "cupo disponible",
    "te regalamos",
    "ganaste un",
    "felicitaciones",
    "nivel",
    "cashback",
    "reintegro",
    "devolución de",
    "compra tu point"
  ];

  // Si contiene alguna palabra de spam → descartar
  if (spamKeywords.some((kw) => t.includes(kw))) return false;

  // Si contiene alguna palabra de cobro → es un pago
  if (paymentKeywords.some((kw) => t.includes(kw))) return true;

  // Sin palabras clave de ningún tipo:
  // Solo guardar si tiene un monto ($) para no perder cobros con frases poco comunes
  return /\$\s*\d/.test(text);
}

// Intenta extraer un monto en pesos argentinos del texto de una notificación.
// Soporta formatos con y sin $:
//   $1.500,00 | $1.500 | $ 1500 | 1.500,00 pesos | 1500 pesos | $1,500.00
export function extractAmount(text: string): number | null {
  // Patrones ordenados de más específico a más genérico
  const patterns: { re: RegExp; parse: (m: RegExpMatchArray) => number }[] = [
    // $1.500,85 o 1.500,85 (AR: punto=miles, coma=decimal)
    {
      re: /\$?\s*([\d]{1,3}(?:\.[\d]{3})+),(\d{1,2})/,
      parse: (m) => parseFloat(m[1].replace(/\./g, "") + "." + m[2]),
    },
    // $1.500 o 1.500 (AR: punto=miles, sin decimal)
    {
      re: /\$?\s*([\d]{1,3}(?:\.[\d]{3})+)/,
      parse: (m) => parseFloat(m[1].replace(/\./g, "")),
    },
    // $1,500.85 (US: coma=miles, punto=decimal)
    {
      re: /\$?\s*([\d]{1,3}(?:,[\d]{3})+)\.(\d{1,2})/,
      parse: (m) => parseFloat(m[1].replace(/,/g, "") + "." + m[2]),
    },
    // $1500,85 (sin separador de miles, coma=decimal)
    {
      re: /\$?\s*(\d+),(\d{2})\b/,
      parse: (m) => parseFloat(m[1] + "." + m[2]),
    },
    // $1500.85 (sin separador de miles, punto=decimal)
    {
      re: /\$?\s*(\d+)\.(\d{2})\b/,
      parse: (m) => parseFloat(m[1] + "." + m[2]),
    },
    // $1500 (número entero)
    {
      re: /\$\s*(\d+)/,
      parse: (m) => parseFloat(m[1]),
    },
  ];

  for (const { re, parse } of patterns) {
    const match = text.match(re);
    if (match) {
      const value = parse(match);
      if (!isNaN(value) && value > 0) return value;
    }
  }
  return null;
}

export function isToday(timestamp: Timestamp | Date): boolean {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
