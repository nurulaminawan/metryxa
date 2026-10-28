import { buildDraft } from "../lib/content.js";
import { parseGaCsv, parseGscCsv } from "../lib/gsc.js";
import { buildUrlMap } from "../lib/url-map.js";
import { buildInsights } from "../lib/insights.js";
import { parsePage } from "../lib/parse-page.js";
import { performanceReport } from "../lib/performance.js";
import { scorePage } from "../lib/score.js";
import { crawlSite } from "../lib/crawl.js";
import { runTools } from "../lib/toolbox.js";
import { closeRedis } from "../lib/redis.js";
import { enforceRateLimit, reserveWindow, slidingWindow } from "../lib/rate-limit.js";
import { detectTech, parseAiCrawlers, parseSuggest } from "../lib/intel.js";

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
const perf = performanceReport({ ...page, https: true, headers: { hsts: "yes", csp: "yes", xfo: "DENY", nosniff: "nosniff", encoding: "br", cache: "max-age=3600" } });
if (perf.ms !== 180 || perf.structure < 80) throw new Error(`Performance report unexpected: ${JSON.stringify(perf)}`);

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

const ideas = parseSuggest('["crm",["best crm","crm software"]]');
if (!ideas.includes("best crm")) throw new Error("Autosuggest parse failed");
const bots = parseAiCrawlers("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n");
if (bots.find((bot) => bot.bot === "GPTBot").access !== "blocked") throw new Error("GPTBot should be blocked");
if (bots.find((bot) => bot.bot === "PerplexityBot").access !== "allowed") throw new Error("Unnamed bots follow the open wildcard");
const tech = detectTech('<script src="https://cdn.shopify.com/shop.js"></script><script src="https://www.googletagmanager.com/gtm.js"></script>', { server: "cloudflare", cf: true });
const techNames = tech.map((item) => item.name);
if (!techNames.includes("Shopify") || !techNames.includes("Cloudflare") || !techNames.includes("Google Tag Manager")) {
  throw new Error(`Tech detect failed: ${techNames.join(", ")}`);
}
if (tech.find((item) => item.name === "Shopify").category !== "Ecommerce") throw new Error("Shopify should be categorized as ecommerce");

const ga = parseGaCsv("Page path and screen class,Views,Users\n/blog/water,50,10\n");
if (ga[0].views !== 50 || ga[0].key !== "/blog/water") throw new Error("Analytics CSV parse failed");
const urlMap = buildUrlMap({
  entries: [
    { url: "https://garden.example/blog/prune", lastmod: "2024-01-01" },
    { url: "https://garden.example/blog/water", lastmod: "" },
  ],
  pages: [{ url: "https://garden.example/blog/prune", status: 200, scores: { seo: 80 }, title: "Prune" }],
  gscPages: [{ key: "https://garden.example/blog/prune", clicks: 10, impressions: 100, position: 4 }],
  gaPages: ga,
});
if (urlMap.counts.sitemap !== 2 || urlMap.counts.audited !== 1) throw new Error("URL map counts failed");
if (!urlMap.folders.some((folder) => folder.folder === "/blog/" && folder.views === 50 && folder.clicks === 10)) {
  throw new Error(`Folder rollup failed: ${JSON.stringify(urlMap.folders)}`);
}

const slide = "slide-check";
if (!slidingWindow(slide, 2, 10_000, 1_000).ok || !slidingWindow(slide, 2, 10_000, 2_000).ok) {
  throw new Error("Sliding window rejected an allowed request");
}
const held = slidingWindow(slide, 2, 10_000, 3_000);
if (held.ok || held.retryAfter !== 8) throw new Error(`Sliding window should hold for 8s, got ${JSON.stringify(held)}`);
if (!slidingWindow(slide, 2, 10_000, 12_000).ok) throw new Error("Oldest request should have left the window");

process.env.TRUST_PROXY = "1";
const limitedRequest = new Request("http://local/api/projects", { headers: { "x-forwarded-for": "203.0.113.44, 10.0.0.1" } });
for (let i = 0; i < 8; i += 1) {
  const allowed = await enforceRateLimit(limitedRequest, "crawl");
  if (allowed) throw new Error(`Crawl ${i + 1} was limited early`);
}
const blocked = await enforceRateLimit(limitedRequest, "crawl");
if (!blocked || blocked.status !== 429) throw new Error("Ninth crawl should return 429");
const blockedBody = await blocked.json();
if (!blockedBody.retryAfterSeconds || blocked.headers.get("retry-after") !== String(blockedBody.retryAfterSeconds)) {
  throw new Error("429 is missing Retry-After");
}
delete process.env.TRUST_PROXY;

process.env.REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisKey = `self-check:${Date.now()}`;
const redisFirst = await reserveWindow(redisKey, 1, 30_000);
let redisNote = redisFirst.store;
if (redisFirst.store === "redis") {
  if (!redisFirst.ok) throw new Error("Redis rejected the first request in an empty window");
  const redisSecond = await reserveWindow(redisKey, 1, 30_000);
  if (redisSecond.ok || redisSecond.store !== "redis") throw new Error(`Redis window failed: ${JSON.stringify(redisSecond)}`);
}

const toolRun = runTools({ pages: [page] }, { keywords: [], striking: [], gsc: { clicks: 0, impressions: 0 }, urlMap: { counts: { sitemap: 0, audited: 1, sitemapOnly: 0, views: 0 }, folders: [] } });
const titleTool = toolRun.find((tool) => tool.id === "titles");
if (!titleTool.summary.includes("1 of 1")) throw new Error(`Title tool failed: ${titleTool.summary}`);
if (toolRun.length < 40) throw new Error(`Expected more tools, got ${toolRun.length}`);

const live = await crawlSite("https://example.com", 2);
if (!live.pages.length) throw new Error("Live crawl returned no pages");
if (!live.pages[0].title) throw new Error(`Live crawl missed title: ${live.pages[0].error || live.pages[0].status}`);
console.log(`ok seo=${scores.seo} geo=${scores.geo} live="${live.pages[0].title}" pages=${live.pages.length} limits=${redisNote}`);
await closeRedis();
