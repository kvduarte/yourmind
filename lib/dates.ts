export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/** Aceita "YYYY-MM-DD", "YYYY/MM/DD" ou "DD/MM/YYYY" e devolve "YYYY-MM-DD". */
export function normalizeDate(value?: string | null) {
  if (!value) return "";

  const parts = value.replace(/\//g, "-").split("-");

  if (parts.length !== 3) return "";

  if (parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

export function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);

  return new Date(y, m - 1, d);
}

export function formatShort(key: string) {
  if (!key) return "Sem data";

  return keyToDate(key).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatLong(key: string) {
  return keyToDate(key).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function buildMonthGrid(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, 1 - firstWeekday + i);

    return {
      date,
      key: toKey(date),
      inMonth: date.getMonth() === month,
    };
  });
}