import { crawlSite } from "../../../lib/crawl.js";
import { guardNewCrawl, guardRead } from "../../../lib/guard.js";
import { buildInsights } from "../../../lib/insights.js";
import { blankProject, saveProject } from "../../../lib/store.js";
import { assertHttpUrl, hostLabel } from "../../../lib/url.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const limited = await guardRead(request);
  if (limited) return limited;
  return Response.json({ projects: [] });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = assertHttpUrl(body.url).toString();
    const limited = await guardNewCrawl(request, body.captchaToken);
    if (limited) return limited;
    const host = hostLabel(url);
    const project = blankProject({ url, host, name: (body.name || host).slice(0, 80) });
    project.maxPages = Math.max(1, Math.min(20, Number(body.maxPages) || 8));
    if (body.brand) project.brandTerms = String(body.brand).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
    const crawl = await crawlSite(project.url, project.maxPages);
    project.pages = crawl.pages;
    project.hasRobots = crawl.hasRobots;
    project.hasSitemap = crawl.hasSitemap;
    project.siteIssues = crawl.siteIssues;
    project.crawledAt = crawl.crawledAt;
    project.inventory = crawl.inventory || [];
    if (!crawl.pages.length) throw new Error("The crawl finished without any HTML pages.");
    saveProject(project);
    return Response.json({ project, insights: buildInsights(project) });
  } catch (error) {
    return Response.json({ error: error.message || "Could not start the workspace" }, { status: 400 });
  }
}
