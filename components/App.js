"use client";

import { useEffect, useState } from "react";
import {
  AuditView,
  CompetitorsView,
  ContentView,
  KeywordsView,
  OptimizerView,
  Overview,
  RankingsView,
  ReportView,
  TopicsView,
  VisibilityView,
} from "./views";

const NAV = [
  ["overview", "Overview"],
  ["audit", "Audit"],
  ["keywords", "Keywords"],
  ["rankings", "Rankings"],
  ["competitors", "Competitors"],
  ["visibility", "AI answers"],
  ["optimizer", "Optimizer"],
  ["topics", "Topics"],
  ["drafts", "Drafts"],
  ["report", "Report"],
];

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function App() {
  const [projects, setProjects] = useState([]);
  const [current, setCurrent] = useState(null);
  const [view, setView] = useState("overview");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => readJson(response))
      .then((data) => setProjects(data.projects || []))
      .catch((err) => setError(err.message))
      .finally(() => setBooting(false));
  }, []);

  async function openProject(id) {
    setBusy("Opening workspace");
    setError("");
    try {
      const data = await readJson(await fetch(`/api/projects/${id}`));
      setCurrent(data);
      setView("overview");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function createProject(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("Crawling the site");
    setError("");
    try {
      const data = await readJson(
        await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: form.get("url"),
            name: form.get("name"),
            brand: form.get("brand"),
            maxPages: Number(form.get("maxPages")),
          }),
        })
      );
      setProjects((list) => [
        { id: data.project.id, name: data.project.name, url: data.project.url, host: data.project.host, pages: data.project.pages.length },
        ...list.filter((item) => item.id !== data.project.id),
      ]);
      setCurrent(data);
      setView("overview");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function act(body) {
    setBusy("Working");
    setError("");
    try {
      const data = await readJson(
        await fetch(`/api/projects/${current.project.id}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      );
      setCurrent(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function removeProject() {
    if (!current) return;
    setBusy("Removing");
    await fetch(`/api/projects/${current.project.id}`, { method: "DELETE" });
    setProjects((list) => list.filter((item) => item.id !== current.project.id));
    setCurrent(null);
    setBusy("");
  }

  if (!current) {
    return (
      <main className="launcher">
        <div className="brand-mark"><span className="mark" /> Metryxa</div>
        <h1 className="lede">See the gaps. Ship the page that gets cited.</h1>
        <p className="sub">
          Metryxa crawls your site, reads a Search Console export, and compares live competitor pages.
          Scores, keyword gaps, and drafts come from that evidence — search volume and backlink counts are not invented.
        </p>
        <div className="grid-2">
          <form className="card" onSubmit={createProject}>
            <div className="field">
              <label htmlFor="url">Website</label>
              <input id="url" name="url" type="url" required placeholder="https://example.com" />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="name">Workspace name</label>
                <input id="name" name="name" type="text" placeholder="Optional" />
              </div>
              <div className="field">
                <label htmlFor="maxPages">Pages to crawl</label>
                <select id="maxPages" name="maxPages" defaultValue="8">
                  <option value="5">5</option>
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="20">20</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="brand">Brand names</label>
              <input id="brand" name="brand" type="text" placeholder="Comma separated, used for mention checks" />
            </div>
            {error ? <div className="banner">{error}</div> : null}
            <button className="btn" disabled={Boolean(busy)} type="submit">
              {busy || "Crawl and open workspace"}
            </button>
            {busy ? <p className="muted">Fetching HTML, robots.txt, and the sitemap. A larger crawl can take a minute.</p> : null}
          </form>
          <aside className="card">
            <h2>What you can do in this workspace</h2>
            <ul className="points">
              <li><strong>Audit</strong><span>Titles, indexation, schema, speed of the HTML, and the exact fix.</span></li>
              <li><strong>Keywords from the crawl and Search Console</strong><span>Striking distance, weak snippets, and queries two of your pages compete for.</span></li>
              <li><strong>Competitor gaps</strong><span>Headings and sources they cite that your crawl does not.</span></li>
              <li><strong>AI answer coverage</strong><span>Fan a prompt into the questions answer engines ask, then see which page of yours covers each one.</span></li>
              <li><strong>Draft the fix</strong><span>BLUF, comparison table, FAQ, and schema from the gaps that were actually found.</span></li>
            </ul>
            <h2>Saved workspaces</h2>
            {booting ? <p className="muted">Loading…</p> : null}
            {!booting && projects.length === 0 ? <p className="empty">None yet.</p> : null}
            <div className="stack">
              {projects.map((project) => (
                <button key={project.id} className="choice" type="button" onClick={() => openProject(project.id)} disabled={Boolean(busy)}>
                  <strong>{project.name}</strong>
                  <div className="url">{project.host} · {project.pages || 0} pages</div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>
    );
  }

  const viewProps = { project: current.project, insights: current.insights, act, busy };
  const screens = {
    overview: <Overview {...viewProps} />,
    audit: <AuditView {...viewProps} />,
    keywords: <KeywordsView {...viewProps} />,
    rankings: <RankingsView {...viewProps} />,
    competitors: <CompetitorsView {...viewProps} />,
    visibility: <VisibilityView {...viewProps} />,
    optimizer: <OptimizerView {...viewProps} />,
    topics: <TopicsView {...viewProps} />,
    drafts: <ContentView {...viewProps} />,
    report: <ReportView {...viewProps} onDelete={removeProject} />,
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand-mark" style={{ fontSize: 22 }}><span className="mark" /> Metryxa</div>
        <nav>
          {NAV.map(([id, label]) => (
            <button key={id} className={`navbtn ${view === id ? "active" : ""}`} type="button" onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="grow">
          <label htmlFor="switch">Workspace</label>
          <select
            id="switch"
            className="workspace-switch"
            value={current.project.id}
            onChange={(event) => {
              if (event.target.value === "__new") setCurrent(null);
              else openProject(event.target.value);
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
            <option value="__new">New crawl…</option>
          </select>
        </div>
      </aside>
      <section className="main">
        {error ? <div className="banner">{error}</div> : null}
        {busy ? <div className="note">{busy}. Leave this tab open.</div> : null}
        {screens[view]}
      </section>
    </div>
  );
}
