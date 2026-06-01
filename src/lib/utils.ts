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
