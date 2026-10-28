import * as cheerio from "cheerio";
import { wordCount } from "./words.js";

const AUTHORITY = [
  "wikipedia.org",
  "wikidata.org",
  ".gov",
  ".edu",
  "nih.gov",
  "who.int",
  "europa.eu",
  "schema.org",
  "developers.google.com",
  "support.google.com",
  "web.dev",
  "developer.mozilla.org",
  "w3.org",
];

function abs(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function isAuthority(hostname) {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return AUTHORITY.some((item) => (item.startsWith(".") ? host.endsWith(item) : host === item || host.endsWith(`.${item}`)));
}

export function parsePage(html, requestedUrl, meta = {}) {
  const $ = cheerio.load(html || "");
  const schemaTypes = [];
  let schemaAuthor = false;
  let schemaDate = false;
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const nodes = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const node of nodes) {
        const type = node?.["@type"];
        const types = Array.isArray(type) ? type : type ? [type] : [];
        for (const item of types) schemaTypes.push(String(item));
        if (node?.author) schemaAuthor = true;
        if (node?.datePublished || node?.dateModified) schemaDate = true;
      }
    } catch {
      /* invalid JSON-LD is reported as missing schema, not a crash */
    }
  });
  const assets = {
    scripts: $("script[src]").length,
    blockingScripts: $("head script[src]").filter((_, el) => !$(el).attr("defer") && !$(el).attr("async") && $(el).attr("type") !== "module").length,
    stylesheets: $("link[rel='stylesheet']").length,
    iframes: $("iframe").length,
    imagesMissingDimensions: $("img").filter((_, el) => !$(el).attr("width") || !$(el).attr("height")).length,
  };
  $("script, style, noscript, svg, iframe").remove();

  const articles = $("article");
  const root = $("main").length ? $("main").first() : articles.length === 1 ? articles.first() : $("body");
  const copy = root.clone();
  copy.find("nav, footer").remove();
  const text = copy.text().replace(/\s+/g, " ").trim();
  const paragraphs = copy
    .find("p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((p) => p.length > 40);

  const headings = [];
  copy.find("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    const tag = String(el.name || el.tagName || "").toLowerCase();
    if (t && /^h[1-6]$/.test(tag)) headings.push({ tag, text: t.slice(0, 180) });
  });
  const h1 = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 6);

  const images = $("img")
    .map((_, el) => ({
      alt: ($(el).attr("alt") || "").trim(),
      src: $(el).attr("src") || "",
    }))
    .get();

  const host = new URL(requestedUrl).hostname.replace(/^www\./, "");
  const links = [];
  $("a[href]").each((_, el) => {
    const href = abs($(el).attr("href"), requestedUrl);
    if (!href || !/^https?:/i.test(href)) return;
    let linkHost = "";
    try {
      linkHost = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      return;
    }
    links.push({
      href: href.split("#")[0],
      text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 120),
      internal: linkHost === host,
      authority: !!(linkHost && linkHost !== host && isAuthority(linkHost)),
      host: linkHost,
    });
  });

  const robots = String($("meta[name='robots']").attr("content") || "");
  const canonical = abs($("link[rel='canonical']").attr("href") || "", requestedUrl);
  const authorMeta = $("meta[name='author']").attr("content") || "";
  const published =
    $("meta[property='article:published_time']").attr("content") ||
    $("time[datetime]").attr("datetime") ||
    "";

  const internalHrefs = [...new Set(links.filter((l) => l.internal).map((l) => l.href))].slice(0, 80);
  const authorityHosts = [...new Set(links.filter((l) => l.authority).map((l) => l.host))].slice(0, 20);

  return {
    url: requestedUrl,
    finalUrl: meta.finalUrl || requestedUrl,
    status: meta.status || 0,
    ms: meta.ms || 0,
    htmlBytes: meta.htmlBytes || Buffer.byteLength(html || "", "utf8"),
    fetchedAt: new Date().toISOString(),
    title: $("title").first().text().replace(/\s+/g, " ").trim().slice(0, 300),
    metaDescription: String($("meta[name='description']").attr("content") || "").replace(/\s+/g, " ").trim().slice(0, 400),
    canonical,
    robots,
    lang: $("html").attr("lang") || "",
    viewport: $("meta[name='viewport']").attr("content") || "",
    h1,
    headings: headings.slice(0, 60),
    wordCount: wordCount(text),
    textSample: text.slice(0, 2500),
    firstParagraph: paragraphs[0] || "",
    images: {
      total: images.length,
      missingAlt: images.filter((img) => !img.alt).length,
    },
    assets,
    links: {
      internal: links.filter((l) => l.internal).length,
      external: links.filter((l) => !l.internal).length,
      internalHrefs,
      authorityHosts,
    },
    schemaTypes: [...new Set(schemaTypes)].slice(0, 16),
    tables: copy.find("table").length,
    lists: copy.find("ul, ol").length,
    questionHeadings: headings.filter((h) => /^(how|what|why|when|where|who|can|does|do|is|are|should|which)\b/i.test(h.text) || h.text.endsWith("?")).length,
    hasAuthor: Boolean(authorMeta || schemaAuthor || $("[rel='author']").length || $(".author, .byline").length),
    hasDate: Boolean(published || schemaDate),
    hasAbout: links.some((l) => /\/(about|team|author|company)(\/|$)/i.test(l.href)),
    hasContact: links.some((l) => /\/(contact|support)(\/|$)/i.test(l.href)),
    https: requestedUrl.startsWith("https://") || (meta.finalUrl || "").startsWith("https://"),
    headers: meta.headers || {},
    ogTitle: $("meta[property='og:title']").attr("content") || "",
    error: meta.error || "",
  };
}
