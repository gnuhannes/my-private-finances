/** Pure money-cents helpers for the transaction-split dialog. All amounts are
 * integer cents internally to avoid floating-point drift; only converted to/
 * from decimal strings at the API boundary. */

export function parseMoneyToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function centsToMoneyString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${String(frac).padStart(2, "0")}`;
}

/** Splits `totalCents` evenly across `count` rows; any remainder (from
 * integer division) is absorbed by the last row so the sum is always exact. */
export function splitEvenlyCents(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.trunc(totalCents / count);
  const amounts = new Array<number>(count).fill(base);
  const remainder = totalCents - base * count;
  amounts[amounts.length - 1] += remainder;
  return amounts;
}

/**
 * Converts a list of percentages (one per row) into integer cent amounts
 * that sum exactly to `totalCents`. Every row except the last is rounded
 * independently; the last row absorbs whatever rounding leftover remains so
 * the sum is always exact, regardless of what the percentages add up to.
 */
export function percentsToAmountCents(totalCents: number, percents: number[]): number[] {
  if (percents.length === 0) return [];
  const amounts = percents.map((p) => Math.round((totalCents * p) / 100));
  const sumOthers = amounts.slice(0, -1).reduce((a, b) => a + b, 0);
  amounts[amounts.length - 1] = totalCents - sumOthers;
  return amounts;
}

/** Display-only inverse of percentsToAmountCents: what percent of the total
 * does this amount represent? Returns 0 when totalCents is 0. */
export function amountCentsToPercent(amountCents: number, totalCents: number): number {
  if (totalCents === 0) return 0;
  return (amountCents / totalCents) * 100;
}

export function sumCents(amounts: number[]): number {
  return amounts.reduce((a, b) => a + b, 0);
}
