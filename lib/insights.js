import { expectedCtr } from "./gsc.js";
import { covers, intentOf, overlapScore, phrases, tokens } from "./words.js";
import { fanOut } from "./content.js";

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function severityRank(severity) {
  return { critical: 0, warning: 1, opportunity: 2 }[severity] ?? 3;
}

export function internalLinkIdeas(pages) {
  const ideas = [];
  for (const source of pages) {
    const hay = `${source.textSample || ""} ${(source.headings || []).map((h) => h.text).join(" ")}`.toLowerCase();
    const linked = new Set(source.links?.internalHrefs || []);
    for (const target of pages) {
      if (target.url === source.url || linked.has(target.url)) continue;
      const anchor = target.h1?.[0] || target.title;
      const parts = tokens(anchor).slice(0, 3);
      if (parts.length < 2) continue;
      if (parts.every((part) => hay.includes(part))) {
        ideas.push({
          source: source.url,
          target: target.url,
          anchor,
          reason: `“${source.title || source.url}” mentions this topic and does not link to it.`,
        });
      }
      if (ideas.length >= 25) return ideas;
    }
  }
  return ideas;
}

function keywordRows(project) {
  const counts = new Map();
  const bump = (phrase, amount, field) => {
    if (!phrase || phrase.split(" ").length > 3) return;
    const current = counts.get(phrase) || { phrase, weight: 0, title: 0, heading: 0 };
    current.weight += amount;
    current[field] += amount;
    counts.set(phrase, current);
  };
  for (const page of project.pages || []) {
    for (const [phrase, weight] of phrases(page.title, 4)) bump(phrase, weight, "title");
    for (const [phrase, weight] of phrases((page.h1 || []).join(" "), 4)) bump(phrase, weight, "heading");
    for (const heading of page.headings || []) {
      for (const [phrase, weight] of phrases(heading.text, 3)) bump(phrase, weight, "heading");
    }
  }
  const queries = project.gsc?.queries || [];
  const titles = (project.pages || [])
    .map((page) => tokens(page.title).join(" "))
    .filter(Boolean);
  const inEveryTitle = (phrase) => titles.length >= 3 && titles.every((title) => title.includes(phrase));
  const rows = [];
  const seen = new Set();
  const competitors = (project.competitors || []).flatMap((competitor) => competitor.pages || []);

  const pushRow = (phrase, extra = {}) => {
    const key = phrase.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const yours = (project.pages || []).filter((page) => covers(page, phrase));
    const theirs = competitors.filter((page) => covers(page, phrase));
    const gsc = queries.find((query) => query.key.toLowerCase() === key);
    const ctrGap = gsc && gsc.impressions >= 50 && gsc.ctr < expectedCtr(gsc.position) * 0.6;
    let opportunity = extra.weight ? Math.min(30, extra.weight) : 0;
    if (gsc) opportunity += Math.min(40, Math.log10(gsc.impressions + 1) * 14);
    if (gsc && gsc.position > 3 && gsc.position <= 20) opportunity += (20 - Math.min(gsc.position, 20)) * 1.4;
    if (!yours.length && theirs.length) opportunity += 34;
    if (!yours.length && gsc?.impressions > 20) opportunity += 22;
    if (ctrGap) opportunity += 14;
    rows.push({
      phrase,
      intent: intentOf(phrase),
      yourPages: yours.length,
      theirPages: theirs.length,
      clicks: gsc?.clicks || 0,
      impressions: gsc?.impressions || 0,
      ctr: gsc?.ctr || 0,
      position: gsc?.position || null,
      ctrGap: Boolean(ctrGap),
      opportunity: Math.round(Math.min(100, opportunity)),
      inTitle: extra.title || 0,
    });
  };

  const extracted = [...counts.values()]
    .filter((item) => item.weight >= 6 && (item.phrase.includes(" ") || item.weight >= 10))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 60);
  for (const item of extracted) {
    if (inEveryTitle(item.phrase)) continue;
    pushRow(item.phrase, item);
  }
  for (const query of queries.slice(0, 80)) pushRow(query.key, {});
  return rows.sort((a, b) => b.opportunity - a.opportunity).slice(0, 80);
}

