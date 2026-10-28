# Metryxa

Metryxa is a workspace for SEO and AI-answer readiness. It crawls a site, reads a Google Search Console export, compares live competitor pages, and drafts the page sections those gaps call for.

Scores are calculated from the HTML, response headers, robots.txt, and sitemap that were fetched, plus any Search Console rows you import. The app does not invent keyword volume, Domain Rating, or backlink counts.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, enter a site, and crawl it. Workspaces are stored in `data/projects.json` on the machine running the app.

```bash
npm run check
npm run build
npm start
```

## What you can do

- Audit crawled pages for indexation, titles, headings, schema, citations, and answer-first structure.
- Import Search Console CSV exports for striking-distance queries, weak snippets, rank movement, and query/page overlap.
- Crawl a competitor and list headings and reference sources they have that you do not.
- Fan a prompt out into follow-up questions and see which crawled page covers each one.
- Record real referrals from ChatGPT, Perplexity, Gemini, Claude, Copilot, and Grok with the snippet in AI answers.
- Generate a markdown draft with a BLUF, comparison table, FAQ, and JSON-LD, then download an HTML report.
- Run Intel for live keyword ideas from Google, Bing, DuckDuckGo, and YouTube autosuggest, a Wikipedia entity, AI-crawler rules in robots.txt, llms.txt, Wayback URLs, and public certificate host names. Optional: a free PageSpeed Insights API key adds mobile lab vitals.

## Search Console files

In Google Search Console open Performance, then Export.

- Queries CSV unlocks demand, striking distance, and snippet CTR.
- Pages CSV lists the URLs already earning impressions.
- A CSV with both Query and Page columns is used to find queries split across two URLs.

Import the queries file again later to see which positions moved.

## Free sources in Intel

Intel calls public endpoints directly. No SpyFu, Ahrefs, or SEMrush account is required, and no search volume is invented.

- Google, Bing, DuckDuckGo, and YouTube autosuggest for keyword and question ideas
- English Wikipedia for the entity answer engines can attach the topic to
- Wayback Machine CDX for historical URLs
- crt.sh certificate transparency for host names
- The site's own robots.txt for AI crawler access, plus `/llms.txt` and `/ads.txt`
- PageSpeed Insights when you paste a free API key from Google Cloud
