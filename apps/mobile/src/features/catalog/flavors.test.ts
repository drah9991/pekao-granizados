import { describe, expect, it } from 'vitest';

import { flavorFor } from './flavors';

describe('flavorFor', () => {
  it('detects the main ingredient regardless of case and accents', () => {
    expect(flavorFor('FRESA SL G')?.label).toBe('Fresa');
    expect(flavorFor('Sandía SL')?.label).toBe('Sandía');
    expect(flavorFor('granizado de café')?.label).toBe('Café');
  });

  it('prefers the more specific phrase', () => {
    expect(flavorFor('MORA AZUL SL')?.label).toBe('Mora azul');
    expect(flavorFor('MARACUMANGO TAJINOSA')?.label).toBe('Maracumango');
    expect(flavorFor('BESO NEGRO')?.label).toBe('Beso negro');
  });

  it('matches whole words only', () => {
    // "ron" no debe coincidir dentro de otra palabra.
    expect(flavorFor('ROLLO TIRILLA')).toBeNull();
    expect(flavorFor('CREMA RON')?.label).toBe('Ron');
  });

  it('returns null when no flavor is recognized', () => {
    expect(flavorFor('FOUR LOKO')).toBeNull();
    expect(flavorFor('')).toBeNull();
  });

  it('returns a hex color for every recognized flavor', () => {
    expect(flavorFor('MANZANA SL')?.color).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
