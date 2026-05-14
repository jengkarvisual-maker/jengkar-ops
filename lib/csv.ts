export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const serialized = `${value}`.replace(/"/g, '""');
          return `"${serialized}"`;
        })
        .join(","),
    ),
  ];

  return lines.join("\n");
}
