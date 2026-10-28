const AGENT = "MetryxaBot/1.0 (+https://metryxa.com; SEO GEO research)";

const AI_BOTS = [
  ["GPTBot", "ChatGPT search"],
  ["ChatGPT-User", "ChatGPT browsing"],
  ["OAI-SearchBot", "OpenAI search"],
  ["Google-Extended", "Gemini training"],
  ["Googlebot", "Google"],
  ["Bingbot", "Bing"],
  ["PerplexityBot", "Perplexity"],
  ["ClaudeBot", "Claude"],
  ["Applebot-Extended", "Apple intelligence"],
  ["CCBot", "Common Crawl"],
  ["Bytespider", "Bytespider"],
  ["Amazonbot", "Alexa / Amazon"],
  ["FacebookBot", "Meta"],
  ["meta-externalagent", "Meta AI"],
];

const TECH = [
  [/wp-content|wp-includes|wordpress/i, "WordPress"],
  [/cdn\.shopify|myshopify\.com/i, "Shopify"],
  [/webflow\.com|data-wf-/i, "Webflow"],
  [/squarespace/i, "Squarespace"],
  [/wix\.com|wixstatic/i, "Wix"],
  [/__NEXT_DATA__|_next\/static/i, "Next.js"],
  [/nuxt|_nuxt\//i, "Nuxt"],
  [/googletagmanager\.com\/gtm/i, "Google Tag Manager"],
  [/gtag\/js|google-analytics\.com|G-[A-Z0-9]{6,}/, "Google Analytics"],
  [/connect\.facebook\.net|fbevents\.js/i, "Meta Pixel"],
  [/hotjar\.com/i, "Hotjar"],
  [/hs-scripts\.com|js\.hs-analytics/i, "HubSpot"],
  [/klaviyo/i, "Klaviyo"],
  [/widget\.intercom\.io/i, "Intercom"],
  [/js\.stripe\.com/i, "Stripe"],
  [/recaptcha/i, "reCAPTCHA"],
  [/cdn\.jsdelivr\.net\/npm\/bootstrap/i, "Bootstrap"],
];

async function getText(url, ms = 12000) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": AGENT, accept: "application/json,text/plain,text/html,*/*" },
    signal: AbortSignal.timeout(ms),
  });
  const text = (await response.text()).slice(0, 1_200_000);
  return { ok: response.ok, status: response.status, text, headers: response.headers, finalUrl: response.url };
}

export function parseSuggest(payload) {
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!Array.isArray(data)) return [];
  const list = Array.isArray(data[1]) ? data[1] : data;
  return list
    .map((item) => (typeof item === "string" ? item : item?.phrase || ""))
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 2 && item.length < 90);
}

export function parseAiCrawlers(robotsText) {
  const groups = [];
  let current = null;
  for (const raw of String(robotsText || "").split(/\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line || !line.includes(":")) continue;
    const key = line.slice(0, line.indexOf(":")).trim().toLowerCase();
    const value = line.slice(line.indexOf(":") + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "disallow" || key === "allow") && current) {
      current.rules.push({ type: key, value });
    }
  }
  return AI_BOTS.map(([bot, label]) => {
    const specific = groups.filter((group) => group.agents.includes(bot.toLowerCase()));
    const star = groups.filter((group) => group.agents.includes("*"));
    const chosen = specific.length ? specific : star;
    const rules = chosen.flatMap((group) => group.rules);
    const blocked = rules.some((rule) => rule.type === "disallow" && rule.value === "/");
    const partial = rules.some((rule) => rule.type === "disallow" && rule.value && rule.value !== "/");
    let access = "allowed";
    if (blocked) access = "blocked";
    else if (partial) access = "partial";
    else if (!robotsText) access = "unknown";
    return { bot, name: label, access, named: specific.length > 0 };
  });
}

export function detectTech(html, headers = {}) {
  const found = new Set();
  const sample = String(html || "").slice(0, 400_000);
  for (const [pattern, name] of TECH) if (pattern.test(sample)) found.add(name);
  const server = headers.server || headers.get?.("server") || "";
  const powered = headers.powered || headers.get?.("x-powered-by") || "";
  if (/cloudflare/i.test(server) || headers.cf) found.add("Cloudflare");
  if (/nginx/i.test(server)) found.add("nginx");
  if (/apache/i.test(server)) found.add("Apache");
  if (powered) found.add(String(powered).slice(0, 40));
  const generator = sample.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
  if (generator) found.add(generator[1].slice(0, 60));
  return [...found];
}

function stamp(value) {
  const digits = String(value || "");
  if (digits.length < 8) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

async function suggestOne(source, url) {
  const response = await getText(url, 8000);
  if (!response.ok) return [];
  return parseSuggest(response.text).slice(0, 8).map((text) => ({ text, source }));
}

async function keywordSpy(seed) {
  const q = encodeURIComponent(seed);
  const jobs = [
    ["Google", `https://suggestqueries.google.com/complete/search?client=firefox&q=${q}`],
    ["Bing", `https://api.bing.com/osjson.aspx?query=${q}`],
    ["DuckDuckGo", `https://duckduckgo.com/ac/?q=${q}&type=list`],
    ["YouTube", `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${q}`],
  ];
  const modifiers = [`how ${seed}`, `what is ${seed}`, `${seed} vs`];
  if (!/^best\b/i.test(seed)) modifiers.push(`best ${seed}`);
  for (const modifier of modifiers) {
    jobs.push(["Google", `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(modifier)}`]);
  }
  const settled = await Promise.allSettled(jobs.map(([source, url]) => suggestOne(source, url)));
  const map = new Map();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const idea of result.value) {
      const key = idea.text.toLowerCase();
      if (key === seed.toLowerCase()) continue;
      const current = map.get(key) || { text: idea.text, sources: [] };
      if (!current.sources.includes(idea.source)) current.sources.push(idea.source);
      map.set(key, current);
    }
  }
  return [...map.values()].slice(0, 40);
}

async function wikipedia(seed) {
  const search = await getText(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(seed)}&limit=1&namespace=0&format=json`,
    8000
  );
  if (!search.ok) return { found: false, error: `Wikipedia HTTP ${search.status}` };
  const parsed = JSON.parse(search.text);
  const title = parsed?.[1]?.[0];
  if (!title) return { found: false };
  const summary = await getText(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, 8000);
  if (!summary.ok) return { found: true, title, url: parsed?.[3]?.[0] || "" };
  const data = JSON.parse(summary.text);
  return {
    found: true,
    title: data.title || title,
    description: data.description || "",
    extract: String(data.extract || "").slice(0, 420),
    url: data.content_urls?.desktop?.page || parsed?.[3]?.[0] || "",
  };
}

async function wayback(host) {
  const response = await getText(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&output=json&fl=original,timestamp,statuscode&filter=statuscode:200&collapse=urlkey&limit=30`,
    15000
  );
  if (!response.ok) return { error: `Wayback HTTP ${response.status}`, urls: [] };
  const rows = JSON.parse(response.text);
  const body = Array.isArray(rows) ? rows.slice(1) : [];
  const urls = [];
  let oldest = "";
  for (const row of body) {
    const [original, timestamp] = row;
    if (!oldest || timestamp < oldest) oldest = timestamp;
    if (original && urls.length < 12 && !urls.includes(original)) urls.push(original);
  }
  return { count: body.length, oldest: stamp(oldest), urls };
}

async function certificates(host) {
  const response = await getText(`https://crt.sh/?q=${encodeURIComponent(host)}&output=json`, 15000);
  if (!response.ok) return { error: `crt.sh HTTP ${response.status}`, names: [] };
  const data = JSON.parse(response.text);
  const names = new Set();
  for (const row of (Array.isArray(data) ? data : []).slice(0, 250)) {
    for (const part of String(row.name_value || "").split("\n")) {
      const name = part.trim().toLowerCase().replace(/^\*\./, "");
      if (!name || name.includes(" ") || name.includes("@")) continue;
      if (name === host || name.endsWith(`.${host}`)) names.add(name);
    }
  }
  return { names: [...names].slice(0, 24) };
}

async function pageSpeed(url, key) {
  if (!key) {
    return { skipped: true, reason: "Paste a free PageSpeed Insights API key to add lab Core Web Vitals. Google blocks anonymous calls." };
  }
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&key=${encodeURIComponent(key)}`;
  const response = await getText(endpoint, 25000);
  const data = JSON.parse(response.text || "{}");
  if (!response.ok) return { error: data.error?.message || `PageSpeed HTTP ${response.status}` };
  const audits = data.lighthouseResult?.audits || {};
  const categories = data.lighthouseResult?.categories || {};
  const score = (category) => (categories[category]?.score == null ? null : Math.round(categories[category].score * 100));
  return {
    performance: score("performance"),
    seo: score("seo"),
    lcp: audits["largest-contentful-paint"]?.displayValue || "",
    cls: audits["cumulative-layout-shift"]?.displayValue || "",
    tbt: audits["total-blocking-time"]?.displayValue || "",
  };
}

function headerBag(headers) {
  return {
    server: headers.get("server") || "",
    powered: headers.get("x-powered-by") || "",
    cf: Boolean(headers.get("cf-ray")),
  };
}

export async function runIntel({ host, origin, seed, psiKey }) {
  const apex = String(host || "").replace(/^www\./, "");
  const site = origin || `https://${apex}`;
  const errors = [];
  const [suggestions, wiki, archive, certs, robots, llms, ads, home, psi] = await Promise.all([
    keywordSpy(seed).catch((error) => {
      errors.push(error.message);
      return [];
    }),
    wikipedia(seed).catch((error) => ({ found: false, error: error.message })),
    wayback(apex).catch((error) => ({ error: error.message, urls: [] })),
    certificates(apex).catch((error) => ({ error: error.message, names: [] })),
    getText(new URL("/robots.txt", site).toString(), 8000).catch((error) => ({ ok: false, text: "", error: error.message })),
    getText(new URL("/llms.txt", site).toString(), 8000).catch((error) => ({ ok: false, text: "", error: error.message })),
    getText(new URL("/ads.txt", site).toString(), 8000).catch(() => ({ ok: false, text: "" })),
    getText(site, 12000).catch((error) => ({ ok: false, text: "", error: error.message, headers: new Headers() })),
    pageSpeed(site, psiKey).catch((error) => ({ error: error.message })),
  ]);

  const robotsText = robots.ok ? robots.text : "";
  const llmsText = llms.ok ? llms.text.trim() : "";
  return {
    ranAt: new Date().toISOString(),
    seed,
    suggestions,
    wiki,
    wayback: archive,
    subdomains: certs.names || [],
    subdomainError: certs.error || "",
    crawlers: parseAiCrawlers(robotsText),
    robotsFound: Boolean(robots.ok),
    llms: {
      found: Boolean(llms.ok && llmsText.length > 20 && !/^<!doctype html/i.test(llmsText)),
      preview: llmsText.slice(0, 360),
    },
    adsTxt: Boolean(ads.ok && /google|pub-|direct|reseller/i.test(ads.text || "")),
    tech: detectTech(home.text || "", home.headers ? headerBag(home.headers) : {}),
    psi,
    errors,
  };
}
