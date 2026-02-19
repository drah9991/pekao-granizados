// Browser-native CSV parser (no Node.js dependencies)
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

  const lines = parseCsvLines(csvString);
  if (lines.length < 2) return [];

  const headers = lines[0];
  const records: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const row: Record<string, any> = {};
    headers.forEach((header, idx) => {
      const value = idx < values.length ? values[idx] : '';
      row[header] = castValue(value);
    });
    records.push(row as T);
  }

  return records;
}

function castValue(value: string): any {
  if (value === '') return value;
  if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  try { return JSON.parse(value); } catch { return value; }
}

/**
 * Parsea líneas CSV respetando comillas.
 */
function parseCsvLines(csv: string): string[][] {
  const result: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && csv[i + 1] === '\n')) {
        row.push(current);
        current = '';
        result.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some(v => v !== '')) result.push(row);
  return result;
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