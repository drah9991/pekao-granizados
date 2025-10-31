import { parse } from 'csv-parse/browser/esm/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Convierte un array de objetos a una cadena CSV.
 * @param data Array de objetos a exportar.
 * @param columns Opcional: Array de nombres de columnas para incluir y su orden. Si no se proporciona, se usarán todas las claves del primer objeto.
 * @returns Cadena de texto en formato CSV.
 */
export function exportToCsv<T extends Record<string, any>>(data: T[], columns?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const header = columns || Object.keys(data[0]);

  const records = data.map(row => {
    const newRow: Record<string, any> = {};
    header.forEach(col => {
      // Manejar valores que son arrays o JSON, convirtiéndolos a string
      if (Array.isArray(row[col])) {
        newRow[col] = JSON.stringify(row[col]);
      } else if (typeof row[col] === 'object' && row[col] !== null) {
        newRow[col] = JSON.stringify(row[col]);
      } else {
        newRow[col] = row[col];
      }
    });
    return newRow;
  });

  return stringify(records, { header: true, columns: header });
}

/**
 * Parsea una cadena CSV a un array de objetos.
 * @param csvString Cadena de texto en formato CSV.
 * @returns Array de objetos.
 */
export function importFromCsv<T extends Record<string, any>>(csvString: string): T[] {
  if (!csvString.trim()) {
    return [];
  }

  const records = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    cast: (value, context) => {
      // Intentar parsear a número si es posible
      if (!isNaN(Number(value)) && value.trim() !== '') {
        return Number(value);
      }
      // Intentar parsear a booleano
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      // Intentar parsear JSON (para arrays o objetos guardados como string)
      try {
        const parsed = JSON.parse(value);
        return parsed;
      } catch (e) {
        // Si no es JSON válido, devolver el valor original
        return value;
      }
    }
  });
  return records as T[];
}

/**
 * Descarga un archivo con el contenido dado.
 * @param filename Nombre del archivo.
 * @param content Contenido del archivo.
 * @param mimeType Tipo MIME del archivo.
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}