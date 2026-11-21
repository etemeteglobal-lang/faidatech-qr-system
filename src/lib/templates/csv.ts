export type CsvTable = { headers: string[]; rows: string[][] };

export function parseCsv(input: string, maxRows = 500): CsvTable {
  if (Buffer.byteLength(input, "utf8") > 1_000_000) throw new Error("CSV exceeds 1 MiB.");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
      if (rows.length > maxRows + 1) throw new Error(`CSV may contain at most ${maxRows} data rows.`);
    } else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted cell.");
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((value) => value.trim().length));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((header) => header.trim());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error("CSV headers must be non-empty and unique.");
  const data = nonEmpty.slice(1).map((values) => {
    if (values.length !== headers.length) throw new Error("Every CSV row must have the same number of columns as the header.");
    return values;
  });
  return { headers, rows: data };
}
