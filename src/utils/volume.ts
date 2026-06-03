/**
 * Volume measurement constants and utility functions for Pekao Granizados.
 */

export const OZ_TO_ML = 29.57;
export const STANDARD_SERVING_OZ = 4;
export const STANDARD_SERVING_ML = STANDARD_SERVING_OZ * OZ_TO_ML; // ~118.28 ml
export const CUP_YIELD_BASE_ML = 300; // Standard 12oz cup base

/**
 * Converts milliliters (ml) to Liters (L).
 */
export function mlToLiters(ml: number): number {
  return ml / 1000;
}

/**
 * Converts Liters (L) to milliliters (ml).
 */
export function litersToMl(liters: number): number {
  return liters * 1000;
}

/**
 * Estimates the number of standard cups (12oz / 300ml) yielded by a volume in ml.
 */
export function mlToCups(ml: number): number {
  return Math.floor(ml / CUP_YIELD_BASE_ML);
}

/**
 * Calculates standard servings (4oz) from volume in ml.
 */
export function mlToServings(ml: number): number {
  return Math.floor(ml / STANDARD_SERVING_ML);
}
