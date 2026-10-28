import { buildInsights } from "../../../../../lib/insights.js";
import { renderReport } from "../../../../../lib/report.js";
import { getProject } from "../../../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { id } = await context.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Workspace not found" }, { status: 404 });
  const html = renderReport(project, buildInsights(project));
  const filename = `${project.host || "metryxa"}-report.html`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
