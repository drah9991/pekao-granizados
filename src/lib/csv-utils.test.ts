import { describe, it, expect } from 'bun:test';
import { importFromCsv } from './csv-utils';

describe('CSV Utilities - importFromCsv', () => {
  it('should fallback to string when JSON.parse fails (testing castValue catch block)', () => {
    // Construct a CSV string with a header and one row.
    // We include various types to test the castValue logic:
    // 1. A valid JSON string (array)
    // 2. An invalid JSON string that will throw an error in JSON.parse
    // 3. A regular string
    const csvData = `validJson,invalidJson,regularString\n"[1, 2, 3]","{ bad json }",hello world`;

    const result = importFromCsv(csvData);

    expect(result).toHaveLength(1);
    expect(result[0].validJson).toEqual([1, 2, 3]);

    // This is the core expectation for the missing error path:
    // JSON.parse("{ bad json }") will throw, and the catch block should return "{ bad json }"
    expect(result[0].invalidJson).toBe('{ bad json }');

    expect(result[0].regularString).toBe('hello world');
  });

  it('should parse numbers and booleans correctly', () => {
    const csvData = `numberCol,trueCol,falseCol,emptyCol\n"42","TRUE","false",`;
    const result = importFromCsv(csvData);

    expect(result).toHaveLength(1);
    expect(result[0].numberCol).toBe(42);
    expect(result[0].trueCol).toBe(true);
    expect(result[0].falseCol).toBe(false);
    expect(result[0].emptyCol).toBe('');
  });
});
