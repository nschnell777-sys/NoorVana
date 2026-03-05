/**
 * Exports an array of objects to a CSV file download.
 * @param {object[]} data - Array of row objects
 * @param {string} filename - Output filename
 */
export const exportToCsv = (data, filename) => {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const value = String(row[h] ?? '');
      // Escape values containing commas or quotes
      return value.includes(',') || value.includes('"')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
