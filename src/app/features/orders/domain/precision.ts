export const MONEY_MIN_DECIMALS = 2;
export const MONEY_MAX_DECIMALS = 8;

export interface RoundedMoney {
  readonly value: number;
  readonly decimals: number;
}

export function moneyDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1 || abs === 0) return MONEY_MIN_DECIMALS;
  const significant = Math.ceil(-Math.log10(abs)) + 1;
  return Math.min(MONEY_MAX_DECIMALS, Math.max(MONEY_MIN_DECIMALS, significant));
}

export function roundMoney(value: number): RoundedMoney {
  const decimals = moneyDecimals(value);
  return { value: Number(value.toFixed(decimals)) + 0, decimals };
}
