import { guardRead, guardWrite } from "../../../../lib/guard.js";
import { buildInsights } from "../../../../lib/insights.js";
import { deleteProject, getProject } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const limited = await guardRead(request);
  if (limited) return limited;
  const { id } = await context.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Workspace not found" }, { status: 404 });
  return Response.json({ project, insights: buildInsights(project) });
}

export async function DELETE(request, context) {
  const limited = await guardWrite(request);
  if (limited) return limited;
  const { id } = await context.params;
  deleteProject(id);
  return Response.json({ ok: true });
}
