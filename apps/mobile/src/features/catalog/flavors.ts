export interface Flavor {
  label: string;
  color: string;
}

/**
 * Sabor principal según palabras del nombre. Muchas fotos son el mismo vaso con
 * el logo; la etiqueta de color ayuda a distinguir los productos de un vistazo.
 * El orden importa: las frases más específicas van antes ("mora azul" antes que "mora").
 */
const FLAVOR_KEYWORDS: readonly (Flavor & { keyword: string })[] = [
  { keyword: 'mora azul', label: 'Mora azul', color: '#3F51B5' },
  { keyword: 'margarita azul', label: 'Margarita', color: '#1E88E5' },
  { keyword: 'beso negro', label: 'Beso negro', color: '#7E57C2' },
  { keyword: 'maracumango', label: 'Maracumango', color: '#FFA000' },
  { keyword: 'maracuya', label: 'Maracuyá', color: '#FDD835' },
  { keyword: 'fresa', label: 'Fresa', color: '#E53935' },
  { keyword: 'sandia', label: 'Sandía', color: '#EC407A' },
  { keyword: 'manzana', label: 'Manzana', color: '#43A047' },
  { keyword: 'mango', label: 'Mango', color: '#FB8C00' },
  { keyword: 'mora', label: 'Mora', color: '#8E24AA' },
  { keyword: 'uva', label: 'Uva', color: '#9C27B0' },
  { keyword: 'lulo', label: 'Lulo', color: '#9E9D24' },
  { keyword: 'coco', label: 'Coco', color: '#BCAAA4' },
  { keyword: 'chicle', label: 'Chicle', color: '#F06292' },
  { keyword: 'tamarindo', label: 'Tamarindo', color: '#8D6E63' },
  { keyword: 'cafe', label: 'Café', color: '#795548' },
  { keyword: 'tequila', label: 'Tequila', color: '#C0CA33' },
  { keyword: 'whisky', label: 'Whisky', color: '#FFB300' },
  { keyword: 'ron', label: 'Ron', color: '#D4A017' },
  { keyword: 'tajin', label: 'Tajín', color: '#E64A19' },
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Primer sabor reconocido en el nombre, o null si no hay ninguno. */
export function flavorFor(productName: string): Flavor | null {
  const name = ` ${normalize(productName).replace(/[^a-z0-9]+/g, ' ')} `;
  const match = FLAVOR_KEYWORDS.find(({ keyword }) => name.includes(` ${keyword} `));
  return match ? { label: match.label, color: match.color } : null;
}
