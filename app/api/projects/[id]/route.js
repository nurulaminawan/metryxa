import { buildInsights } from "../../../../lib/insights.js";
import { deleteProject, getProject } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { id } = await context.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Workspace not found" }, { status: 404 });
  return Response.json({ project, insights: buildInsights(project) });
}

export async function DELETE(_request, context) {
  const { id } = await context.params;
  deleteProject(id);
  return Response.json({ ok: true });
}
