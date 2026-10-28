export const SITE = "https://metryxa.com";

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
