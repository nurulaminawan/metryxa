import { guardBeacon, guardRead } from "../../../lib/guard.js";
import { classifyAiSource } from "../../../lib/insights.js";
import { readAiEvents, saveAiEvent } from "../../../lib/inbox.js";
import { getProject, saveProject } from "../../../lib/store.js";

export const dynamic = "force-dynamic";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export function OPTIONS() {
  return new Response(null, { headers: cors });
}

export async function GET(request) {
  const limited = await guardRead(request);
  if (limited) return limited;
  const projectId = new URL(request.url).searchParams.get("project") || "";
  const events = await readAiEvents(projectId);
  return Response.json({ events });
}

export async function POST(request) {
  const limited = await guardBeacon(request, cors);
  if (limited) return limited;
  try {
    const raw = await request.text();
    const body = JSON.parse(raw || "{}");
    const projectId = String(body.project || "");
    const source = classifyAiSource(body.ref, body.utm);
    if (!source || !body.url || !projectId) return Response.json({ ok: true, stored: false }, { headers: cors });
    const event = {
      source,
      url: String(body.url).slice(0, 500),
      ref: String(body.ref || "").slice(0, 500),
      title: String(body.title || "").slice(0, 180),
      ts: Date.now(),
    };
    const inRedis = await saveAiEvent(projectId, event);
    const project = getProject(projectId);
    if (project) {
      project.aiTraffic = [event, ...(project.aiTraffic || [])].slice(0, 2000);
      saveProject(project);
    }
    return Response.json({ ok: true, stored: inRedis || Boolean(project) }, { headers: cors });
  } catch {
    return Response.json({ error: "Bad payload" }, { status: 400, headers: cors });
  }
}
