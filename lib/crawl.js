import { assertHttpUrl, normalizeUrl, sameHost } from "./url.js";
import { parsePage } from "./parse-page.js";
import { scorePage } from "./score.js";

const AGENT = "MetryxaBot/1.0 (+https://metryxa.com; SEO and GEO audit)";

function headerSnapshot(headers) {
  return {
    hsts: headers.get("strict-transport-security") ? "yes" : "",
    csp: headers.get("content-security-policy") ? "yes" : "",
    xfo: headers.get("x-frame-options") || "",
    nosniff: headers.get("x-content-type-options") || "",
    referrer: headers.get("referrer-policy") || "",
  };
}

export async function fetchDocument(input) {
  const url = assertHttpUrl(input);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 2_000_000) {
      throw new Error("Document is larger than 2 MB");
    }
    const buffer = await response.arrayBuffer();
    const sliced = buffer.byteLength > 1_500_000 ? buffer.slice(0, 1_500_000) : buffer;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(sliced);
    const type = response.headers.get("content-type") || "";
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url || url.toString(),
      html: /html|xml|text\/plain/i.test(type) || html.trim().startsWith("<") ? html : "",
      ms: Date.now() - started,
      htmlBytes: buffer.byteLength,
      headers: headerSnapshot(response.headers),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url.toString(),
      html: "",
      ms: Date.now() - started,
      htmlBytes: 0,
      headers: {},
      error: error.name === "TimeoutError" ? "Timed out after 12s" : error.message,
    };
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": AGENT, accept: "text/plain,application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!response.ok) return { ok: false, status: response.status, text: "" };
    const text = (await response.text()).slice(0, 500_000);
    return { ok: true, status: response.status, text };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error.message };
  }
}

function extractSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

async function discoverUrls(origin, homepageLinks, limit) {
  const robots = await fetchText(new URL("/robots.txt", origin).toString());
  const sitemapFromRobots = robots.ok
    ? [...robots.text.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1])
    : [];
  const seeds = sitemapFromRobots.length
    ? sitemapFromRobots
    : [new URL("/sitemap.xml", origin).toString()];
  const pageUrls = [];
  for (const seed of seeds.slice(0, 3)) {
    const file = await fetchText(seed);
    if (!file.ok) continue;
    const locs = extractSitemapLocs(file.text);
    const nested = locs.filter((loc) => /sitemap/i.test(loc) && loc.endsWith(".xml")).slice(0, 2);
    const pages = locs.filter((loc) => !nested.includes(loc));
    pageUrls.push(...pages);
    for (const child of nested) {
      const nestedFile = await fetchText(child);
      if (nestedFile.ok) pageUrls.push(...extractSitemapLocs(nestedFile.text));
    }
    if (pageUrls.length >= limit) break;
  }
  const unique = [];
  const seen = new Set();
  for (const candidate of [...pageUrls, ...homepageLinks]) {
    if (unique.length >= limit) break;
    try {
      if (!sameHost(candidate, origin)) continue;
      const clean = normalizeUrl(candidate);
      if (seen.has(clean) || /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js|xml)$/i.test(clean)) continue;
      seen.add(clean);
      unique.push(clean);
    } catch {
      /* skip bad loc */
    }
  }
  return {
    hasRobots: robots.ok,
    hasSitemap: pageUrls.length > 0,
    urls: unique,
  };
}

export async function crawlSite(startUrl, maxPages = 10) {
  const origin = assertHttpUrl(startUrl);
  const cap = Math.max(1, Math.min(20, Number(maxPages) || 10));
  const home = await fetchDocument(origin.toString());
  const parsedHome = parsePage(home.html, home.finalUrl || origin.toString(), home);
  const discovery = await discoverUrls(origin.toString(), parsedHome.links?.internalHrefs || [], cap * 3);
  const queue = [];
  const seen = new Set();
  const push = (value) => {
    try {
      const clean = normalizeUrl(value);
      if (seen.has(clean) || !sameHost(clean, origin.toString())) return;
      seen.add(clean);
      queue.push(clean);
    } catch {
      /* ignore */
    }
  };
  push(home.finalUrl || origin.toString());
  for (const url of discovery.urls) push(url);

  const pages = [];
  let homeUsed = false;
  const homeKey = normalizeUrl(home.finalUrl || origin.toString());
  while (queue.length && pages.length < cap) {
    const next = queue.shift();
    const useHome = !homeUsed && (next === homeKey || next === normalizeUrl(origin.toString()));
    const fetched = useHome ? home : await fetchDocument(next);
    const parsed = useHome ? parsedHome : parsePage(fetched.html, fetched.finalUrl || next, fetched);
    if (useHome) homeUsed = true;
    pages.push({ ...parsed, scores: scorePage(parsed) });
    for (const href of parsed.links?.internalHrefs || []) {
      if (seen.size < cap * 5) push(href);
    }
  }

  const siteIssues = [];
  if (!discovery.hasRobots) {
    siteIssues.push({
      severity: "warning",
      category: "technical",
      title: "robots.txt not found",
      detail: "A 200 robots.txt tells crawlers which AI and search bots you allow.",
      fix: "Publish /robots.txt. Name the bots you welcome instead of leaving the file missing.",
    });
  }
  if (!discovery.hasSitemap) {
    siteIssues.push({
      severity: "warning",
      category: "technical",
      title: "XML sitemap not found",
      detail: "No URL locs were found in robots.txt or /sitemap.xml.",
      fix: "Publish a sitemap and reference it from robots.txt so new pages are discovered.",
    });
  }

  return {
    hasRobots: discovery.hasRobots,
    hasSitemap: discovery.hasSitemap,
    siteIssues,
    pages,
    crawledAt: new Date().toISOString(),
  };
}
