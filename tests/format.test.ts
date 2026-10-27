import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import { fmt, setNotation } from '../src/core/format';

describe('fmt', () => {
  it('formatiert kleine Zahlen', () => {
    setNotation('short');
    expect(fmt(0)).toBe('0');
    expect(fmt(999.9)).toBe('999');
    expect(fmt(0.1, true)).toBe('0,1');
    expect(fmt(12_345)).toBe('12.345');
  });

  it('nutzt deutsche Zahlwörter', () => {
    setNotation('short');
    expect(fmt(1_234_567)).toBe('1,234 Mio.');
    expect(fmt(2e9)).toBe('2,000 Mrd.');
    expect(fmt(D('1.5e15'))).toBe('1,500 Brd.');
  });

  it('wechselt bei riesigen Zahlen auf wissenschaftlich', () => {
    setNotation('short');
    expect(fmt(D('1.23e100'))).toBe('1,23e100');
  });

  it('unterstützt wissenschaftliche Notation', () => {
    setNotation('scientific');
    expect(fmt(1_234_567)).toBe('1,23e6');
    setNotation('short');
  });
});
