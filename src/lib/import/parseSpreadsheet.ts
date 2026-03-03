import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
  sheetName: string;
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  if (rawData.length === 0) {
    return { headers: [], rows: [], sheetName };
  }

  const headers = Object.keys(rawData[0]);
  const rows = rawData.map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) {
      out[h] = String(row[h] ?? '');
    }
    return out;
  });

  return { headers, rows, sheetName };
}

export function parseCSVText(text: string): ParsedSpreadsheet {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [], sheetName: 'CSV' };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const out: Record<string, string> = {};
    headers.forEach((h, i) => {
      out[h] = vals[i] ?? '';
    });
    return out;
  });

  return { headers, rows, sheetName: 'CSV' };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCSVText(text);
  }
  const buffer = await file.arrayBuffer();
  return parseExcelBuffer(buffer);
}

export function isSpreadsheetFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls');
}

export const ACCEPTED_IMPORT_TYPES = '.csv,.xlsx,.xls';
