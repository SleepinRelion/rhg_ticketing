import xlsx from 'xlsx';

import fs from 'fs';
import path from 'path';

const dir = './May 2026 - Daily Intervention Report';
const files = fs.readdirSync(dir);

const titles = new Set();
for (const file of files) {
  if (!file.endsWith('.xlsx')) continue;
  const workbook = xlsx.readFile(path.join(dir, file));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data[0] && data[0][0]) {
    titles.add(data[0][0]);
  }
}
console.log('Unique titles:', Array.from(titles));
