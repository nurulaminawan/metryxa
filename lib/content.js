import { clip, formatTarget, intentOf, tokens } from "./words.js";

export function fanOut(seed) {
  const topic = String(seed || "").replace(/\?$/, "").trim();
  const patterns = [
    `what is ${topic}`,
    `how ${topic} works`,
    `how to ${topic}`,
    `why ${topic} matters`,
    `${topic} examples`,
    `${topic} checklist`,
    `${topic} statistics`,
    `${topic} mistakes`,
    `best ${topic}`,
    `${topic} vs alternatives`,
    `${topic} template`,
    `${topic} for beginners`,
  ];
  const seen = new Set();
  const out = [];
  for (const prompt of [topic, ...patterns]) {
    const key = prompt.toLowerCase();
    const words = key.split(/\s+/);
    const repeated = words.some((word, index) => index > 0 && word === words[index - 1]);
    if (seen.has(key) || prompt.length < 4 || repeated) continue;
    if (topic.toLowerCase().includes(key) && prompt !== topic) continue;
    seen.add(key);
    out.push({
      text: prompt,
      intent: intentOf(prompt),
      format: formatTarget(prompt),
    });
  }
  return out.slice(0, 12);
}

function jsonLd(keyword, description, questions) {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.slice(0, 4).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: keyword,
    description,
    author: { "@type": "Person", name: "Replace with the real author" },
    dateModified: new Date().toISOString().slice(0, 10),
  };
  return `${JSON.stringify(article, null, 2)}\n\n${JSON.stringify(faq, null, 2)}`;
}

export function buildDraft({ keyword, page, gaps = [], sources = [], related = [] }) {
  const topic = keyword || page?.h1?.[0] || page?.title || "Untitled topic";
  const intent = intentOf(topic);
  const format = formatTarget(topic);
  const evidence = page?.firstParagraph ? clip(page.firstParagraph, 320) : "";
  const missing = gaps.slice(0, 6);
  const title = topic.length > 58 ? topic.slice(0, 58).trim() : topic;
  const meta = clip(
    evidence ||
      `${title} explained with the criteria, proof, and comparison points answer engines can cite.`,
    155
  );
  const questions = [
    { q: `What is ${topic}?`, a: evidence || `Define ${topic} in one sentence, then name who it is for and the outcome it changes.` },
    { q: `How do you do ${topic} well?`, a: missing[0] ? `Cover ${missing[0]}, which competing pages already explain and this page does not.` : `List the steps in the order a practitioner actually performs them.` },
    { q: `What evidence should a page about ${topic} cite?`, a: sources[0] ? `Competitors cite ${sources.slice(0, 3).join(", ")}. Use primary sources, not only their articles.` : "Link to the original study, documentation, or dataset behind each claim." },
    { q: `What should you avoid with ${topic}?`, a: "Name the common mistake, the consequence, and the correction. Specific failures are more citable than generic advice." },
  ];

  const outline = [
    "Answer first",
    ...(missing.length ? missing.map((item) => item.replace(/\b\w/g, (c) => c.toUpperCase())) : ["How it works", "Criteria that matter", "Example"]),
    intent === "commercial" || intent === "transactional" ? "Comparison" : "Proof",
    "FAQ",
  ];

  const lines = [
    `# ${title}`,
    "",
    `**Meta description:** ${meta}`,
    "",
    `**Search intent:** ${intent} · **Format to ship:** ${format}`,
    "",
    "## Answer first",
    "",
    evidence
      ? `Keep this claim, then make it denser: ${evidence}`
      : `${title} is [one-sentence definition]. It matters for [audience] because [specific outcome]. The short version: [the action or answer in under 40 words].`,
    "",
    "## Sections competitors already cover",
    "",
  ];
  if (missing.length) {
    for (const item of missing) lines.push(`- **${item}.** Add a named example, a number, and the condition when this advice changes.`);
  } else {
    lines.push("- No heading gap was found against the crawled competitors. Strengthen proof instead of adding more topics.");
  }
  lines.push("", "## Comparison", "", "| Criterion | What to state | Proof to add |", "| --- | --- | --- |");
  const criteria = missing.slice(0, 3);
  if (!criteria.length) criteria.push("Result", "Time to result", "Who it is for");
  for (const item of criteria) lines.push(`| ${item} | A concrete claim | Source, date, and sample size |`);
  lines.push("", "## FAQ", "");
  for (const item of questions) {
    lines.push(`### ${item.q}`, "", item.a, "");
  }
  if (related.length) {
    lines.push("## Internal links to add", "");
    for (const link of related.slice(0, 6)) lines.push(`- [${link.anchor}](${link.url}) — ${link.reason}`);
    lines.push("");
  }
  if (sources.length) {
    lines.push("## Sources competitors cite that you do not", "");
    for (const source of sources.slice(0, 8)) lines.push(`- ${source}`);
    lines.push("");
  }
  lines.push("## Schema", "", "```json", jsonLd(title, meta, questions), "```", "");
  lines.push("Replace every bracketed slot with a fact you can stand behind. Do not publish the template placeholders.");

  return {
    id: crypto.randomUUID(),
    keyword: topic,
    title,
    meta,
    intent,
    format,
    markdown: lines.join("\n"),
    createdAt: new Date().toISOString(),
    pageUrl: page?.url || "",
  };
}

export function suggestFixes(page) {
  const topic = page?.h1?.[0] || page?.title || "this page";
  const title = clip(topic, 58);
  const current = page?.firstParagraph || "";
  const bluf = current
    ? clip(current, 220)
    : `${title} helps [audience] [do the job] by [mechanism]. Start with [the first step], then measure [the outcome].`;
  return {
    title,
    meta: clip(`${title}: the direct answer, the criteria, and the proof a searcher or AI answer needs.`, 155),
    bluf,
    faqHeading: `What is ${tokens(topic).slice(0, 4).join(" ") || "this"}?`,
  };
}
