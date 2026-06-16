/**
 * Convert an array of objects to CSV format.
 */
export function toCSV(data, columns) {
  if (!data || data.length === 0) return '';

  const cols = columns || Object.keys(data[0]);
  const header = cols.map((c) => `"${c}"`).join(',');
  const rows = data.map((row) =>
    cols.map((c) => {
      let val = row[c];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'string') val = val.replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  return [header, ...rows].join('\n');
}
