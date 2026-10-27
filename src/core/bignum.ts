import Decimal from 'break_infinity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;

export const D = (v: DecimalSource): Decimal => new Decimal(v);

export const ZERO = D(0);
export const ONE = D(1);

export function dmax(a: Decimal, b: Decimal): Decimal {
  return a.gte(b) ? a : b;
}

export function dmin(a: Decimal, b: Decimal): Decimal {
  return a.lte(b) ? a : b;
}
