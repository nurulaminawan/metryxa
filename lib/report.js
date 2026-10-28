function escape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeChart(pages) {
  const rows = pages.filter((page) => page && !page.error).slice(0, 12);
  if (!rows.length) return "<p>No fetched pages to chart.</p>";
  const width = 640;
  const height = 180;
  const gap = 10;
  const barWidth = (width - gap * (rows.length - 1)) / rows.length;
  const max = Math.max(1, ...rows.map((page) => page.ms || 0));
  const bars = rows.map((page, index) => {
    const barHeight = Math.max(4, ((page.ms || 0) / max) * 140);
    const x = index * (barWidth + gap);
    const y = 150 - barHeight;
    return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" fill="#12324d"><title>${escape(page.finalUrl || page.url)} · ${page.ms || 0} ms</title></rect></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="HTML response time by page" style="width:100%;height:auto">${bars}</svg>`;
}

function scoreCard(label, value) {
  return `<div class="score"><b>${value}</b><span>${label}</span></div>`;
}

export function renderReport(project, insights) {
  const issues = insights.topIssues
    .map(
      (item) =>
        `<li><em>${escape(item.severity)}</em> <strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p><p class="fix">${escape(item.fix)}</p>${item.url ? `<a href="${escape(item.url)}">${escape(item.url)}</a>` : ""}</li>`
    )
    .join("");
  const keywords = insights.keywords
    .slice(0, 15)
    .map(
      (row) =>
        `<tr><td>${escape(row.phrase)}</td><td>${escape(row.intent)}</td><td>${row.yourPages}</td><td>${row.theirPages}</td><td>${row.position ?? "—"}</td><td>${row.impressions}</td><td>${row.opportunity}</td></tr>`
    )
    .join("");
  const gaps = insights.topicGaps
    .slice(0, 12)
    .map((gap) => `<li><strong>${escape(gap.heading)}</strong> on ${escape(gap.competitor)}</li>`)
    .join("");
  const prompts = insights.prompts
    .map((prompt) => `<li><strong>${escape(prompt.text)}</strong> — ${prompt.coverage}% of fan-out prompts are covered by your pages</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escape(project.name)} · Metryxa report</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; color: #1c2430; margin: 40px auto; max-width: 860px; line-height: 1.5; }
    h1 { font-weight: 560; letter-spacing: -0.03em; }
    .muted { color: #5c675f; }
    .scores { display: flex; gap: 12px; margin: 24px 0; }
    .score { border: 1px solid #ddd6c8; padding: 12px 16px; min-width: 100px; }
    .score b { display: block; font-size: 28px; }
    table { width: 100%; border-collapse: collapse; font-family: "Segoe UI", sans-serif; font-size: 14px; }
    th, td { text-align: left; border-bottom: 1px solid #eee; padding: 8px 6px; vertical-align: top; }
    li { margin: 10px 0; }
    em { font-style: normal; text-transform: uppercase; font-size: 11px; letter-spacing: .06em; }
    .fix { color: #0e6b4e; }
    a { color: #1e4d8c; word-break: break-all; }
  </style>
</head>
<body>
  <p class="muted">Metryxa · measured from crawl${insights.gsc.queries ? " and Search Console" : ""}</p>
  <h1>${escape(project.name)}</h1>
  <p>${escape(project.url)} · ${insights.counts.pages} pages crawled ${project.crawledAt ? `on ${escape(project.crawledAt.slice(0, 10))}` : ""}</p>
  <div class="scores">
    ${scoreCard("SEO", insights.scores.seo)}
    ${scoreCard("GEO", insights.scores.geo)}
    ${scoreCard("E-E-A-T", insights.scores.eeat)}
    ${scoreCard("Technical", insights.scores.technical)}
  </div>
  <h2>Document time</h2>
  <p class="muted">Milliseconds until the HTML arrived. Hover a bar for the URL. This is not a filmstrip grade.</p>
  ${timeChart(project.pages || [])}
  <h2>Priority fixes</h2>
  <ol>${issues || "<li>No issues stored yet. Crawl the site first.</li>"}</ol>
  <h2>Keyword opportunities</h2>
  <table>
    <thead><tr><th>Keyword</th><th>Intent</th><th>Your pages</th><th>Competitor pages</th><th>Position</th><th>Impressions</th><th>Opportunity</th></tr></thead>
    <tbody>${keywords || "<tr><td colspan='7'>Crawl a site or import Search Console.</td></tr>"}</tbody>
  </table>
  <h2>Competitor heading gaps</h2>
  <ul>${gaps || "<li>Add a competitor URL to compare live pages.</li>"}</ul>
  <h2>Public keyword and crawler intel</h2>
  <ul>${
    project.intel
      ? `<li>${(project.intel.suggestions || []).length} autosuggest ideas for “${escape(project.intel.seed)}”</li><li>llms.txt: ${project.intel.llms?.found ? "found" : "not found"}</li><li>AI crawlers blocked: ${escape((project.intel.crawlers || []).filter((bot) => bot.access === "blocked").map((bot) => bot.name).join(", ") || "none detected")}</li>`
      : "<li>Run Intel to pull autosuggest, Wikipedia, Wayback, and certificate data.</li>"
  }</ul>
  <h2>AI prompt coverage</h2>
  <ul>${prompts || "<li>Track a prompt to see which answer variations your pages already cover.</li>"}</ul>
  <p class="muted">Scores come from the fetched HTML, headers, sitemap, and any Search Console rows you imported. Metryxa does not invent search volume or backlink counts.</p>
</body>
</html>`;
}
