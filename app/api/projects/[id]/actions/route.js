import { buildDraft } from "../../../../../lib/content.js";
import { crawlSite } from "../../../../../lib/crawl.js";
import { parseGscCsv } from "../../../../../lib/gsc.js";
import { buildInsights } from "../../../../../lib/insights.js";
import { getProject, saveProject } from "../../../../../lib/store.js";
import { assertHttpUrl, hostLabel, sameHost } from "../../../../../lib/url.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function applyCrawl(project, crawl) {
  project.pages = crawl.pages;
  project.hasRobots = crawl.hasRobots;
  project.hasSitemap = crawl.hasSitemap;
  project.siteIssues = crawl.siteIssues;
  project.crawledAt = crawl.crawledAt;
}

export async function POST(request, context) {
  const { id } = await context.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Workspace not found" }, { status: 404 });
  try {
    const body = await request.json();
    if (body.type === "crawl") {
      project.maxPages = Math.max(1, Math.min(20, Number(body.maxPages) || project.maxPages || 8));
      applyCrawl(project, await crawlSite(project.url, project.maxPages));
    } else if (body.type === "competitor") {
      const url = assertHttpUrl(body.url).toString();
      if (sameHost(url, project.url)) throw new Error("Pick a different domain than the one you already crawled.");
      const host = hostLabel(url);
      const crawl = await crawlSite(url, 4);
      project.competitors = (project.competitors || []).filter((item) => item.host !== host);
      project.competitors.unshift({
        id: crypto.randomUUID(),
        url,
        host,
        pages: crawl.pages,
        crawledAt: crawl.crawledAt,
      });
      project.competitors = project.competitors.slice(0, 5);
    } else if (body.type === "removeCompetitor") {
      project.competitors = (project.competitors || []).filter((item) => item.id !== body.competitorId);
    } else if (body.type === "gsc") {
      const parsed = parseGscCsv(body.csv || "");
      project.gsc = project.gsc || { queries: [], pages: [], queryPages: [], imports: [] };
      if (parsed.kind === "queries") {
        project.gsc.queries = parsed.rows;
        project.gsc.imports = [
          ...(project.gsc.imports || []),
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
      } else if (parsed.kind === "pages") project.gsc.pages = parsed.rows;
      else project.gsc.queryPages = parsed.rows;
    } else if (body.type === "prompt") {
      const text = String(body.text || "").replace(/\s+/g, " ").trim();
      if (text.length < 3) throw new Error("Enter a prompt of at least 3 characters.");
      project.prompts = [
        { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() },
        ...(project.prompts || []),
      ].slice(0, 40);
    } else if (body.type === "removePrompt") {
      project.prompts = (project.prompts || []).filter((item) => item.id !== body.promptId);
    } else if (body.type === "draft") {
      const insights = buildInsights(project);
      const page = (project.pages || []).find((item) => item.url === body.pageUrl) || project.pages?.[0] || null;
      const draft = buildDraft({
        keyword: String(body.keyword || "").trim(),
        page,
        gaps: insights.topicGaps.map((gap) => gap.heading),
        sources: insights.sourceGaps,
        related: insights.internalLinks.slice(0, 6).map((link) => ({
          url: link.target,
          anchor: link.anchor,
          reason: link.reason,
        })),
      });
      project.drafts = [draft, ...(project.drafts || [])].slice(0, 25);
    } else if (body.type === "removeDraft") {
      project.drafts = (project.drafts || []).filter((item) => item.id !== body.draftId);
    } else if (body.type === "settings") {
      if (body.name) project.name = String(body.name).slice(0, 80);
      if (body.brandTerms != null) {
        project.brandTerms = String(body.brandTerms)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12);
      }
      if (body.maxPages) project.maxPages = Math.max(1, Math.min(20, Number(body.maxPages)));
    } else {
      throw new Error("Unknown action");
    }
    saveProject(project);
    return Response.json({ project, insights: buildInsights(project) });
  } catch (error) {
    return Response.json({ error: error.message || "Action failed" }, { status: 400 });
  }
}
