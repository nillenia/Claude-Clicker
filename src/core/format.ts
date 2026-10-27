import { Decimal, type DecimalSource } from './bignum';

// Kurze deutsche Zahlwörter (lange Skala: Mrd. = 1e9, Bio. = 1e12, Brd. = 1e15 …)
const SUFFIXES = [
  '', 'Tsd.', 'Mio.', 'Mrd.', 'Bio.', 'Brd.', 'Trio.', 'Trd.', 'Quadr.', 'Quadrd.',
  'Quint.', 'Quintd.', 'Sext.', 'Sextd.', 'Sept.', 'Septd.', 'Okt.', 'Oktd.', 'Non.', 'Nond.', 'Dez.', 'Dezd.',
];

export type Notation = 'short' | 'scientific';

let notation: Notation = 'short';

export function setNotation(n: Notation): void {
  notation = n;
}

export function getNotation(): Notation {
  return notation;
}

const intFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const oneFmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const threeFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const twoFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formatiert eine (große) Zahl für die Anzeige. `fractional` erlaubt Nachkommastellen unter 1000. */
export function fmt(value: DecimalSource, fractional = false): string {
  const v = value instanceof Decimal ? value : new Decimal(value);
  if (v.lt(0)) return '-' + fmt(v.neg(), fractional);
  if (v.lt(1000)) {
    const n = v.toNumber();
    return fractional ? oneFmt.format(n) : intFmt.format(Math.floor(n));
  }
  const exp = Math.floor(v.log10() + 1e-9);
  if (notation === 'scientific') {
    return `${twoFmt.format(v.mantissa)}e${v.exponent}`;
  }
  if (v.lt(1e6)) return intFmt.format(Math.floor(v.toNumber()));
  const group = Math.floor(exp / 3);
  if (group < SUFFIXES.length) {
    const scaled = v.div(Decimal.pow(10, group * 3)).toNumber();
    return `${threeFmt.format(Math.floor(scaled * 1000) / 1000)} ${SUFFIXES[group]}`;
  }
  return `${twoFmt.format(v.mantissa)}e${v.exponent}`;
}

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} T ${h} Std.`;
  if (h > 0) return `${h} Std. ${m} Min.`;
  if (m > 0) return `${m} Min. ${sec} Sek.`;
  return `${sec} Sek.`;
}

export function fmtPercent(fraction: number): string {
  return `${oneFmt.format(fraction * 100)} %`;
}
