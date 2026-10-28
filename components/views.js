"use client";

import { useEffect, useMemo, useState } from "react";
import { techItems } from "../lib/intel.js";
import { runTools } from "../lib/toolbox.js";
import { suggestFixes } from "../lib/content.js";
import { performanceReport } from "../lib/performance.js";

function n(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}
function ctr(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function Scores({ insights }) {
  const items = [
    ["SEO", insights.scores.seo, "#0f6b4c"],
    ["GEO", insights.scores.geo, "#1d4f86"],
    ["E-E-A-T", insights.scores.eeat, "#8a5a12"],
    ["Technical", insights.scores.technical, "#14382c"],
  ];
  return (
    <div className="scores">
      {items.map(([label, value, color]) => (
        <article key={label} className="score">
          <i style={{ "--w": `${value}%`, "--bar": color }} />
          <b>{value}</b>
          <span>{label}</span>
        </article>
      ))}
    </div>
  );
}

function IssueList({ issues }) {
  if (!issues?.length) return <p className="empty">No issues in this set.</p>;
  return issues.map((issue, index) => (
    <div className="issue" key={`${issue.title}-${index}`}>
      <div><span className={`tag ${issue.severity}`}>{issue.severity}</span><strong>{issue.title}</strong></div>
      <div className="muted">{issue.detail}</div>
      <div>{issue.fix}</div>
      {issue.url ? <a href={issue.url} target="_blank" rel="noreferrer">{issue.url}</a> : null}
    </div>
  ));
}

export function Overview({ project, insights, act, busy }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>{project.name}</h1>
          <div className="muted">{project.url} · {insights.counts.pages} pages · {insights.hasSitemap ? "sitemap found" : "no sitemap"} · {insights.hasRobots ? "robots.txt found" : "no robots.txt"}</div>
        </div>
        <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => act({ type: "crawl", maxPages: project.maxPages })}>
          Recrawl
        </button>
      </header>
      <Scores insights={insights} />
      <div className="kpis">
        <div><b>{insights.counts.critical}</b><span className="muted">critical issues</span></div>
        <div><b>{n(insights.gsc.clicks)}</b><span className="muted">Search Console clicks</span></div>
        <div><b>{n(insights.gsc.impressions)}</b><span className="muted">impressions</span></div>
        <div><b>{insights.promptCoverage}%</b><span className="muted">prompt coverage</span></div>
        <div><b>{n(insights.urlMap?.counts?.urls)}</b><span className="muted">URLs mapped</span></div>
      </div>
      <div className="layout">
        <section className="card">
          <h2>Fix these first</h2>
          <IssueList issues={insights.topIssues.slice(0, 6)} />
        </section>
        <section className="stack">
          <article className="card">
            <h2>Highest opportunities</h2>
            {insights.keywords.slice(0, 5).map((row) => (
              <div className="issue" key={row.phrase}>
                <strong>{row.phrase}</strong>
                <div className="muted">{row.intent} · you {row.yourPages} · competitors {row.theirPages} · score {row.opportunity}</div>
              </div>
            ))}
            {insights.keywords.length === 0 ? <p className="empty">The crawl did not yield keyword phrases yet.</p> : null}
          </article>
          <article className="card">
            <h2>Measured traffic</h2>
            <p className="muted">Search clicks, Analytics views, and AI referrals stored in this workspace. A crawl cannot see total site visits, so no visit estimate is filled in.</p>
            <div className="kpis">
              <div><b>{n(insights.gsc.clicks)}</b><span className="muted">Search clicks</span></div>
              <div><b>{n(insights.urlMap?.counts?.views)}</b><span className="muted">Analytics views</span></div>
              <div><b>{n(insights.aiTraffic?.total)}</b><span className="muted">AI referrals</span></div>
            </div>
            {(insights.aiTraffic?.sources || []).map((row) => <p key={row.source}>{row.source}: {n(row.count)}</p>)}
            {!insights.gsc?.queries && !insights.urlMap?.counts?.views && !insights.aiTraffic?.total ? <p className="muted">Import a Search Console or Analytics export, or install the referral snippet, to fill these in.</p> : null}
          </article>
          {insights.intelBrief ? (
            <article className="card">
              <h2>Public intel</h2>
              <p className="muted">{insights.intelBrief.suggestions} autosuggest ideas, {insights.intelBrief.uncovered} not covered by the crawl. {insights.intelBrief.subdomains} host names in public certificates. {insights.intelBrief.llms ? "llms.txt is published." : "No llms.txt."}</p>
              {insights.intelBrief.blocked.length ? <p>Blocked AI crawlers: {insights.intelBrief.blocked.join(", ")}</p> : null}
              {insights.intelBrief.tech.length ? <p className="muted">{insights.intelBrief.tech.join(" · ")}</p> : null}
            </article>
          ) : null}
          <article className="card">
            <h2>How this score is built</h2>
            <p className="muted">SEO blends on-page tags, technical checks, and content depth. GEO looks for an answer-first paragraph, question headings, lists, tables, schema, and citations. Nothing here is a guessed search volume.</p>
          </article>
        </section>
      </div>
    </>
  );
}

