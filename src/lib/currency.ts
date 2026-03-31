/**
 * Formats a number as Colombian Pesos (COP) without decimals.
 * @param amount - The numeric value to format.
 * @returns A string in currency format, e.g., "$19.412"
 */
export const formatCOP = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

/**
 * Compact formatting for large amounts in dashboards.
 * @param amount - The numeric value to format.
 * @returns A compact string, e.g., "$1.3M", "$87k"
 */
export const formatCOPCompact = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return formatCOP(amount)
}

/**
 * Parses a currency string back to a numeric value.
 * @param str - The currency string, e.g., "$19.412"
 * @returns The numeric value, e.g., 19412
 */
export const parseCOP = (str: string): number => {
  return parseInt(str.replace(/[^0-9-]/g, ''), 10) || 0
}
