export const STOP = new Set(`
a about above after again against all am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have
having he her here hers herself him himself his how i if in into is it its itself just me more most
my myself no nor not of off on once only or other our ours ourselves out over own same she should so
some such than that the their theirs them themselves then there these they this those through to too
under until up very was we were what when where which while who whom why will with you your yours
yourself yourselves www http https com org net html www2 also than into within without using used use
get got one two three new like just may much many per via etc
`.trim().split(/\s+/));

export function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((word) => word.length > 2 && !STOP.has(word) && !/^\d+$/.test(word));
}

export function phrases(text, weight = 1) {
  const words = tokens(text);
  const counts = new Map();
  const add = (phrase) => {
    if (!phrase || phrase.length < 3) return;
    counts.set(phrase, (counts.get(phrase) || 0) + weight);
  };
  for (const word of words) add(word);
  for (let i = 0; i < words.length - 1; i++) add(`${words[i]} ${words[i + 1]}`);
  for (let i = 0; i < words.length - 2; i++) add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return counts;
}

export function intentOf(query) {
  const s = String(query || "").toLowerCase();
  if (/\b(buy|price|pricing|coupon|discount|deal|order|download|hire|quote|near me|cheap)\b/.test(s)) {
    return "transactional";
  }
  if (/\b(best|top|review|reviews|vs|versus|alternative|compare|comparison)\b/.test(s)) {
    return "commercial";
  }
  if (/\b(login|log in|signin|sign in|official|dashboard)\b/.test(s)) return "navigational";
  return "informational";
}

export function formatTarget(query) {
  const s = String(query || "").toLowerCase();
  if (/\b(vs|versus|compare|comparison|alternative)\b/.test(s)) return "Comparison table";
  if (/^(how|what|why|when|where|who|can|does|do|is|are|should|which)\b/.test(s) || s.includes("?")) {
    return "Direct answer + FAQ";
  }
  if (/\b(best|top|tools|software)\b/.test(s)) return "List with criteria";
  if (/\b(template|checklist|examples|statistics|stats)\b/.test(s)) return "Scannable evidence";
  return "BLUF article";
}

export function wordCount(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function covers(page, query) {
  const hay = [
    page.title,
    ...(page.h1 || []),
    ...(page.headings || []).map((h) => h.text),
  ]
    .join(" ")
    .toLowerCase();
  const q = String(query || "").toLowerCase().trim();
  if (!q || !hay) return false;
  if (hay.includes(q)) return true;
  const parts = tokens(q);
  if (parts.length < 2) return false;
  return parts.every((part) => hay.includes(part));
}

export function overlapScore(query, page) {
  const q = tokens(query);
  if (!q.length || !page) return 0;
  const weighted = [
    [page.title, 4],
    [(page.h1 || []).join(" "), 4],
    [(page.headings || []).map((h) => h.text).join(" "), 3],
    [page.firstParagraph, 2],
    [page.textSample, 1],
  ];
  let hits = 0;
  for (const part of q) {
    let best = 0;
    for (const [text, weight] of weighted) {
      if (String(text || "").toLowerCase().includes(part)) best = Math.max(best, weight);
    }
    hits += best;
  }
  return hits / (q.length * 4);
}

export function clip(text, max = 280) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}