function strikingDistance(queries) {
  return (queries || [])
    .filter((query) => query.position >= 4 && query.position <= 15 && query.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
}

function lowCtr(queries) {
  return (queries || [])
    .filter((query) => query.impressions >= 50 && query.position <= 10 && query.ctr < expectedCtr(query.position) * 0.6)
    .map((query) => ({ ...query, expected: expectedCtr(query.position) }))
    .sort((a, b) => b.impressions * (b.expected - b.ctr) - a.impressions * (a.expected - a.ctr))
    .slice(0, 15);
}

function findCannibals(project) {
  const fromExport = new Map();
  for (const row of project.gsc?.queryPages || []) {
    if (!row.key || !row.page || row.impressions < 5) continue;
    const list = fromExport.get(row.key) || [];
    list.push(row);
    fromExport.set(row.key, list);
  }
  const exported = [];
  for (const [query, rows] of fromExport) {
    const pages = [...new Set(rows.map((row) => row.page))];
    if (pages.length < 2) continue;
    const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    exported.push({
      query,
      impressions,
      position: Math.min(...rows.map((row) => row.position || 99)),
      pages: pages.slice(0, 4),
      source: "Search Console",
    });
  }
  if (exported.length) {
    return exported.sort((a, b) => b.impressions - a.impressions).slice(0, 12);
  }
  const flagged = [];
  for (const query of project.gsc?.queries || []) {
    const matches = (project.pages || []).filter((page) => covers(page, query.key));
    if (matches.length >= 2) {
      flagged.push({
        query: query.key,
        impressions: query.impressions,
        position: query.position,
        pages: matches.map((page) => page.url).slice(0, 4),
        source: "Crawl coverage",
      });
    }
  }
  return flagged.slice(0, 12);
}

function topicGaps(project) {
  const yours = new Set();
  for (const page of project.pages || []) {
    for (const heading of page.headings || []) {
      if (heading.tag === "h2" || heading.tag === "h3") yours.add(heading.text.toLowerCase());
    }
  }
  const gaps = [];
  for (const competitor of project.competitors || []) {
    for (const page of competitor.pages || []) {
      for (const heading of page.headings || []) {
        if (heading.tag !== "h2" && heading.tag !== "h3") continue;
        const key = heading.text.toLowerCase();
        if (yours.has(key) || key.length < 8) continue;
        if (gaps.some((gap) => gap.heading.toLowerCase() === key)) continue;
        gaps.push({
          heading: heading.text,
          competitor: competitor.host,
          url: page.url,
          geo: page.scores?.geo || 0,
        });
      }
    }
  }
  return gaps.slice(0, 30);
}

function sourceGaps(project) {
  const yours = new Set((project.pages || []).flatMap((page) => page.links?.authorityHosts || []));
  const gaps = [];
  for (const competitor of project.competitors || []) {
    for (const page of competitor.pages || []) {
      for (const host of page.links?.authorityHosts || []) {
        if (yours.has(host) || gaps.includes(host)) continue;
        gaps.push(host);
      }
    }
  }
  return gaps.slice(0, 16);
}

function bestPage(pages, prompt) {
  let best = null;
  let score = 0;
  for (const page of pages || []) {
    const value = overlapScore(prompt, page);
    if (value > score) {
      score = value;
      best = page;
    }
  }
  return { page: best, score };
}

export function promptReport(project) {
  const competitorPages = (project.competitors || []).flatMap((competitor) =>
    (competitor.pages || []).map((page) => ({ ...page, competitor: competitor.host }))
  );
  return (project.prompts || []).map((prompt) => {
    const variations = fanOut(prompt.text).map((item) => {
      const yours = bestPage(project.pages, item.text);
      const theirs = bestPage(competitorPages, item.text);
      let winner = "uncovered";
      if (yours.score >= 0.34 && yours.score >= theirs.score) winner = "you";
      else if (theirs.score >= 0.34) winner = "competitor";
      return {
        ...item,
        yours: yours.score,
        theirs: theirs.score,
        yourUrl: yours.page?.url || "",
        theirUrl: theirs.page?.url || "",
        theirHost: theirs.page?.competitor || "",
        winner,
      };
    });
    const covered = variations.filter((item) => item.winner === "you").length;
    return {
      ...prompt,
      variations,
      coverage: variations.length ? Math.round((covered / variations.length) * 100) : 0,
    };
  });
}

function positionDelta(project) {
  const imports = project.gsc?.imports || [];
  if (imports.length < 2) return [];
  const previous = new Map(imports[imports.length - 2].queries.map((row) => [row.key, row.position]));
  const latest = imports[imports.length - 1].queries;
  return latest
    .map((row) => {
      const before = previous.get(row.key);
      if (before == null) return null;
      return { ...row, before, delta: Number((before - row.position).toFixed(2)) };
    })
    .filter((row) => row && Math.abs(row.delta) >= 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 12);
}

function duplicates(pages) {
  const titles = new Map();
  const metas = new Map();
  for (const page of pages || []) {
    if (page.title) {
      const list = titles.get(page.title) || [];
      list.push(page.url);
      titles.set(page.title, list);
    }
    if (page.metaDescription) {
      const list = metas.get(page.metaDescription) || [];
      list.push(page.url);
      metas.set(page.metaDescription, list);
    }
  }
  const rows = [];
  for (const [title, urls] of titles) if (urls.length > 1) rows.push({ type: "title", value: title, urls });
  for (const [meta, urls] of metas) if (urls.length > 1) rows.push({ type: "meta", value: meta, urls });
  return rows.slice(0, 12);
}

function topicalMap(keywords) {
  const pillars = new Map();
  for (const keyword of keywords) {
    const head = tokens(keyword.phrase)[0];
    if (!head) continue;
    const bucket = pillars.get(head) || { name: head, keywords: [], opportunity: 0, impressions: 0 };
    bucket.keywords.push(keyword);
    bucket.opportunity += keyword.opportunity;
    bucket.impressions += keyword.impressions;
    pillars.set(head, bucket);
  }
  return [...pillars.values()]
    .filter((pillar) => pillar.keywords.length >= 2)
    .map((pillar) => ({
      ...pillar,
      keywords: pillar.keywords.slice(0, 8),
      opportunity: Math.round(pillar.opportunity / pillar.keywords.length),
    }))
    .sort((a, b) => b.impressions + b.opportunity - (a.impressions + a.opportunity))
    .slice(0, 8);
}

function aiTrafficSummary(events) {
  const sources = {};
  for (const event of events || []) {
    sources[event.source] = (sources[event.source] || 0) + 1;
  }
  const pages = {};
  for (const event of events || []) {
    pages[event.url] = (pages[event.url] || 0) + 1;
  }
  return {
    total: events?.length || 0,
    sources: Object.entries(sources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    pages: Object.entries(pages)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

function competitorBoard(project) {
  const yours = project.pages || [];
  return (project.competitors || []).map((competitor) => {
    const pages = competitor.pages || [];
    return {
      id: competitor.id,
      host: competitor.host,
      url: competitor.url,
      pages: pages.length,
      seo: average(pages.map((page) => page.scores?.seo || 0)),
      geo: average(pages.map((page) => page.scores?.geo || 0)),
      eeat: average(pages.map((page) => page.scores?.eeat || 0)),
      words: average(pages.map((page) => page.wordCount || 0)),
      schema: pages.filter((page) => page.schemaTypes?.length).length,
      yourSeo: average(yours.map((page) => page.scores?.seo || 0)),
      yourGeo: average(yours.map((page) => page.scores?.geo || 0)),
    };
  });
}

export function buildInsights(project) {
  const pages = project.pages || [];
  const indexable = pages.filter((page) => !(page.robots || "").toLowerCase().includes("noindex") && !page.error);
  const rawIssues = [
    ...(project.siteIssues || []),
    ...pages.flatMap((page) => (page.scores?.issues || []).map((item) => ({ ...item, url: page.url }))),
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const allIssues = dedupeIssues(rawIssues);
  const keywords = keywordRows(project);
  const queries = project.gsc?.queries || [];
  const prompts = promptReport(project);
  const coveredPrompts = prompts.filter((prompt) => prompt.coverage >= 50).length;

  return {
    scores: {
      seo: average(indexable.map((page) => page.scores?.seo || 0)),
      geo: average(indexable.map((page) => page.scores?.geo || 0)),
      eeat: average(indexable.map((page) => page.scores?.eeat || 0)),
      technical: average(indexable.map((page) => page.scores?.technical || 0)),
    },
    counts: {
      pages: pages.length,
      indexable: indexable.length,
      issues: allIssues.length,
      critical: allIssues.filter((item) => item.severity === "critical").length,
      words: average(indexable.map((page) => page.wordCount || 0)),
    },
    gsc: {
      clicks: queries.reduce((sum, row) => sum + row.clicks, 0),
      impressions: queries.reduce((sum, row) => sum + row.impressions, 0),
      queries: queries.length,
      importedAt: project.gsc?.imports?.at?.(-1)?.importedAt || null,
    },
    topIssues: allIssues.slice(0, 12),
    keywords,
    striking: strikingDistance(queries),
    lowCtr: lowCtr(queries),
    cannibalization: findCannibals(project),
    movement: positionDelta(project),
    topicGaps: topicGaps(project),
    sourceGaps: sourceGaps(project),
    prompts,
    promptCoverage: prompts.length ? Math.round(prompts.reduce((sum, prompt) => sum + prompt.coverage, 0) / prompts.length) : 0,
    coveredPrompts,
    internalLinks: internalLinkIdeas(pages),
    duplicates: duplicates(pages),
    topical: topicalMap(keywords),
    aiTraffic: aiTrafficSummary(project.aiTraffic || []),
    competitors: competitorBoard(project),
    brand: brandSignals(project),
    hasRobots: Boolean(project.hasRobots),
    hasSitemap: Boolean(project.hasSitemap),
  };
}

function dedupeIssues(issues) {
  const grouped = new Map();
  for (const item of issues) {
    const key = `${item.severity}|${item.title}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...item, count: 1 });
    } else {
      current.count += 1;
      if (!current.url && item.url) current.url = item.url;
    }
  }
  return [...grouped.values()].map((item) =>
    item.count > 1
      ? { ...item, detail: `${item.detail} Seen on ${item.count} crawled pages.` }
      : item
  );
}

function brandSignals(project) {
  const terms = (project.brandTerms || []).map((term) => term.toLowerCase()).filter((term) => term.length > 1);
  const hit = (page) => {
    const hay = `${page.title || ""} ${(page.h1 || []).join(" ")} ${page.firstParagraph || ""}`.toLowerCase();
    return terms.some((term) => hay.includes(term));
  };
  return {
    terms,
    pages: terms.length ? (project.pages || []).filter(hit).length : 0,
    competitorMentions: terms.length
      ? (project.competitors || []).flatMap((competitor) => competitor.pages || []).filter(hit).length
      : 0,
  };
}

export function classifyAiSource(ref, utm) {
  const hay = `${ref || ""} ${utm || ""}`.toLowerCase();
  if (/chatgpt|openai|chat\.openai/.test(hay)) return "ChatGPT";
  if (/perplexity/.test(hay)) return "Perplexity";
  if (/gemini|bard/.test(hay)) return "Gemini";
  if (/claude|anthropic/.test(hay)) return "Claude";
  if (/copilot\.microsoft|edgeservices/.test(hay)) return "Copilot";
  if (/grok|x\.ai/.test(hay)) return "Grok";
  if (/you\.com|phind|meta\.ai|poe\.com/.test(hay)) return "Other AI";
  return "";
}