export function AuditView({ project }) {
  const [url, setUrl] = useState(project.pages[0]?.url || "");
  const page = project.pages.find((item) => item.url === url) || project.pages[0];
  if (!page) return <p className="empty">Crawl a site to audit pages.</p>;
  return (
    <>
      <header className="topbar"><div><h1>Audit</h1><p className="muted">Every check below was read from the fetched document.</p></div></header>
      <div className="split">
        <div className="page-list">
          {project.pages.map((item) => (
            <button key={item.url} type="button" className={item.url === page.url ? "active" : ""} onClick={() => setUrl(item.url)}>
              <strong>{item.title || hostOf(item.url)}</strong>
              <div className="url">SEO {item.scores?.seo ?? 0} · GEO {item.scores?.geo ?? 0}</div>
            </button>
          ))}
        </div>
        <article className="card">
          <h2>{page.title || "Untitled page"}</h2>
          <p className="url">{page.finalUrl || page.url}</p>
          <div className="kpis">
            <div><b>{page.scores?.seo ?? 0}</b><span className="muted">SEO</span></div>
            <div><b>{page.scores?.geo ?? 0}</b><span className="muted">GEO</span></div>
            <div><b>{page.scores?.eeat ?? 0}</b><span className="muted">E-E-A-T</span></div>
            <div><b>{n(page.wordCount)}</b><span className="muted">words</span></div>
            <div><b>{page.ms || 0}ms</b><span className="muted">HTML time</span></div>
          </div>
          <PerformancePanel page={page} />
          <p>{page.metaDescription || "No meta description."}</p>
          <p className="muted">H1: {(page.h1 || []).join(" · ") || "none"} · schema: {(page.schemaTypes || []).join(", ") || "none"} · images missing alt: {page.images?.missingAlt || 0}/{page.images?.total || 0}</p>
          <IssueList issues={page.scores?.issues || []} />
        </article>
      </div>
    </>
  );
}

function PerformancePanel({ page }) {
  const report = performanceReport(page);
  const cards = [
    ["Document time", `${report.ms} ms`],
    ["HTML size", `${report.kb} KB`],
    ["Files linked", report.requests == null ? "—" : String(report.requests)],
    ["Image score", `${report.images}`],
    ["Security", `${report.security}`],
    ["Compression", report.encoding],
  ];
  return (
    <section>
      <h2>Measured performance</h2>
      <p className="muted">These figures come from the HTML response and the files it links. This is not a GTmetrix filmstrip and not a guessed grade. Browser Core Web Vitals still need a PageSpeed Insights key in Intel.</p>
      <div className="kpis">
        {cards.map(([label, value]) => (
          <div key={label}><b>{value}</b><span className="muted">{label}</span></div>
        ))}
      </div>
      <p className="muted">Structure score {report.structure}. Cache-Control: {report.cache}</p>
      {report.notes.map((note) => <div className="issue" key={note}>{note}</div>)}
    </section>
  );
}

