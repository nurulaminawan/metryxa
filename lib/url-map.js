import { normalizeUrl } from "./url.js";

export function folderOf(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (!parts.length) return "/";
    if (parts.length === 1) return "/";
    return `/${parts.slice(0, -1).join("/")}/`;
  } catch {
    return "/";
  }
}

export function topFolder(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.length ? `/${parts[0]}/` : "/";
  } catch {
    return "/";
  }
}

function variants(value) {
  const keys = new Set();
  const raw = String(value || "").trim();
  if (!raw) return keys;
  keys.add(raw);
  try {
    const url = new URL(raw);
    keys.add(normalizeUrl(url.toString()));
    const path = url.pathname || "/";
    keys.add(path);
    keys.add(path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path);
  } catch {
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    keys.add(path.split("?")[0]);
  }
  return keys;
}

function indexRows(rows, metric) {
  const map = new Map();
  for (const row of rows || []) {
    for (const key of variants(row.key || row.url)) {
      const current = map.get(key) || { clicks: 0, impressions: 0, views: 0, position: null, weight: 0 };
      current.clicks += row.clicks || 0;
      current.impressions += row.impressions || 0;
      current.views += row.views || 0;
      if (row.position) {
        current.position = row.position;
        current.weight += row.impressions || 1;
      }
      if (metric === "views") current.views += 0;
      map.set(key, current);
    }
  }
  return map;
}

function lookup(map, url) {
  for (const key of variants(url)) {
    if (map.has(key)) return map.get(key);
  }
  return null;
}

export function buildUrlMap({ entries = [], pages = [], gscPages = [], gaPages = [] }) {
  const gsc = indexRows(gscPages, "gsc");
  const ga = indexRows(gaPages, "views");
  const audited = new Map();
  for (const page of pages || []) {
    if (!page?.url) continue;
    try {
      audited.set(normalizeUrl(page.url), page);
    } catch {
      audited.set(page.url, page);
    }
  }
  const sitemap = new Set();
  const nodes = new Map();
  const add = (url, lastmod, inSitemap) => {
    let clean = url;
    try {
      clean = normalizeUrl(url);
    } catch {
      return;
    }
    if (inSitemap) sitemap.add(clean);
    const existing = nodes.get(clean) || {
      url: clean,
      folder: folderOf(clean),
      section: topFolder(clean),
      lastmod: "",
      inSitemap: false,
    };
    if (lastmod && !existing.lastmod) existing.lastmod = lastmod;
    if (inSitemap) existing.inSitemap = true;
    nodes.set(clean, existing);
  };
  for (const entry of entries || []) add(entry.url || entry, entry.lastmod || "", entry.inSitemap !== false);
  for (const page of pages || []) if (page?.url) add(page.url, "", false);

  const urls = [...nodes.values()].map((node) => {
    const page = audited.get(node.url);
    const search = lookup(gsc, node.url) || {};
    const analytics = lookup(ga, node.url) || {};
    return {
      ...node,
      audited: Boolean(page),
      status: page?.status || null,
      seo: page?.scores?.seo ?? null,
      title: page?.title || "",
      clicks: search.clicks || 0,
      impressions: search.impressions || 0,
      position: search.position ?? null,
      views: analytics.views || 0,
    };
  });

  const folders = new Map();
  for (const url of urls) {
    const bucket = folders.get(url.section) || {
      folder: url.section,
      urls: 0,
      audited: 0,
      inSitemap: 0,
      clicks: 0,
      impressions: 0,
      views: 0,
      positionWeight: 0,
      positionSum: 0,
    };
    bucket.urls += 1;
    if (url.audited) bucket.audited += 1;
    if (url.inSitemap) bucket.inSitemap += 1;
    bucket.clicks += url.clicks;
    bucket.impressions += url.impressions;
    bucket.views += url.views;
    if (url.position) {
      const weight = url.impressions || 1;
      bucket.positionSum += url.position * weight;
      bucket.positionWeight += weight;
    }
    folders.set(url.section, bucket);
  }

  return {
    urls,
    folders: [...folders.values()]
      .map((folder) => ({
        ...folder,
        position: folder.positionWeight ? Number((folder.positionSum / folder.positionWeight).toFixed(1)) : null,
      }))
      .sort((a, b) => b.clicks + b.views + b.urls - (a.clicks + a.views + a.urls)),
    counts: {
      urls: urls.length,
      sitemap: urls.filter((url) => url.inSitemap).length,
      audited: urls.filter((url) => url.audited).length,
      sitemapOnly: urls.filter((url) => url.inSitemap && !url.audited).length,
      crawledOnly: urls.filter((url) => url.audited && !url.inSitemap).length,
      clicks: urls.reduce((sum, url) => sum + url.clicks, 0),
      views: urls.reduce((sum, url) => sum + url.views, 0),
    },
  };
}
