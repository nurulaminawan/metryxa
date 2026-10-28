import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "data");
const file = path.join(dir, "projects.json");

function ensure() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
}

export function listProjects() {
  ensure();
  const projects = JSON.parse(fs.readFileSync(file, "utf8"));
  return projects.map(summary);
}

export function getProject(id) {
  ensure();
  const projects = JSON.parse(fs.readFileSync(file, "utf8"));
  return projects.find((project) => project.id === id) || null;
}

export function saveProject(project) {
  ensure();
  const projects = JSON.parse(fs.readFileSync(file, "utf8"));
  const index = projects.findIndex((item) => item.id === project.id);
  if (index === -1) projects.unshift(project);
  else projects[index] = project;
  fs.writeFileSync(file, JSON.stringify(projects));
  return project;
}

export function deleteProject(id) {
  ensure();
  const projects = JSON.parse(fs.readFileSync(file, "utf8")).filter((item) => item.id !== id);
  fs.writeFileSync(file, JSON.stringify(projects));
}

function summary(project) {
  return {
    id: project.id,
    name: project.name,
    url: project.url,
    host: project.host,
    createdAt: project.createdAt,
    crawledAt: project.crawledAt || null,
    pages: project.pages?.length || 0,
  };
}

export function blankProject({ url, host, name }) {
  return {
    id: crypto.randomUUID(),
    name: name || host,
    url,
    host,
    createdAt: new Date().toISOString(),
    brandTerms: [host.split(".")[0]],
    maxPages: 10,
    pages: [],
    hasRobots: false,
    hasSitemap: false,
    siteIssues: [],
    competitors: [],
    gsc: { queries: [], pages: [], queryPages: [], imports: [] },
    prompts: [],
    drafts: [],
    aiTraffic: [],
    inventory: [],
    ga: { pages: [] },
    crawledAt: null,
  };
}
