function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function line(page, text) {
  return `${text} · ${hostOf(page.finalUrl || page.url)}${page.url?.includes("/") ? page.url.replace(/^https?:\/\/[^/]+/, "") || "/" : ""}`;
}

function pagesOf(project) {
  return (project?.pages || []).filter((page) => page && !page.error);
}

export const toolCatalog = [
  { id: "status", group: "Crawl", name: "HTTP status", detail: "Status code of every fetched page." },
  { id: "redirects", group: "Crawl", name: "Redirects", detail: "Pages whose final URL differs from the URL that was requested." },
  { id: "https", group: "Crawl", name: "HTTPS", detail: "Whether each fetched page ended on HTTPS." },
  { id: "robots", group: "Crawl", name: "Robots meta", detail: "Index and noindex directives read from each page." },
  { id: "sitemap", group: "Crawl", name: "Sitemap coverage", detail: "Sitemap URLs compared with the pages that were audited." },
  { id: "titles", group: "On-page", name: "Title tags", detail: "The title element on each crawled page." },
  { id: "title-length", group: "On-page", name: "Title length", detail: "Character count of each title. A useful range is about 45–60." },
  { id: "metas", group: "On-page", name: "Meta descriptions", detail: "The meta description on each crawled page." },
  { id: "meta-length", group: "On-page", name: "Meta length", detail: "Character count of each meta description." },
  { id: "h1", group: "On-page", name: "H1 headings", detail: "The H1 text found on each page." },
  { id: "outline", group: "On-page", name: "Heading outline", detail: "How many headings each page contains." },
  { id: "canonicals", group: "On-page", name: "Canonicals", detail: "The canonical URL declared on each page." },
  { id: "language", group: "On-page", name: "Language", detail: "The lang attribute on the html element." },
  { id: "viewport", group: "On-page", name: "Viewport", detail: "Whether a mobile viewport meta tag is present." },
  { id: "duplicate-titles", group: "On-page", name: "Duplicate titles", detail: "Titles that appear on more than one crawled page." },
  { id: "duplicate-metas", group: "On-page", name: "Duplicate metas", detail: "Meta descriptions shared by more than one crawled page." },
  { id: "open-graph", group: "On-page", name: "Open Graph title", detail: "The og:title value, when the page publishes one." },
  { id: "words", group: "Content", name: "Word count", detail: "Words in the main content of each page." },
  { id: "opening", group: "Content", name: "Opening paragraph", detail: "Length of the first substantial paragraph, the usual place for an answer." },
  { id: "questions", group: "Content", name: "Question headings", detail: "Headings written as questions." },
  { id: "lists", group: "Content", name: "Lists", detail: "List blocks in the main content." },
  { id: "tables", group: "Content", name: "Tables", detail: "Tables in the main content." },
  { id: "schema", group: "Content", name: "Schema types", detail: "JSON-LD types found on each page." },
  { id: "author-date", group: "Content", name: "Author and date", detail: "Whether a byline and a published date were found." },
  { id: "about-contact", group: "Content", name: "About and contact", detail: "Whether the crawl found an about link and a contact link." },
  { id: "internal", group: "Links", name: "Internal links", detail: "Links that stay on the same host." },
  { id: "external", group: "Links", name: "External links", detail: "Links that leave the host." },
  { id: "citations", group: "Links", name: "Citations", detail: "Authority hosts the page links to, such as Wikipedia." },
  { id: "alt", group: "Links", name: "Image alt text", detail: "Images missing an alt attribute." },
  { id: "nofollow", group: "Links", name: "Nofollow links", detail: "Links marked nofollow. Older crawls need a fresh fetch." },
  { id: "time", group: "Speed", name: "Response time", detail: "Milliseconds until the HTML document arrived." },
  { id: "weight", group: "Speed", name: "HTML size", detail: "Size of the HTML document before images and scripts." },
  { id: "headers", group: "Speed", name: "Security headers", detail: "HSTS, content security policy, nosniff, and frame options." },
  { id: "dimensions", group: "Speed", name: "Image dimensions", detail: "Images with no width and height. Counted on crawls that stored asset data." },
  { id: "keywords", group: "Search", name: "Keyword ideas", detail: "Ideas taken from titles, headings, and Search Console." },
  { id: "striking", group: "Search", name: "Striking distance", detail: "Search Console queries sitting in positions 4–15." },
  { id: "gsc", group: "Search", name: "Search Console totals", detail: "Clicks and impressions from the imported export." },
  { id: "analytics", group: "Search", name: "Analytics views", detail: "Page views from a pasted Analytics export, rolled up with the URL map." },
  { id: "competitors", group: "Search", name: "Competitor pages", detail: "Pages crawled on other hosts." },
  { id: "prompts", group: "Search", name: "Answer prompts", detail: "Prompts expanded into the questions an answer engine tends to ask." },
  { id: "drafts", group: "Search", name: "Drafts", detail: "Drafts already generated in this workspace." },
  { id: "traffic", group: "Audience", name: "Measured traffic", detail: "Search clicks, Analytics views, and AI referrals saved in the workspace." },
  { id: "technology", group: "Audience", name: "Website technology", detail: "Platforms, analytics, and hosts recognized on the homepage." },
];

