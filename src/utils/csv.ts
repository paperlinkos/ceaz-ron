/** Simple and robust CSV parser supporting quotes and standard delimiters */
export function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentToken = '';
  let insideQuote = false;

  const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentToken += '"';
        i++; // Skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentToken.trim());
      currentToken = '';
    } else if (char === '\n' && !insideQuote) {
      currentRow.push(currentToken.trim());
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || currentRow.length > 0) {
    currentRow.push(currentToken.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/** Convert headers and row data array into a formatted CSV string */
export function generateCSV(headers: string[], rows: string[][]): string {
  const escapeCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));

  return [headerLine, ...rowLines].join('\n');
}

/** Trigger browser download for a CSV string */
export function downloadCSVFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ORGANIZATION_CSV_TEMPLATE_HEADERS = [
  'zoneName',
  'zoneCode',
  'groupName',
  'groupCode',
  'churchName',
  'churchCode',
  'pcfName',
  'pcfCode',
];

export const ORGANIZATION_CSV_TEMPLATE_SAMPLE = [
  ['Abuja Zone 1', 'ABJ1', 'Gwarinpa Group', 'GW1', 'CE Gwarinpa 1', 'CG1', 'Grace PCF', 'GP1'],
  ['Abuja Zone 1', 'ABJ1', 'Gwarinpa Group', 'GW1', 'CE Gwarinpa 1', 'CG1', 'Mercy PCF', 'GP2'],
  ['Abuja Zone 1', 'ABJ1', 'Central Group', 'CG1', 'Central Church', 'CC1', 'Faith PCF', 'FP1'],
];

export const SOUL_WINNER_CSV_TEMPLATE_HEADERS = ['name', 'email', 'pcfCode'];

export const SOUL_WINNER_CSV_TEMPLATE_SAMPLE = [
  ['Brother John Doe', 'john.doe@example.com', 'GP1'],
  ['Sister Mary Smith', 'mary.smith@example.com', 'GP2'],
  ['Brother Emmanuel Chidiebere', 'emmanuel.c@example.com', 'FP1'],
];

export function downloadOrganizationTemplate(): void {
  const content = generateCSV(ORGANIZATION_CSV_TEMPLATE_HEADERS, ORGANIZATION_CSV_TEMPLATE_SAMPLE);
  downloadCSVFile('organization_import_template.csv', content);
}

export function downloadSoulWinnerTemplate(): void {
  const content = generateCSV(SOUL_WINNER_CSV_TEMPLATE_HEADERS, SOUL_WINNER_CSV_TEMPLATE_SAMPLE);
  downloadCSVFile('soul_winner_import_template.csv', content);
}
