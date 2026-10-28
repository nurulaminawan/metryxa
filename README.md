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

## Search Console files

In Google Search Console open Performance, then Export.

- Queries CSV unlocks demand, striking distance, and snippet CTR.
- Pages CSV lists the URLs already earning impressions.
- A CSV with both Query and Page columns is used to find queries split across two URLs.

Import the queries file again later to see which positions moved.