function summarize(pages, project, insights) {
  const path = (page) => {
    try {
      return new URL(page.url).pathname || "/";
    } catch {
      return page.url;
    }
  };
  const dupes = (values) => {
    const counts = new Map();
    values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].filter(([, count]) => count > 1);
  };
  return {
    status: {
      summary: `${pages.length} HTML pages fetched.`,
      rows: pages.map((page) => line(page, `HTTP ${page.status || 0}`)),
    },
    redirects: {
      summary: `${pages.filter((page) => page.finalUrl && page.finalUrl !== page.url).length} redirected.`,
      rows: pages.filter((page) => page.finalUrl && page.finalUrl !== page.url).map((page) => page.finalUrl),
    },
    https: {
      summary: `${pages.filter((page) => page.https).length} of ${pages.length} ended on HTTPS.`,
      rows: pages.map((page) => line(page, page.https ? "HTTPS" : "HTTP")),
    },
    robots: {
      summary: `${pages.filter((page) => /noindex/i.test(page.robots || "")).length} set to noindex.`,
      rows: pages.map((page) => line(page, page.robots || "indexable")),
    },
    sitemap: {
      summary: insights?.urlMap
        ? `${insights.urlMap.counts.sitemap} in the sitemap, ${insights.urlMap.counts.audited} audited, ${insights.urlMap.counts.sitemapOnly} sitemap URLs not audited.`
        : "Open a workspace after a crawl to compare the sitemap.",
      rows: (insights?.urlMap?.folders || []).slice(0, 8).map((folder) => `${folder.folder} · ${folder.urls} URLs`),
    },
    titles: {
      summary: `${pages.filter((page) => page.title).length} of ${pages.length} have a title.`,
      rows: pages.map((page) => page.title || `Missing title · ${path(page)}`),
    },
    "title-length": {
      summary: `${pages.filter((page) => page.title && (page.title.length < 45 || page.title.length > 60)).length} titles are outside 45–60 characters.`,
      rows: pages.map((page) => `${(page.title || "").length} characters · ${path(page)}`),
    },
    metas: {
      summary: `${pages.filter((page) => page.metaDescription).length} of ${pages.length} have a meta description.`,
      rows: pages.map((page) => page.metaDescription || `Missing meta description · ${path(page)}`),
    },
    "meta-length": {
      summary: `${pages.filter((page) => page.metaDescription && (page.metaDescription.length < 140 || page.metaDescription.length > 160)).length} descriptions are outside 140–160 characters.`,
      rows: pages.map((page) => `${(page.metaDescription || "").length} characters · ${path(page)}`),
    },
    h1: {
      summary: `${pages.filter((page) => page.h1?.length).length} of ${pages.length} have an H1.`,
      rows: pages.map((page) => (page.h1 || []).join(" · ") || `No H1 · ${path(page)}`),
    },
    outline: {
      summary: `${pages.reduce((sum, page) => sum + (page.headings?.length || 0), 0)} headings across the crawl.`,
      rows: pages.map((page) => `${page.headings?.length || 0} headings · ${path(page)}`),
    },
    canonicals: {
      summary: `${pages.filter((page) => page.canonical).length} of ${pages.length} declare a canonical.`,
      rows: pages.map((page) => page.canonical || `No canonical · ${path(page)}`),
    },
    language: {
      summary: `${pages.filter((page) => page.lang).length} of ${pages.length} set a language.`,
      rows: pages.map((page) => line(page, page.lang || "missing")),
    },
    viewport: {
      summary: `${pages.filter((page) => page.viewport).length} of ${pages.length} have a viewport tag.`,
      rows: pages.map((page) => line(page, page.viewport ? "present" : "missing")),
    },
    "duplicate-titles": {
      summary: `${dupes(pages.map((page) => (page.title || "").trim().toLowerCase())).length} titles repeat.`,
      rows: dupes(pages.map((page) => (page.title || "").trim())).map(([title, count]) => `${count} pages · ${title}`),
    },
    "duplicate-metas": {
      summary: `${dupes(pages.map((page) => (page.metaDescription || "").trim().toLowerCase())).length} meta descriptions repeat.`,
      rows: dupes(pages.map((page) => (page.metaDescription || "").trim())).map(([meta, count]) => `${count} pages · ${meta.slice(0, 140)}`),
    },
    "open-graph": {
      summary: `${pages.filter((page) => page.ogTitle).length} of ${pages.length} publish og:title.`,
      rows: pages.map((page) => page.ogTitle || `No og:title · ${path(page)}`),
    },
    words: {
      summary: `${pages.reduce((sum, page) => sum + (page.wordCount || 0), 0)} words in the crawled main content.`,
      rows: pages.map((page) => `${page.wordCount || 0} words · ${path(page)}`),
    },
    opening: {
      summary: `${pages.filter((page) => (page.firstParagraph || "").length >= 80).length} pages open with a paragraph of at least 80 characters.`,
      rows: pages.map((page) => `${(page.firstParagraph || "").length} characters · ${path(page)}`),
    },
    questions: {
      summary: `${pages.reduce((sum, page) => sum + (page.questionHeadings || 0), 0)} question headings.`,
      rows: pages.map((page) => `${page.questionHeadings || 0} · ${path(page)}`),
    },
    lists: {
      summary: `${pages.reduce((sum, page) => sum + (page.lists || 0), 0)} lists.`,
      rows: pages.map((page) => `${page.lists || 0} · ${path(page)}`),
    },
    tables: {
      summary: `${pages.reduce((sum, page) => sum + (page.tables || 0), 0)} tables.`,
      rows: pages.map((page) => `${page.tables || 0} · ${path(page)}`),
    },
    schema: {
      summary: `${pages.filter((page) => page.schemaTypes?.length).length} pages include JSON-LD.`,
      rows: pages.map((page) => (page.schemaTypes || []).join(", ") || `No schema · ${path(page)}`),
    },
    "author-date": {
      summary: `${pages.filter((page) => page.hasAuthor).length} name an author. ${pages.filter((page) => page.hasDate).length} show a date.`,
      rows: pages.map((page) => `${page.hasAuthor ? "author" : "no author"}, ${page.hasDate ? "date" : "no date"} · ${path(page)}`),
    },
    "about-contact": {
      summary: `${pages.some((page) => page.hasAbout) ? "An about link was found." : "No about link was found."} ${pages.some((page) => page.hasContact) ? "A contact link was found." : "No contact link was found."}`,
      rows: [],
    },
    internal: {
      summary: `${pages.reduce((sum, page) => sum + (page.links?.internal || 0), 0)} internal links.`,
      rows: pages.map((page) => `${page.links?.internal || 0} · ${path(page)}`),
    },
    external: {
      summary: `${pages.reduce((sum, page) => sum + (page.links?.external || 0), 0)} external links.`,
      rows: pages.map((page) => `${page.links?.external || 0} · ${path(page)}`),
    },
    citations: {
      summary: `${new Set(pages.flatMap((page) => page.links?.authorityHosts || [])).size} authority hosts cited.`,
      rows: [...new Set(pages.flatMap((page) => page.links?.authorityHosts || []))],
    },
    alt: {
      summary: `${pages.reduce((sum, page) => sum + (page.images?.missingAlt || 0), 0)} images are missing alt text, out of ${pages.reduce((sum, page) => sum + (page.images?.total || 0), 0)}.`,
      rows: pages.map((page) => `${page.images?.missingAlt || 0} missing of ${page.images?.total || 0} · ${path(page)}`),
    },
    nofollow: {
      summary: pages.some((page) => page.links && "nofollow" in page.links)
        ? `${pages.reduce((sum, page) => sum + (page.links?.nofollow || 0), 0)} nofollow links.`
        : "This crawl did not store nofollow. Recrawl to count them.",
      rows: pages.filter((page) => page.links && "nofollow" in page.links).map((page) => `${page.links.nofollow} · ${path(page)}`),
    },
    time: {
      summary: pages.length ? `Fastest ${Math.min(...pages.map((page) => page.ms || 0))} ms. Slowest ${Math.max(...pages.map((page) => page.ms || 0))} ms.` : "No pages fetched.",
      rows: pages.map((page) => `${page.ms || 0} ms · ${path(page)}`),
    },
    weight: {
      summary: `${pages.reduce((sum, page) => sum + (page.htmlBytes || 0), 0)} bytes of HTML across the crawl.`,
      rows: pages.map((page) => `${Math.round((page.htmlBytes || 0) / 1024)} KB · ${path(page)}`),
    },
    headers: {
      summary: `${pages.filter((page) => page.headers?.hsts).length} send HSTS. ${pages.filter((page) => page.headers?.nosniff).length} send nosniff.`,
      rows: pages.map((page) => {
        const names = ["hsts", "csp", "xfo", "nosniff"].filter((key) => page.headers?.[key]);
        return `${names.join(", ") || "none recorded"} · ${path(page)}`;
      }),
    },
    dimensions: {
      summary: pages.some((page) => page.assets)
        ? `${pages.reduce((sum, page) => sum + (page.assets?.imagesMissingDimensions || 0), 0)} images have no width and height.`
        : "This crawl did not store image dimensions. Recrawl to count them.",
      rows: pages.filter((page) => page.assets).map((page) => `${page.assets.imagesMissingDimensions || 0} · ${path(page)}`),
    },
    keywords: {
      summary: `${insights?.keywords?.length || 0} keyword ideas. ${(insights?.keywords || []).filter((row) => !row.yourPages).length} are not covered by the crawl.`,
      rows: (insights?.keywords || []).slice(0, 8).map((row) => row.phrase || row.term || row.keyword || row.query),
    },
    striking: {
      summary: `${insights?.striking?.length || 0} striking-distance queries in the Search Console import.`,
      rows: (insights?.striking || []).slice(0, 8).map((row) => `${row.query || row.key} · position ${row.position}`),
    },
    gsc: {
      summary: `${project?.gsc?.queries?.length || 0} queries imported.`,
      rows: [`${insights?.gsc?.clicks ?? 0} clicks`, `${insights?.gsc?.impressions ?? 0} impressions`],
    },
    analytics: {
      summary: `${insights?.urlMap?.counts?.views ?? 0} Analytics views joined to the URL map.`,
      rows: (insights?.urlMap?.folders || []).filter((folder) => folder.views).slice(0, 8).map((folder) => `${folder.folder} · ${folder.views} views`),
    },
    competitors: {
      summary: `${project?.competitors?.length || 0} competitor hosts.`,
      rows: (project?.competitors || []).map((item) => `${item.host} · ${item.pages?.length || 0} pages`),
    },
    prompts: {
      summary: `${project?.prompts?.length || 0} prompts saved.`,
      rows: (project?.prompts || []).slice(0, 8).map((item) => item.text),
    },
    drafts: {
      summary: `${project?.drafts?.length || 0} drafts saved.`,
      rows: (project?.drafts || []).slice(0, 8).map((item) => item.keyword || item.title || "Draft"),
    },
    traffic: {
      summary: `${insights?.gsc?.clicks || 0} Search Console clicks, ${insights?.urlMap?.counts?.views || 0} Analytics views, ${insights?.aiTraffic?.total || 0} AI referrals. Total site visits are not estimated.`,
      rows: [
        ...(insights?.aiTraffic?.sources || []).map((row) => `${row.source}: ${row.count}`),
      ],
    },
    technology: {
      summary: (project?.intel?.tech || []).length
        ? (project.intel.tech || []).map((item) => (typeof item === "string" ? item : `${item.category}: ${item.name}`)).join(" · ")
        : "Run intel to read the homepage technology.",
      rows: [],
    },
  };
}

export function runTools(project, insights) {
  const pages = pagesOf(project);
  const results = summarize(pages, project, insights);
  return toolCatalog.map((tool) => ({
    ...tool,
    summary: pages.length || ["keywords", "striking", "gsc", "analytics", "competitors", "prompts", "drafts", "sitemap", "traffic", "technology"].includes(tool.id)
      ? results[tool.id].summary
      : "Crawl a site to run this check.",
    rows: (results[tool.id].rows || []).filter(Boolean).slice(0, 8),
  }));
}
