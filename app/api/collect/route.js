import { classifyAiSource } from "../../../lib/insights.js";
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

export async function POST(request) {
  try {
    const raw = await request.text();
    const body = JSON.parse(raw || "{}");
    const project = getProject(String(body.project || ""));
    if (!project) return Response.json({ error: "Unknown project" }, { status: 404, headers: cors });
    const source = classifyAiSource(body.ref, body.utm);
    if (!source || !body.url) return Response.json({ ok: true, stored: false }, { headers: cors });
    project.aiTraffic = [
      {
        source,
        url: String(body.url).slice(0, 500),
        ref: String(body.ref || "").slice(0, 500),
        title: String(body.title || "").slice(0, 180),
        ts: Date.now(),
      },
      ...(project.aiTraffic || []),
    ].slice(0, 2000);
    saveProject(project);
    return Response.json({ ok: true, stored: true }, { headers: cors });
  } catch {
    return Response.json({ error: "Bad payload" }, { status: 400, headers: cors });
  }
}
