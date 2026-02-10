export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMoneyString(value: string, currency: string): string {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    // Fallback: raw string, but still show currency context
    return `${value} ${currency}`;
  }

  return formatCurrency(n, currency);
}
