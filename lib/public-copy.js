export const SITE = "https://metryxa.com";

export const freeTools = [
  { group: "Crawl and audit", name: "Site crawl", detail: "Fetch up to 20 HTML pages and score titles, metas, headings, canonicals, indexation, images, schema, and word count." },
  { group: "Crawl and audit", name: "Sitemap URL map", detail: "Read up to 1,500 sitemap URLs with last-modified dates and roll them up by folder." },
  { group: "Crawl and audit", name: "Robots.txt check", detail: "See whether the site publishes robots.txt and which AI crawlers it allows or blocks." },
  { group: "Crawl and audit", name: "On-page issues", detail: "Each finding has a severity and a fix. The same issue on many pages is grouped once." },
  { group: "Crawl and audit", name: "Topic clusters", detail: "Group pages by lead terms and spot duplicate titles and meta descriptions." },
  { group: "Crawl and audit", name: "Internal links", detail: "Suggest links between crawled pages from the gaps the audit found." },
  { group: "Keywords and rankings", name: "Keyword ideas", detail: "Build ideas from your titles and headings, then mark which ones the crawl already covers." },
  { group: "Keywords and rankings", name: "Search Console import", detail: "Paste a queries or pages export for striking distance, weak click-through, and queries split across two URLs." },
  { group: "Keywords and rankings", name: "Ranking movement", detail: "Compare up to six Search Console imports and see which queries moved." },
  { group: "Keywords and rankings", name: "Autosuggest", detail: "Pull live suggestions from Google, Bing, DuckDuckGo, and YouTube." },
  { group: "Keywords and rankings", name: "Wikipedia entity", detail: "Look up a topic in Wikipedia and keep the summary next to your keyword work." },
  { group: "AEO and GEO", name: "GEO score", detail: "Score an answer-first paragraph, question headings, lists, tables, schema, and citations." },
  { group: "AEO and GEO", name: "E-E-A-T signals", detail: "Check for an author, a date, and about or contact pages on the crawled site." },
  { group: "AEO and GEO", name: "Answer coverage", detail: "Fan one prompt into related questions and see which of your pages overlap each one." },
  { group: "AEO and GEO", name: "AI referral counter", detail: "Count visits that arrive from ChatGPT, Perplexity, Gemini, Claude, Copilot, and Grok." },
  { group: "AEO and GEO", name: "llms.txt check", detail: "See whether the site publishes an llms.txt file for model crawlers." },
  { group: "AEO and GEO", name: "Content draft", detail: "Write a markdown draft with an answer-first opening, a comparison table, an FAQ, and JSON-LD." },
  { group: "Competitors", name: "Competitor crawl", detail: "Crawl a few pages on another host and compare SEO, GEO, and word count." },
  { group: "Competitors", name: "Heading and source gaps", detail: "List headings they use, and sources they cite, that your crawl does not." },
  { group: "Speed and security", name: "HTML performance", detail: "Measure document time, HTML size, linked files, compression, cache, and security headers." },
  { group: "Speed and security", name: "PageSpeed Insights", detail: "Add a free API key for mobile Core Web Vitals. The lab score is never guessed." },
  { group: "Speed and security", name: "Technology fingerprint", detail: "Detect common platforms and hosts from the homepage HTML and response headers." },
  { group: "Public records", name: "Analytics folder rollup", detail: "Paste a page export and join views with the sitemap and Search Console by folder." },
  { group: "Public records", name: "ads.txt", detail: "Check whether the site publishes an ads.txt file." },
  { group: "Public records", name: "Wayback snapshot", detail: "Find the oldest public snapshot of the host." },
  { group: "Public records", name: "Certificate host names", detail: "Read public certificate names for the domain from crt.sh." },
  { group: "Public records", name: "HTML report", detail: "Download one report of the scores, issues, and opportunities in the workspace." },
];

export const guideFaqs = [
  {
    question: "Is Metryxa a free SEO tool?",
    answer:
      "Yes. Metryxa crawls up to 20 HTML pages and reads a sitemap of up to 1,500 URLs. It checks titles, meta descriptions, headings, canonicals, indexation, images, schema, word count, and internal links. The workspace has no subscription.",
  },
  {
    question: "Can Metryxa help with answer engine optimization?",
    answer:
      "Yes. For AEO it looks for an answer in the opening paragraph, question-style headings, lists, tables, citations, and schema. Those signals come from the HTML that was fetched.",
  },
  {
    question: "What does Metryxa check for GEO?",
    answer:
      "GEO uses the same fetched page. The score looks for an answer-first paragraph, question headings, lists, tables, schema, citations, an author, and a date. It is a content check, not a live query against ChatGPT.",
  },
  {
    question: "Can I find striking-distance keywords without invented search volume?",
    answer:
      "Yes, if you paste a Google Search Console export. Metryxa lists queries in positions 4 to 15 with at least 20 impressions, pages with weak click-through, and queries that two of your URLs both rank for. It does not invent monthly search volume.",
  },
  {
    question: "Can Metryxa compare a competitor page?",
    answer:
      "Yes. It crawls a few pages on another host and shows heading gaps, sources they cite that your crawl does not, and SEO, GEO, and word count side by side.",
  },
  {
    question: "Does Metryxa include page speed like GTmetrix?",
    answer:
      "It measures the HTML response: document time, file size, files linked in the HTML, compression, cache, and security headers. A full browser filmstrip and Core Web Vitals need a PageSpeed Insights API key. Those lab grades are not guessed.",
  },
  {
    question: "Which free sources does the research step use?",
    answer:
      "Live autosuggest from Google, Bing, DuckDuckGo, and YouTube, plus Wikipedia, robots.txt rules for AI crawlers, llms.txt, ads.txt, the Wayback Machine, and public certificate host names.",
  },
];
