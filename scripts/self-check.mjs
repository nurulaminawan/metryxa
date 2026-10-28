import { buildDraft } from "../lib/content.js";
import { parseGscCsv } from "../lib/gsc.js";
import { buildInsights } from "../lib/insights.js";
import { parsePage } from "../lib/parse-page.js";
import { scorePage } from "../lib/score.js";
import { crawlSite } from "../lib/crawl.js";

const html = `<!doctype html><html lang="en"><head>
<title>How to prune tomatoes for more fruit</title>
<meta name="description" content="Prune tomatoes by removing suckers each week so the plant puts energy into fruit instead of leaves.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://garden.example/prune-tomatoes">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"How to prune tomatoes","author":{"@type":"Person","name":"Ada Garden"},"datePublished":"2024-05-01"}</script>
</head><body><main>
<h1>How to prune tomatoes</h1>
<p>Prune tomatoes by pinching suckers every week. Determinate varieties need less pruning than indeterminate ones, and the first pass takes about 10 minutes.</p>
<h2>What is a sucker?</h2>
<ul><li>The shoot between the stem and a leaf</li></ul>
<table><tr><td>Indeterminate</td><td>Prune weekly</td></tr></table>
<a href="https://garden.example/about">About</a>
<a href="https://garden.example/contact">Contact</a>
<a href="https://en.wikipedia.org/wiki/Tomato">Tomato</a>
<img src="/a.jpg" alt="tomato sucker">
</main></body></html>`;

const page = parsePage(html, "https://garden.example/prune-tomatoes", {
  status: 200,
  finalUrl: "https://garden.example/prune-tomatoes",
  ms: 180,
  htmlBytes: html.length,
  headers: { hsts: "yes", csp: "yes", xfo: "DENY", nosniff: "nosniff" },
});
if (page.h1[0] !== "How to prune tomatoes") throw new Error(`H1 parse failed: ${page.h1.join("|")}`);
if (!page.schemaTypes.includes("Article")) throw new Error(`Schema parse failed: ${page.schemaTypes}`);
const scores = scorePage(page);
if (scores.geo < 70) throw new Error(`GEO score too low for a complete page: ${scores.geo}`);
if (scores.seo < 70) throw new Error(`SEO score too low: ${scores.seo}`);

const thin = scorePage(parsePage("<html><head><title>Hi</title></head><body>Welcome</body></html>", "http://thin.example", { status: 200, ms: 100, htmlBytes: 80, headers: {} }));
if (thin.seo >= scores.seo) throw new Error("Thin page should score below the complete page");

const csv = `Top queries,,,,
Query,Clicks,Impressions,CTR,Position
prune tomatoes,40,1000,4%,8.2
best tomato cages,12,900,1.3%,2.4
`;
const parsed = parseGscCsv(csv);
if (parsed.kind !== "queries") throw new Error("Expected query export");
if (Math.abs(parsed.rows[0].ctr - 0.04) > 0.001) throw new Error(`CTR parse failed: ${parsed.rows[0].ctr}`);
const both = parseGscCsv("Query,Page,Clicks,Impressions,CTR,Position\nprune tomatoes,https://garden.example/a,10,100,10%,6\nprune tomatoes,https://garden.example/b,8,80,10%,9\n");
if (both.kind !== "queryPages") throw new Error("Expected query+page export");

const project = {
  pages: [{ ...page, scores }],
  gsc: { queries: parsed.rows, pages: [], queryPages: both.rows, imports: [] },
  competitors: [],
  prompts: [{ id: "1", text: "how to prune tomatoes" }],
  brandTerms: ["garden"],
  aiTraffic: [],
  siteIssues: [],
  hasRobots: true,
  hasSitemap: true,
};
const insights = buildInsights(project);
if (!insights.keywords.length) throw new Error("No keywords");
if (!insights.striking.length) throw new Error("Striking distance missed position 8.2");
if (!insights.prompts[0].variations.length) throw new Error("Fan-out failed");
const draft = buildDraft({ keyword: "how to prune tomatoes", page, gaps: ["What is a sucker?"], sources: ["wikipedia.org"], related: [] });
if (!draft.markdown.includes("Answer first")) throw new Error("Draft missing BLUF");

const live = await crawlSite("https://example.com", 2);
if (!live.pages.length) throw new Error("Live crawl returned no pages");
if (!live.pages[0].title) throw new Error(`Live crawl missed title: ${live.pages[0].error || live.pages[0].status}`);
console.log(`ok seo=${scores.seo} geo=${scores.geo} live="${live.pages[0].title}" pages=${live.pages.length}`);
