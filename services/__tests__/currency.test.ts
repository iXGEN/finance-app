import { formatCLP } from '../currency';

describe('formatCLP', () => {
  it('formats with es-CL thousands separators', () => {
    expect(formatCLP(1234567)).toBe('$1.234.567');
  });

  it('formats small amounts without separator', () => {
    expect(formatCLP(950)).toBe('$950');
  });

  it('formats zero', () => {
    expect(formatCLP(0)).toBe('$0');
  });

  it('rounds fractional amounts to whole pesos', () => {
    expect(formatCLP(1234.6)).toBe('$1.235');
  });
});
