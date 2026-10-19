import { describe, expect, it } from 'vitest';

import { availableTypes, filterProducts, normalizeText, typeBadgeFor, typeInfoFor } from './product-filters';
import type { Product } from './types';

const product = (overrides: Partial<Product>): Product => ({
  id: overrides.name ?? 'p',
  name: 'Producto',
  description: null,
  price: 1000,
  imageUrl: null,
  category: null,
  type: 'granizado',
  ...overrides,
});

const catalog = [
  product({ name: 'Granizado de Café', type: 'granizado' }),
  product({ name: 'FRESA SL G', type: 'sachet', description: 'Fresa natural' }),
  product({ name: 'Rollo tirilla', type: 'sweet' }),
];

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('  Café MARACUYÁ ')).toBe('cafe maracuya');
  });
});

describe('filterProducts', () => {
  it('matches without accents or case', () => {
    expect(filterProducts(catalog, { query: 'CAFE', type: 'all' }).map((p) => p.name)).toEqual(['Granizado de Café']);
  });

  it('requires every word to match, searching name and description', () => {
    expect(filterProducts(catalog, { query: 'fresa natural', type: 'all' })).toHaveLength(1);
    expect(filterProducts(catalog, { query: 'fresa cafe', type: 'all' })).toHaveLength(0);
  });

  it('filters by type and combines with the query', () => {
    expect(filterProducts(catalog, { query: '', type: 'sweet' }).map((p) => p.name)).toEqual(['Rollo tirilla']);
    expect(filterProducts(catalog, { query: 'fresa', type: 'granizado' })).toEqual([]);
  });

  it('returns everything when there is no query and type is all', () => {
    expect(filterProducts(catalog, { query: '   ', type: 'all' })).toHaveLength(3);
  });
});

describe('availableTypes', () => {
  it('counts products per type in the configured order', () => {
    const configured = [
      { code: 'sweet', label: 'Dulces', emoji: '🍬' },
      { code: 'granizado', label: 'Granizados', emoji: '🍧' },
    ];

    expect(availableTypes(catalog, configured).map((t) => `${t.code}:${t.count}`)).toEqual([
      'sweet:1',
      'granizado:1',
      'sachet:1',
    ]);
  });
});

describe('typeBadgeFor', () => {
  it('uses the singular label with the configured emoji', () => {
    const configured = [{ code: 'granizado', label: 'Granizados', emoji: '🧊' }];

    expect(typeBadgeFor('granizado', configured)).toEqual({ emoji: '🧊', label: 'Granizado' });
    expect(typeBadgeFor('sweet', [])).toEqual({ emoji: '🍬', label: 'Dulce' });
  });

  it('falls back to the configured label for unknown types', () => {
    expect(typeBadgeFor('promo', [{ code: 'promo', label: 'Promo del día', emoji: '⭐' }])).toEqual({
      emoji: '⭐',
      label: 'Promo del día',
    });
  });
});

describe('typeInfoFor', () => {
  it('falls back to default labels when the type is not configured', () => {
    expect(typeInfoFor('sachet', [])).toEqual({ code: 'sachet', label: 'Sachets', emoji: '🥃' });
    expect(typeInfoFor('desconocido', []).label).toBe('desconocido');
  });
});
