import { buildDraft } from "./content.js";
import { parseGaCsv, parseGscCsv } from "./gsc.js";
import { buildInsights } from "./insights.js";

export const staticHost = process.env.NEXT_PUBLIC_STATIC_HOST === "1";

const serverOnly = {
  crawl: "This GitHub Pages copy cannot fetch another website. The checks, charts, drafts, and Search Console or Analytics imports already in this browser still run.",
  competitor: "Comparing another host needs the Metryxa server to fetch that site.",
  urlmap: "Reading a live sitemap needs the Metryxa server.",
  intel: "Live autosuggest and the other public lookups need the Metryxa server.",
};

export function applyLocalAction(project, body) {
  if (serverOnly[body.type]) throw new Error(serverOnly[body.type]);
  const next = structuredClone(project);
  if (body.type === "gsc") {
    const parsed = parseGscCsv(body.csv || "");
    next.gsc = next.gsc || { queries: [], pages: [], queryPages: [], imports: [] };
    if (parsed.kind === "queries") {
      next.gsc.queries = parsed.rows;
      next.gsc.imports = [
        ...(next.gsc.imports || []),
        {
          importedAt: new Date().toISOString(),
          queries: parsed.rows.map((row) => ({
            key: row.key,
            position: row.position,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
          })),
        },
      ].slice(-6);
    } else if (parsed.kind === "pages") next.gsc.pages = parsed.rows;
    else next.gsc.queryPages = parsed.rows;
  } else if (body.type === "prompt") {
    const text = String(body.text || "").replace(/\s+/g, " ").trim();
    if (text.length < 3) throw new Error("Enter a prompt of at least 3 characters.");
    next.prompts = [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }, ...(next.prompts || [])].slice(0, 40);
  } else if (body.type === "removePrompt") {
    next.prompts = (next.prompts || []).filter((item) => item.id !== body.promptId);
  } else if (body.type === "draft") {
    const page = (next.pages || []).find((item) => item.url === body.pageUrl) || next.pages?.[0] || null;
    const insights = buildInsights(next);
    const draft = buildDraft({
      keyword: String(body.keyword || "").trim(),
      page,
      gaps: (insights.topicGaps || []).map((gap) => gap.heading),
      sources: insights.sourceGaps || [],
      related: (insights.internalLinks || []).slice(0, 6).map((link) => ({
        url: link.target,
        anchor: link.anchor,
        reason: link.reason,
      })),
    });
    next.drafts = [draft, ...(next.drafts || [])].slice(0, 25);
  } else if (body.type === "removeDraft") {
    next.drafts = (next.drafts || []).filter((item) => item.id !== body.draftId);
  } else if (body.type === "ga") {
    next.ga = { pages: parseGaCsv(body.csv || ""), importedAt: new Date().toISOString() };
  } else if (body.type === "removeCompetitor") {
    next.competitors = (next.competitors || []).filter((item) => item.id !== body.competitorId);
  } else if (body.type === "settings") {
    if (body.name) next.name = String(body.name).slice(0, 80);
    if (body.brandTerms != null) {
      next.brandTerms = String(body.brandTerms).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
    }
    if (body.maxPages) next.maxPages = Math.max(1, Math.min(20, Number(body.maxPages)));
  } else {
    throw new Error("This action needs the Metryxa server.");
  }
  return next;
}
