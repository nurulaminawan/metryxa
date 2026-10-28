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
    encoding: headers.get("content-encoding") || "",
    cache: headers.get("cache-control") || "",
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

async function fetchText(url, max = 500_000) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": AGENT, accept: "text/plain,application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!response.ok) return { ok: false, status: response.status, text: "" };
    const text = (await response.text()).slice(0, max);
    return { ok: true, status: response.status, text };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error.message };
  }
}

function xmlEntries(xml) {
  const pages = [];
  const children = [];
  const blocks = String(xml || "").match(/<(url|sitemap)\b[\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks) {
    const loc = block.match(/<loc>\s*([^<]+)\s*<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/i)?.[1]?.trim().slice(0, 10) || "";
    if (/<sitemap\b/i.test(block)) children.push(loc);
    else pages.push({ loc, lastmod });
  }
  if (!blocks.length) {
    for (const match of String(xml || "").matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
      const loc = match[1].trim();
      if (/sitemap/i.test(loc)) children.push(loc);
      else pages.push({ loc, lastmod: "" });
    }
  }
  return { pages, children };
}

function remember(entries, seen, candidate, lastmod, origin) {
  try {
    if (!sameHost(candidate, origin)) return false;
    const clean = normalizeUrl(candidate);
    if (seen.has(clean) || /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js|xml)$/i.test(clean)) return false;
    seen.add(clean);
    entries.push({ url: clean, lastmod: lastmod || "" });
    return true;
  } catch {
    return false;
  }
}

export async function discoverInventory(origin, limit = 1500) {
  const cap = Math.max(1, Math.min(2000, Number(limit) || 1500));
  const robots = await fetchText(new URL("/robots.txt", origin).toString());
  const sitemapFromRobots = robots.ok
    ? [...robots.text.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1])
    : [];
  const seeds = sitemapFromRobots.length ? sitemapFromRobots : [new URL("/sitemap.xml", origin).toString()];
  const entries = [];
  const seen = new Set();
  const queue = seeds.slice(0, 4);
  let files = 0;
  let foundPage = false;
  while (queue.length && entries.length < cap && files < 12) {
    const seed = queue.shift();
    const file = await fetchText(seed, 2_000_000);
    files += 1;
    if (!file.ok) continue;
    const parsed = xmlEntries(file.text);
    if (parsed.pages.length) foundPage = true;
    for (const child of parsed.children) {
      if (queue.length < 20) queue.push(child);
    }
    for (const page of parsed.pages) {
      if (entries.length >= cap) break;
      remember(entries, seen, page.loc, page.lastmod, origin);
    }
  }
  return {
    hasRobots: robots.ok,
    hasSitemap: foundPage,
    entries,
    urls: entries.map((entry) => entry.url),
  };
}

export async function crawlSite(startUrl, maxPages = 10) {
  const origin = assertHttpUrl(startUrl);
  const cap = Math.max(1, Math.min(20, Number(maxPages) || 10));
  const home = await fetchDocument(origin.toString());
  const parsedHome = parsePage(home.html, home.finalUrl || origin.toString(), home);
  const discovery = await discoverInventory(origin.toString(), 1500);
  const linkSeeds = [];
  for (const href of parsedHome.links?.internalHrefs || []) {
    try {
      const clean = normalizeUrl(href);
      if (sameHost(clean, origin.toString()) && !discovery.urls.includes(clean)) linkSeeds.push(clean);
    } catch {
      /* ignore bad homepage links */
    }
  }
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
  for (const url of linkSeeds) push(url);
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
    inventory: discovery.entries,
    crawledAt: new Date().toISOString(),
  };
}
