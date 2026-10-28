function issue(severity, category, title, detail, fix) {
  return { severity, category, title, detail, fix };
}

function statusOf(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

export function scorePage(page) {
  const issues = [];
  if (page.error) {
    issues.push(issue("critical", "technical", "Page could not be fetched", page.error, "Confirm the URL returns HTML to a browser and is not blocking the crawler."));
    return { seo: 0, geo: 0, eeat: 0, technical: 0, onpage: 0, content: 0, issues, status: "poor" };
  }

  let technical = 100;
  let onpage = 100;
  let content = 100;
  let geo = 0;
  let eeat = 0;

  if (page.status && page.status >= 400) {
    technical -= 45;
    issues.push(issue("critical", "technical", `HTTP ${page.status}`, page.finalUrl || page.url, "Restore a 200 response or fix the redirect target before any other SEO work."));
  }
  if (!page.https) {
    technical -= 20;
    issues.push(issue("critical", "technical", "Not served over HTTPS", page.url, "Redirect HTTP to HTTPS and mark the HTTPS URL as canonical."));
  }
  if ((page.ms || 0) > 2500) {
    technical -= 12;
    issues.push(issue("warning", "technical", "Slow HTML response", `Document arrived in ${page.ms}ms.`, "Reduce server time to first byte. AI and Google both favor pages that answer quickly."));
  } else if ((page.ms || 0) > 1200) {
    technical -= 6;
  }
  if ((page.htmlBytes || 0) > 250000) {
    technical -= 8;
    issues.push(issue("warning", "technical", "Heavy HTML document", `${Math.round(page.htmlBytes / 1024)} KB before assets.`, "Ship less HTML. Large documents are harder for answer engines to extract."));
  }
  if (!page.lang) {
    technical -= 5;
    issues.push(issue("warning", "technical", "Missing language", "The html element has no lang attribute.", "Set lang so search and AI systems know which language the answer is in."));
  }
  if (!page.viewport) {
    technical -= 10;
    issues.push(issue("warning", "technical", "Missing viewport", "No mobile viewport meta tag.", "Add a viewport meta tag. Mobile-first indexing still applies to AI-cited pages."));
  }
  const robots = (page.robots || "").toLowerCase();
  if (robots.includes("noindex")) {
    technical -= 30;
    issues.push(issue("critical", "technical", "Page is noindex", page.robots, "Remove noindex if this page should earn Google or AI citations."));
  }
  if (!page.canonical) {
    technical -= 8;
    issues.push(issue("warning", "technical", "Missing canonical", "No rel=canonical was found.", "Add a self-referencing canonical so duplicates do not split the citation."));
  }
  const headerKeys = Object.values(page.headers || {}).filter(Boolean).length;
  if (headerKeys < 2) {
    technical -= 4;
  }

  const title = page.title || "";
  if (!title) {
    onpage -= 25;
    issues.push(issue("critical", "on-page", "Missing title", "The document has no title element.", "Write a specific title that states the entity and the answer, around 50–60 characters."));
  } else if (title.length < 20 || title.length > 65) {
    onpage -= 8;
    issues.push(issue("warning", "on-page", "Title length is off", `${title.length} characters: “${title.slice(0, 90)}”`, "Aim for 45–60 characters with the primary query near the front."));
  }
  const meta = page.metaDescription || "";
  if (!meta) {
    onpage -= 12;
    issues.push(issue("warning", "on-page", "Missing meta description", "Search results will rewrite the snippet, often poorly.", "Write 140–160 characters that answer the query and include a concrete detail."));
  } else if (meta.length < 70 || meta.length > 170) {
    onpage -= 5;
    issues.push(issue("opportunity", "on-page", "Meta description length", `${meta.length} characters.`, "Tighten it to 140–160 characters so Google and AI overviews can lift a clean summary."));
  }
  if (!page.h1?.length) {
    onpage -= 18;
    issues.push(issue("critical", "on-page", "Missing H1", "No H1 was found.", "Use one H1 that matches the search intent of the title."));
  } else if (page.h1.length > 1) {
    onpage -= 8;
    issues.push(issue("warning", "on-page", "Multiple H1s", page.h1.slice(0, 3).join(" · "), "Keep a single H1 so the page has one primary answer."));
  }
  let lastLevel = 0;
  for (const heading of page.headings || []) {
    const level = Number(heading.tag.replace("h", ""));
    if (lastLevel && level > lastLevel + 1) {
      onpage -= 6;
      issues.push(issue("warning", "on-page", "Heading level skipped", `${heading.tag.toUpperCase()} follows H${lastLevel}: ${heading.text}`, "Nest headings in order so outline extractors can map the page."));
      break;
    }
    lastLevel = level;
  }
  if (page.images?.total >= 3 && page.images.missingAlt / page.images.total > 0.3) {
    onpage -= 8;
    issues.push(issue("warning", "on-page", "Images missing alt text", `${page.images.missingAlt} of ${page.images.total} images have empty alt text.`, "Describe informational images. Leave alt empty only for decorative ones."));
  }
  if (!page.ogTitle) {
    onpage -= 3;
  }

  const words = page.wordCount || 0;
  if (words < 150) {
    content -= 30;
    issues.push(issue("critical", "content", "Thin content", `${words} words in the main text.`, "Expand the page with a direct answer, evidence, and the questions searchers ask next."));
  } else if (words < 400) {
    content -= 12;
    issues.push(issue("warning", "content", "Light content", `${words} words.`, "Add examples, criteria, or a table so the page can stand alone as a citation."));
  }
  if ((page.links?.internal || 0) < 2 && words > 400) {
    content -= 8;
    issues.push(issue("warning", "content", "Few internal links", "Fewer than two internal links on a substantial page.", "Link to the related pages that should share this topic's authority."));
  }
  if (!page.schemaTypes?.length) {
    content -= 8;
    issues.push(issue("opportunity", "content", "No structured data", "No JSON-LD schema was detected.", "Add Article plus FAQ or HowTo schema that matches the visible content."));
  }

  const first = page.firstParagraph || "";
  const firstWords = first.split(/\s+/).filter(Boolean).length;
  const welcome = /^(welcome|in this article|this (page|guide|post)|click here)/i.test(first);
  if (first && firstWords >= 20 && firstWords <= 90 && !welcome) geo += 22;
  else {
    issues.push(issue("opportunity", "geo", "Weak answer-first paragraph", first ? `Opening paragraph is ${firstWords} words.` : "No substantial opening paragraph.", "Open with a 25–70 word BLUF: the answer, who it is for, and one proof point."));
  }
  if ((page.questionHeadings || 0) > 0) geo += 14;
  else issues.push(issue("opportunity", "geo", "No question headings", "Answer engines lift sections phrased as questions.", "Add H2s that match the questions people ask AI about this topic."));
  if ((page.lists || 0) > 0) geo += 12;
  else issues.push(issue("opportunity", "geo", "No lists", "Scannable steps and criteria are easy to cite.", "Turn process or criteria sections into bullet lists."));
  if ((page.tables || 0) > 0) geo += 10;
  else issues.push(issue("opportunity", "geo", "No table", "Comparison and spec tables are frequently quoted.", "Add one table for criteria, steps, or alternatives."));
  if (page.schemaTypes?.some((type) => /faq|howto|article|product|organization/i.test(type))) geo += 14;
  else geo += page.schemaTypes?.length ? 6 : 0;
  if (page.links?.authorityHosts?.length) geo += 14;
  else issues.push(issue("opportunity", "geo", "No authoritative citations", "The page does not link to primary or reference sources.", "Cite original sources. AI answers prefer pages that show their evidence."));
  if ((page.headings || []).length >= 3) geo += 8;
  if (/\d/.test(first) || /\b(is|are|means|costs|takes)\b/i.test(first)) geo += 6;

  if (page.hasAuthor) eeat += 25;
  else issues.push(issue("opportunity", "eeat", "No visible author", "No author meta, byline, or author schema.", "Name a real author and link to a bio with relevant experience."));
  if (page.hasDate) eeat += 20;
  else issues.push(issue("opportunity", "eeat", "No publish date", "No datePublished or time element.", "Show a published and updated date so answers can judge freshness."));
  if (page.hasAbout) eeat += 15;
  else issues.push(issue("opportunity", "eeat", "No about link", "Crawled links did not include an about or team page.", "Link to an about page that states who is responsible for the site."));
  if (page.hasContact) eeat += 10;
  if (page.links?.authorityHosts?.length) eeat += 15;
  if (page.schemaTypes?.some((type) => /organization|person|author/i.test(type))) eeat += 15;
  if (words > 600) eeat += 5;

  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  technical = clamp(technical);
  onpage = clamp(onpage);
  content = clamp(content);
  geo = clamp(geo);
  eeat = clamp(eeat);
  const seo = clamp(onpage * 0.4 + technical * 0.3 + content * 0.3);

  return { seo, geo, eeat, technical, onpage, content, issues, status: statusOf(seo) };
}