export function KeywordsView({ insights }) {
  const [q, setQ] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const rows = useMemo(() => {
    return insights.keywords.filter((row) => {
      if (onlyGaps && row.yourPages > 0) return false;
      if (q && !row.phrase.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [insights.keywords, q, onlyGaps]);
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Keywords</h1>
          <p className="muted">Phrases from titles and headings, plus Search Console queries when you import them. Opportunity rises when demand exists and your pages do not cover the phrase.</p>
        </div>
      </header>
      <div className="toolbar">
        <input type="text" placeholder="Filter phrases" value={q} onChange={(event) => setQ(event.target.value)} />
        <button className="btn ghost" type="button" onClick={() => setOnlyGaps((value) => !value)}>{onlyGaps ? "Showing gaps only" : "Show coverage gaps"}</button>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Phrase</th><th>Intent</th><th>You</th><th>Competitors</th><th>Position</th><th>Impressions</th><th>Opportunity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.phrase}>
                <td>{row.phrase}{row.sources?.length ? <div className="muted">{row.sources.join(" · ")}</div> : null}</td>
                <td><span className="tag">{row.intent}</span></td>
                <td>{row.yourPages}</td>
                <td>{row.theirPages}</td>
                <td>{row.position ?? "—"}</td>
                <td>{n(row.impressions)}</td>
                <td>{row.opportunity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty">No phrases match.</p> : null}
      </div>
    </>
  );
}

export function RankingsView({ project, insights, act, busy }) {
  const [pasted, setPasted] = useState("");
  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const csv = await file.text();
    await act({ type: "gsc", csv });
  }
  const queries = project.gsc?.queries || [];
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Rankings</h1>
          <p className="muted">In Search Console, open Performance → Search results → Export. Upload the Queries CSV, the Pages CSV, or a sheet that has both Query and Page columns.</p>
        </div>
        <label className="btn">
          {busy ? "Importing" : "Upload CSV"}
          <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </label>
      </header>
      <form className="card" style={{ marginBottom: 14 }} onSubmit={(event) => { event.preventDefault(); act({ type: "gsc", csv: pasted }); setPasted(""); }}>
        <label htmlFor="gsc-paste">Paste a Search Console CSV</label>
        <textarea id="gsc-paste" value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder={"Query,Clicks,Impressions,CTR,Position"} />
        <button className="btn" type="submit" disabled={Boolean(busy) || pasted.trim().length < 10}>Import pasted CSV</button>
      </form>
      {!queries.length ? <div className="note">No query export yet. Rank movement, striking distance, and weak snippets appear after the first upload. Import a second file later to see position change.</div> : null}
      <div className="layout">
        <section className="card">
          <h2>Striking distance</h2>
          <p className="muted">Positions 4–15 with at least 20 impressions. These are the queries closest to more clicks.</p>
          <table>
            <tbody>
              {insights.striking.map((row) => (
                <tr key={row.key}><td>{row.key}</td><td>{row.position}</td><td>{n(row.impressions)}</td></tr>
              ))}
            </tbody>
          </table>
          {insights.striking.length === 0 ? <p className="empty">None in this export.</p> : null}
          <h2>Snippet is losing clicks</h2>
          <p className="muted">Position is already on page one, but CTR is under 60% of a typical curve for that rank.</p>
          {insights.lowCtr.map((row) => (
            <div className="issue" key={row.key}>
              <strong>{row.key}</strong>
              <div className="muted">Position {row.position} · CTR {ctr(row.ctr)} · typical {ctr(row.expected)} · {n(row.impressions)} impressions</div>
            </div>
          ))}
          {insights.lowCtr.length === 0 ? <p className="empty">No weak snippets detected.</p> : null}
        </section>
        <section className="stack">
          <article className="card">
            <h2>Queries fought by two pages</h2>
            {insights.cannibalization.map((row) => (
              <div className="issue" key={row.query}>
                <strong>{row.query}</strong>
                <div className="muted">{row.source} · {n(row.impressions)} impressions</div>
                {row.pages.map((url) => <div className="url" key={url}>{url}</div>)}
              </div>
            ))}
            {insights.cannibalization.length === 0 ? <p className="empty">Upload a Query + Page export, or crawl pages that share the same Search Console queries.</p> : null}
          </article>
          <article className="card">
            <h2>Movement since the previous import</h2>
            {insights.movement.map((row) => (
              <div className="issue" key={row.key}>
                <strong>{row.key}</strong>
                <div className="muted">{row.before} → {row.position} ({row.delta > 0 ? "+" : ""}{row.delta})</div>
              </div>
            ))}
            {insights.movement.length === 0 ? <p className="empty">Import the queries CSV again on a later day.</p> : null}
          </article>
        </section>
      </div>
      {(project.gsc?.pages || []).length ? (
        <section className="card" style={{ marginTop: 14 }}>
          <h2>Pages in the export</h2>
          <table>
            <thead><tr><th>Page</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead>
            <tbody>
              {project.gsc.pages.slice(0, 20).map((row) => (
                <tr key={row.key}><td className="url">{row.key}</td><td>{n(row.clicks)}</td><td>{n(row.impressions)}</td><td>{ctr(row.ctr)}</td><td>{row.position}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}

export function CompetitorsView({ insights, act, busy }) {
  const [url, setUrl] = useState("");
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Competitors</h1>
          <p className="muted">Metryxa crawls up to four pages on their domain and diffs headings, schema, and the reference sites they link to.</p>
        </div>
      </header>
      <form className="toolbar" onSubmit={(event) => { event.preventDefault(); act({ type: "competitor", url }); setUrl(""); }}>
        <input type="url" required placeholder="https://competitor.com" value={url} onChange={(event) => setUrl(event.target.value)} />
        <button className="btn" disabled={Boolean(busy)} type="submit">Compare</button>
      </form>
      <div className="stack">
        {insights.competitors.map((row) => (
          <article className="card" key={row.id}>
            <div className="topbar">
              <div>
                <h2 style={{ margin: 0 }}>{row.host}</h2>
                <p className="muted">Their GEO {row.geo} against your {row.yourGeo}. Average {n(row.words)} words. {row.schema} crawled pages include schema.</p>
              </div>
              <button className="btn ghost" type="button" onClick={() => act({ type: "removeCompetitor", competitorId: row.id })}>Remove</button>
            </div>
          </article>
        ))}
      </div>
      <div className="layout">
        <section className="card">
          <h2>Headings they have and you do not</h2>
          {insights.topicGaps.map((gap) => (
            <div className="issue" key={gap.heading + gap.url}>
              <strong>{gap.heading}</strong>
              <div className="url">{gap.competitor} · {gap.url}</div>
            </div>
          ))}
          {insights.topicGaps.length === 0 ? <p className="empty">Add a competitor to see heading gaps.</p> : null}
        </section>
        <section className="card">
          <h2>Sources they cite and you do not</h2>
          {insights.sourceGaps.map((host) => <div className="issue" key={host}>{host}</div>)}
          {insights.sourceGaps.length === 0 ? <p className="empty">No extra reference domains in the competitor crawl.</p> : null}
        </section>
      </div>
    </>
  );
}

export function VisibilityView({ project, insights, act, busy }) {
  const [text, setText] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${origin}/metryxa.js" data-project="${project.id}" defer></script>`;
  return (
    <>
      <header className="topbar">
        <div>
          <h1>AI answers</h1>
          <p className="muted">A tracked prompt is expanded into the follow-up questions answer engines tend to ask. Coverage means one of your crawled pages actually overlaps that question. This is not a live call to ChatGPT.</p>
        </div>
      </header>
      <div className="kpis">
        <div><b>{insights.brand.pages}</b><span className="muted">your pages naming the brand</span></div>
        <div><b>{insights.brand.competitorMentions}</b><span className="muted">competitor pages naming you</span></div>
        <div><b>{n(insights.aiTraffic.total)}</b><span className="muted">AI referral hits</span></div>
      </div>
      <form className="toolbar" onSubmit={(event) => { event.preventDefault(); act({ type: "prompt", text }); setText(""); }}>
        <input type="text" required placeholder="Prompt or topic to fan out" value={text} onChange={(event) => setText(event.target.value)} />
        <button className="btn" disabled={Boolean(busy)} type="submit">Track prompt</button>
      </form>
      {insights.prompts.map((prompt) => (
        <article className="card" key={prompt.id} style={{ marginBottom: 12 }}>
          <div className="topbar">
            <h2 style={{ margin: 0 }}>{prompt.text} · {prompt.coverage}% covered</h2>
            <button className="btn ghost" type="button" onClick={() => act({ type: "removePrompt", promptId: prompt.id })}>Remove</button>
          </div>
          <table>
            <thead><tr><th>Variation</th><th>Winner</th><th>Your best page</th></tr></thead>
            <tbody>
              {prompt.variations.map((item) => (
                <tr key={item.text}>
                  <td>{item.text}<div className="muted">{item.format}</div></td>
                  <td>{item.winner === "you" ? "You" : item.winner === "competitor" ? item.theirHost || "Competitor" : "Nobody crawled"}</td>
                  <td className="url">{item.yourUrl || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
      <section className="card">
        <h2>Referral pixel</h2>
        <p className="muted">Paste this on the sites you control. When a visitor arrives from ChatGPT, Perplexity, Gemini, Claude, Copilot, or Grok, Metryxa records the landing page. Other traffic is ignored.</p>
        <div className="snippet">{snippet}</div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn ghost" type="button" onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>
        </div>
        {insights.aiTraffic.sources.map((row) => (
          <div className="issue" key={row.source}><strong>{row.source}</strong> · {row.count}</div>
        ))}
      </section>
    </>
  );
}

export function OptimizerView({ project, insights, act, busy }) {
  const [url, setUrl] = useState(project.pages[0]?.url || "");
  const page = project.pages.find((item) => item.url === url) || project.pages[0];
  if (!page) return <p className="empty">Crawl a page before optimizing it.</p>;
  const fixes = suggestFixes(page);
  return (
    <>
      <header className="topbar"><div><h1>Optimizer</h1><p className="muted">Rewrite the parts the audit flagged. Generate a full draft when you want the outline, FAQ, and schema together.</p></div></header>
      <div className="toolbar">
        <select value={page.url} onChange={(event) => setUrl(event.target.value)}>
          {project.pages.map((item) => <option key={item.url} value={item.url}>{item.title || item.url}</option>)}
        </select>
        <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => act({ type: "draft", keyword: page.h1?.[0] || page.title, pageUrl: page.url })}>
          Generate draft from this page
        </button>
      </div>
      <div className="layout">
        <section className="card">
          <h2>Suggested replacement</h2>
          <p><strong>Title.</strong> {fixes.title}</p>
          <p><strong>Meta.</strong> {fixes.meta}</p>
          <p><strong>Answer first.</strong> {fixes.bluf}</p>
          <p className="muted">Add an H2 like “{fixes.faqHeading}” and a short answer under it. Internal link ideas from this crawl: {insights.internalLinks.length}.</p>
          {insights.internalLinks.filter((link) => link.source === page.url).slice(0, 5).map((link) => (
            <div className="issue" key={link.target}>
              <strong>{link.anchor}</strong>
              <div className="url">{link.target}</div>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Why this page is held back</h2>
          <IssueList issues={(page.scores?.issues || []).slice(0, 8)} />
        </section>
      </div>
    </>
  );
}

export function TopicsView({ insights, act, busy }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Topics</h1>
          <p className="muted">Clusters are grouped by the lead term in each phrase. Build a draft for a cluster when the supporting phrases outnumber the page that should own them.</p>
        </div>
      </header>
      <div className="pillars">
        {insights.topical.map((pillar) => (
          <article className="pillar" key={pillar.name}>
            <h2>{pillar.name}</h2>
            <p className="muted">Opportunity {pillar.opportunity} · {n(pillar.impressions)} impressions</p>
            {pillar.keywords.map((keyword) => (
              <div className="issue" key={keyword.phrase}>{keyword.phrase}</div>
            ))}
            <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => act({ type: "draft", keyword: pillar.keywords[0]?.phrase || pillar.name })}>
              Draft this cluster
            </button>
          </article>
        ))}
      </div>
      {insights.topical.length === 0 ? <p className="empty">Crawl more pages, or import queries, to form clusters.</p> : null}
      {insights.duplicates.length ? (
        <section className="card" style={{ marginTop: 14 }}>
          <h2>Duplicate titles and descriptions</h2>
          {insights.duplicates.map((row) => (
            <div className="issue" key={row.type + row.value}>
              <span className="tag warning">{row.type}</span>{row.value}
              {row.urls.map((url) => <div className="url" key={url}>{url}</div>)}
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function ContentView({ project, act, busy }) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(project.drafts?.[0]?.id || "");
  const draft = (project.drafts || []).find((item) => item.id === open) || project.drafts?.[0];
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Drafts</h1>
          <p className="muted">Drafts are outlines tied to crawled gaps. Replace the bracketed slots with facts before publishing.</p>
        </div>
      </header>
      <form className="toolbar" onSubmit={(event) => { event.preventDefault(); act({ type: "draft", keyword }).then((data) => { if (data?.project.drafts?.[0]) setOpen(data.project.drafts[0].id); }); setKeyword(""); }}>
        <input type="text" required placeholder="Keyword or working title" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <button className="btn" disabled={Boolean(busy)} type="submit">Generate</button>
      </form>
      <div className="split">
        <div className="page-list">
          {(project.drafts || []).map((item) => (
            <button key={item.id} type="button" className={draft?.id === item.id ? "active" : ""} onClick={() => setOpen(item.id)}>
              <strong>{item.title}</strong>
              <div className="url">{item.intent} · {item.format}</div>
            </button>
          ))}
          {(project.drafts || []).length === 0 ? <p className="empty">No drafts yet.</p> : null}
        </div>
        {draft ? (
          <article>
            <div className="actions" style={{ marginBottom: 8 }}>
              <button className="btn ghost" type="button" onClick={() => navigator.clipboard.writeText(draft.markdown)}>Copy markdown</button>
              <button className="btn ghost" type="button" onClick={() => act({ type: "removeDraft", draftId: draft.id })}>Delete</button>
            </div>
            <pre className="draft">{draft.markdown}</pre>
          </article>
        ) : <p className="empty">Generate a draft to preview it.</p>}
      </div>
    </>
  );
}

export function UrlMapView({ project, insights, act, busy }) {
  const map = insights.urlMap || { urls: [], folders: [], counts: {} };
  const [section, setSection] = useState("");
  const [q, setQ] = useState("");
  const [gaps, setGaps] = useState(false);
  const [pasted, setPasted] = useState("");
  const rows = map.urls.filter((url) => {
    if (section && url.section !== section) return false;
    if (gaps && url.audited) return false;
    if (q && !`${url.url} ${url.title}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <>
      <header className="topbar">
        <div>
          <h1>URL map</h1>
          <p className="muted">Every URL found in the sitemap, plus pages already audited. Folders roll up Search Console clicks and an Analytics page export. The HTML audit still fetches at most {project.maxPages || 8} pages so the crawl stays fast.</p>
        </div>
        <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => act({ type: "urlmap" })}>Rebuild map</button>
      </header>
      <div className="kpis">
        <div><b>{n(map.counts.urls)}</b><span className="muted">URLs on the map</span></div>
        <div><b>{n(map.counts.sitemap)}</b><span className="muted">in the sitemap</span></div>
        <div><b>{n(map.counts.audited)}</b><span className="muted">HTML audited</span></div>
        <div><b>{n(map.counts.sitemapOnly)}</b><span className="muted">sitemap only</span></div>
        <div><b>{n(map.counts.clicks)}</b><span className="muted">Search clicks</span></div>
        <div><b>{n(map.counts.views)}</b><span className="muted">Analytics views</span></div>
      </div>
      <form className="card" style={{ margin: "14px 0" }} onSubmit={(event) => { event.preventDefault(); act({ type: "ga", csv: pasted }); setPasted(""); }}>
        <label htmlFor="ga-paste">Paste a Google Analytics page CSV</label>
        <textarea id="ga-paste" value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder={"Page path and screen class,Views\n/blog,120"} />
        <button className="btn" type="submit" disabled={Boolean(busy) || pasted.trim().length < 10}>Import Analytics pages</button>
      </form>
      <div className="layout">
        <section className="card">
          <h2>Folders</h2>
          <table>
            <thead><tr><th>Folder</th><th>URLs</th><th>Audited</th><th>Clicks</th><th>Views</th><th>Position</th></tr></thead>
            <tbody>
              <tr>
                <td><button className="btn ghost" type="button" onClick={() => setSection("")}>All</button></td>
                <td>{n(map.counts.urls)}</td><td>{n(map.counts.audited)}</td><td>{n(map.counts.clicks)}</td><td>{n(map.counts.views)}</td><td>—</td>
              </tr>
              {map.folders.map((folder) => (
                <tr key={folder.folder}>
                  <td><button className="btn ghost" type="button" onClick={() => setSection(folder.folder)}>{folder.folder}</button></td>
                  <td>{n(folder.urls)}</td>
                  <td>{n(folder.audited)}</td>
                  <td>{n(folder.clicks)}</td>
                  <td>{n(folder.views)}</td>
                  <td>{folder.position ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {map.folders.length === 0 ? <p className="empty">Rebuild the map after a crawl. A sitemap fills this in without downloading every page.</p> : null}
        </section>
        <section className="card">
          <div className="toolbar">
            <input type="text" placeholder="Filter URLs" value={q} onChange={(event) => setQ(event.target.value)} />
            <button className="btn ghost" type="button" onClick={() => setGaps((value) => !value)}>{gaps ? "Showing unaudited" : "Sitemap not audited"}</button>
          </div>
          <table>
            <thead><tr><th>URL</th><th>SEO</th><th>Clicks</th><th>Views</th></tr></thead>
            <tbody>
              {rows.slice(0, 80).map((url) => (
                <tr key={url.url}>
                  <td>
                    <a href={url.url} target="_blank" rel="noreferrer">{url.title || url.url}</a>
                    <div className="url">{url.inSitemap ? "sitemap" : "found in crawl"}{url.audited ? " · audited" : ""}{url.lastmod ? ` · ${url.lastmod}` : ""}</div>
                  </td>
                  <td>{url.seo ?? "—"}</td>
                  <td>{n(url.clicks)}</td>
                  <td>{n(url.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 80 ? <p className="muted">Showing 80 of {n(rows.length)}. Filter to narrow the list.</p> : null}
          {rows.length === 0 ? <p className="empty">No URLs in this filter.</p> : null}
        </section>
      </div>
    </>
  );
}

export function IntelView({ project, insights, act, busy }) {
  const intel = project.intel;
  const [seed, setSeed] = useState(intel?.seed || project.brandTerms?.[0] || project.host || "");
  const [psiKey, setPsiKey] = useState(project.psiKey || "");
  const uncovered = (intel?.suggestions || []).filter((idea) => {
    const row = insights.keywords.find((keyword) => keyword.phrase.toLowerCase() === idea.text.toLowerCase());
    return !row || row.yourPages === 0;
  });
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Intel</h1>
          <p className="muted">Live keyword ideas from Google, Bing, DuckDuckGo, and YouTube autosuggest, plus Wikipedia, the Wayback Machine, public certificates, robots.txt AI crawlers, and llms.txt. This is the free public layer SEO tools use before a paid volume database.</p>
        </div>
      </header>
      <form className="card" onSubmit={(event) => { event.preventDefault(); act({ type: "intel", seed, psiKey }); }}>
        <div className="row">
          <div className="field">
            <label htmlFor="seed">Topic or brand</label>
            <input id="seed" type="text" value={seed} onChange={(event) => setSeed(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="psi">PageSpeed API key</label>
            <input id="psi" type="password" value={psiKey} onChange={(event) => setPsiKey(event.target.value)} placeholder="Optional, free from Google Cloud" autoComplete="off" />
          </div>
        </div>
        <button className="btn" type="submit" disabled={Boolean(busy)}>{busy ? "Gathering public sources" : "Run intel"}</button>
        {busy ? <p className="muted">Autosuggest, Wikipedia, Wayback, and certificate logs usually finish within half a minute.</p> : null}
      </form>
      {!intel ? <p className="empty">Nothing gathered yet.</p> : (
        <div className="stack" style={{ marginTop: 14 }}>
          <section className="card">
            <h2>Technology</h2>
            <p className="muted">Recognized from the homepage HTML and response headers.</p>
            {techItems(intel.tech).length ? [...new Set(techItems(intel.tech).map((item) => item.category))].map((category) => (
              <p key={category}><strong>{category}.</strong> {techItems(intel.tech).filter((item) => item.category === category).map((item) => item.name).join(", ")}</p>
            )) : <p>No recognizable platform, analytics tag, or host in the homepage HTML.</p>}
            <p className="muted">{intel.adsTxt ? "ads.txt is published." : "No ads.txt."} {intel.llms?.found ? "llms.txt is published for answer engines." : "No llms.txt, so answer engines have no curated file of what to cite."}</p>
            {intel.llms?.found ? <pre className="snippet">{intel.llms.preview}</pre> : null}
          </section>
          <section className="card">
            <h2>AI crawler access</h2>
            <p className="muted">{intel.robotsFound ? "Read from robots.txt." : "robots.txt did not return a file, so access is unknown."}</p>
            <table>
              <tbody>
                {(intel.crawlers || []).map((bot) => (
                  <tr key={bot.bot}>
                    <td>{bot.name}</td>
                    <td className="muted">{bot.bot}</td>
                    <td><span className={`tag ${bot.access === "blocked" ? "critical" : bot.access === "partial" ? "warning" : "opportunity"}`}>{bot.access}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card">
            <h2>Autosuggest you do not cover</h2>
            {uncovered.slice(0, 12).map((idea) => (
              <div className="issue" key={idea.text}>
                <strong>{idea.text}</strong>
                <div className="muted">{idea.sources.join(" · ")}</div>
                <button className="btn ghost" type="button" disabled={Boolean(busy)} onClick={() => act({ type: "draft", keyword: idea.text })}>Draft this</button>
              </div>
            ))}
            {uncovered.length === 0 ? <p className="empty">Every returned suggestion already matches a crawled page, or the run returned none.</p> : null}
          </section>
          <div className="layout">
            <section className="card">
              <h2>Wikipedia entity</h2>
              {intel.wiki?.found ? (
                <>
                  <h3>{intel.wiki.title}</h3>
                  <p className="muted">{intel.wiki.description}</p>
                  <p>{intel.wiki.extract}</p>
                  {intel.wiki.url ? <a href={intel.wiki.url} target="_blank" rel="noreferrer">{intel.wiki.url}</a> : null}
                </>
              ) : <p className="empty">No English Wikipedia page for this topic. Answer engines have less of an entity to attach your brand to.</p>}
            </section>
            <section className="card">
              <h2>Footprint</h2>
              <p className="muted">{intel.wayback?.oldest ? `Oldest Wayback snapshot ${intel.wayback.oldest}.` : "No Wayback rows."} {(intel.subdomains || []).length} host names in certificate transparency.{intel.subdomainError ? ` Certificate log: ${intel.subdomainError}.` : ""}</p>
              {(intel.subdomains || []).slice(0, 12).map((name) => <div className="url" key={name}>{name}</div>)}
              {intel.psi?.performance != null ? <p>PageSpeed mobile {intel.psi.performance} · SEO {intel.psi.seo ?? "—"} · LCP {intel.psi.lcp} · CLS {intel.psi.cls}</p> : null}
              {intel.psi?.skipped ? <p className="muted">{intel.psi.reason}</p> : null}
              {intel.psi?.error ? <p className="muted">{intel.psi.error}</p> : null}
            </section>
          </div>
        </div>
      )}
    </>
  );
}

export function ReportView({ project, insights, act, busy, onDelete }) {
  const [name, setName] = useState(project.name);
  const [brandTerms, setBrandTerms] = useState((project.brandTerms || []).join(", "));
  const [maxPages, setMaxPages] = useState(project.maxPages || 8);
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Report</h1>
          <p className="muted">A single HTML file with the scores, priority fixes, keyword opportunities, and prompt coverage currently in this workspace.</p>
        </div>
        <a className="btn" href={`/api/projects/${project.id}/report`}>Download HTML</a>
      </header>
      <Scores insights={insights} />
      <section className="card" style={{ marginTop: 14 }}>
        <h2>Workspace settings</h2>
        <form onSubmit={(event) => { event.preventDefault(); act({ type: "settings", name, brandTerms, maxPages: Number(maxPages) }); }}>
          <div className="field"><label>Name</label><input type="text" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="field"><label>Brand names</label><input type="text" value={brandTerms} onChange={(event) => setBrandTerms(event.target.value)} /></div>
          <div className="field"><label>Pages on the next crawl</label>
            <select value={maxPages} onChange={(event) => setMaxPages(event.target.value)}>
              {[5, 8, 12, 20].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="actions">
            <button className="btn" disabled={Boolean(busy)} type="submit">Save</button>
            <button className="btn danger" type="button" onClick={onDelete}>Delete workspace</button>
          </div>
        </form>
      </section>
    </>
  );
}

export function ToolsView({ project, insights, focus, onSelect }) {
  const results = useMemo(() => runTools(project, insights), [project, insights]);
  const selected = results.find((tool) => tool.id === focus) || null;
  const groups = [...new Set(results.map((tool) => tool.group))];
  useEffect(() => {
    if (!selected) return undefined;
    let cancelled = false;
    const align = () => {
      if (cancelled) return;
      const node = document.getElementById("tool-focus");
      if (!node) return;
      const nav = document.querySelector(".site-nav")?.getBoundingClientRect().height || 0;
      const stacked = window.matchMedia("(max-width: 960px)").matches;
      const side = stacked ? document.querySelector(".side")?.getBoundingClientRect().height || 0 : 0;
      const top = node.getBoundingClientRect().top + window.scrollY - nav - side - 12;
      window.scrollTo({ top: Math.max(0, top) });
    };
    const frame = requestAnimationFrame(align);
    const timer = setTimeout(align, 80);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [selected, project?.id]);
  return (
    <>
      <header className="topbar">
        <div>
          <h1>{selected ? selected.name : "Tools"}</h1>
          <p className="muted">
            {selected ? selected.detail : `${results.length} checks on the pages stored in this workspace.`}
          </p>
        </div>
      </header>
      {selected ? (
        <article className="card tool-focus" id="tool-focus">
          <p className="eyebrow">{selected.group}</p>
          <h2>{selected.name}</h2>
          <p>{selected.summary}</p>
          {selected.rows.length ? (
            <ul className="tool-rows">{selected.rows.map((row) => <li key={row}>{row}</li>)}</ul>
          ) : (
            <p className="muted">This check has no row-level results in the saved crawl.</p>
          )}
        </article>
      ) : null}
      {groups.map((group) => (
        <section key={group}>
          <h2>{group}</h2>
          <div className="tool-grid">
            {results.filter((tool) => tool.group === group).map((tool) => (
              <button
                className={`tool-card ${tool.id === focus ? "is-selected" : ""}`}
                id={`tool-${tool.id}`}
                key={tool.id}
                type="button"
                onClick={() => onSelect?.(tool.id)}
              >
                <strong>{tool.name}</strong>
                <p>{tool.summary}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
