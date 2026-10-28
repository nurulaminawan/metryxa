function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => String(value).trim()));
}

function numberish(value) {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw || raw === "--") return 0;
  if (raw.endsWith("%")) return Number(raw.slice(0, -1)) / 100;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCtr(value) {
  const n = numberish(value);
  if (n > 1) return n / 100;
  return n;
}

export function parseGscCsv(text) {
  const table = parseCsv(text);
  const headerIndex = table.findIndex((row) => {
    const joined = row.map((cell) => cell.trim().toLowerCase());
    return joined.includes("clicks") && joined.includes("impressions") && (joined.includes("query") || joined.includes("page") || joined.includes("top queries") || joined.includes("top pages"));
  });
  if (headerIndex === -1) {
    throw new Error("This CSV does not look like a Search Console export. It needs Query or Page, plus Clicks, Impressions, CTR, and Position.");
  }
  const headers = table[headerIndex].map((cell) => cell.trim().toLowerCase());
  const index = (name) => headers.indexOf(name);
  const hasQuery = index("query") >= 0;
  const hasPage = index("page") >= 0;
  const kind = hasQuery && hasPage ? "queryPages" : hasQuery ? "queries" : "pages";
  const keyIndex = hasQuery ? index("query") : index("page");
  const rows = [];
  for (const row of table.slice(headerIndex + 1)) {
    const key = (row[keyIndex] || "").trim();
    if (!key || /^top /i.test(key)) continue;
    rows.push({
      key,
      page: hasPage ? (row[index("page")] || "").trim() : "",
      clicks: Math.round(numberish(row[index("clicks")])),
      impressions: Math.round(numberish(row[index("impressions")])),
      ctr: normalizeCtr(row[index("ctr")]),
      position: Number(numberish(row[index("position")]).toFixed(2)),
    });
  }
  if (!rows.length) throw new Error("The CSV header was recognized, but there were no data rows.");
  return { kind, rows: rows.slice(0, 5000) };
}

export function expectedCtr(position) {
  const curve = [0.28, 0.15, 0.11, 0.08, 0.06, 0.045, 0.035, 0.028, 0.022, 0.018];
  if (!position || position < 1) return 0.01;
  if (position <= 10) return curve[Math.min(9, Math.round(position) - 1)];
  if (position <= 20) return 0.01;
  return 0.004;
}
