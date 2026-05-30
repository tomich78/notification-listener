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
// Soporta formatos: $1.500,00 / $ 1500 / $1500.50
export function extractAmount(text: string): number | null {
  const patterns = [
    /\$\s*([\d.]+),(\d{2})/,   // $1.500,00
    /\$\s*([\d,]+)\.(\d{2})/,  // $1,500.00
    /\$\s*([\d.]+)/,            // $1.500
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[0]
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const value = parseFloat(cleaned);
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
