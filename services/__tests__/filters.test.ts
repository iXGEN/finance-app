import { applyFilters, hasActiveFilters, EMPTY_FILTERS } from '../filters';
import { Transaction } from '../../types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'id',
    user_id: 'u',
    date: '2026-07-01',
    category: 'Comida',
    description: null,
    amount: 10000,
    payment_method: null,
    is_fixed: false,
    notes: null,
    week: 27,
    registered: false,
    month: '2026-07',
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

const txs: Transaction[] = [
  tx({ id: '1', category: 'Comida', description: 'Almuerzo sushi', amount: 12000 }),
  tx({ id: '2', category: 'Transporte', description: 'Metro', payment_method: 'Débito' }),
  tx({ id: '3', category: 'Hogar', description: 'Arriendo', is_fixed: true, amount: 450000 }),
  tx({ id: '4', category: 'Comida', description: null, notes: 'feria', amount: 25000 }),
];

describe('applyFilters', () => {
  it('returns everything with empty filters', () => {
    expect(applyFilters(txs, EMPTY_FILTERS)).toHaveLength(4);
  });

  it('filters by category', () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, category: 'Comida' });
    expect(out.map((t) => t.id)).toEqual(['1', '4']);
  });

  it('filters fixed-only', () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, onlyFixed: true });
    expect(out.map((t) => t.id)).toEqual(['3']);
  });

  it('searches text across description, case-insensitively', () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, text: 'SUSHI' });
    expect(out.map((t) => t.id)).toEqual(['1']);
  });

  it('searches text in payment method and notes', () => {
    expect(applyFilters(txs, { ...EMPTY_FILTERS, text: 'débito' }).map((t) => t.id)).toEqual(['2']);
    expect(applyFilters(txs, { ...EMPTY_FILTERS, text: 'feria' }).map((t) => t.id)).toEqual(['4']);
  });

  it('searches text in the amount', () => {
    expect(applyFilters(txs, { ...EMPTY_FILTERS, text: '450000' }).map((t) => t.id)).toEqual(['3']);
  });

  it('combines category and text filters', () => {
    const out = applyFilters(txs, { ...EMPTY_FILTERS, category: 'Comida', text: 'feria' });
    expect(out.map((t) => t.id)).toEqual(['4']);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(applyFilters(txs, { ...EMPTY_FILTERS, text: '  metro  ' }).map((t) => t.id)).toEqual(['2']);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty state', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('is false for whitespace-only text', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, text: '   ' })).toBe(false);
  });

  it('is true when any filter is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, text: 'a' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, category: 'Comida' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, onlyFixed: true })).toBe(true);
  });
});
