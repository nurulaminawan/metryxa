import fs from "fs";
import path from "path";
import { guardWrite } from "../../../lib/guard.js";

export const dynamic = "force-dynamic";

const SERVICES = new Set(["SEO audit", "Detailed audit", "Page speed optimization"]);
const file = path.join(process.cwd(), "data", "contacts.json");

function clean(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function POST(request) {
  const limited = await guardWrite(request);
  if (limited) return limited;
  try {
    const body = await request.json();
    const name = clean(body.name, 80);
    const email = clean(body.email, 120);
    const site = clean(body.site, 200);
    const service = clean(body.service, 40);
    const message = clean(body.message, 2000);
    if (!name || !email || !site || !message) {
      return Response.json({ error: "Name, email, website, and a short note are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Enter a real email address so we can reply with the price." }, { status: 400 });
    }
    if (!SERVICES.has(service)) {
      return Response.json({ error: "Choose an SEO audit, a detailed audit, or page speed optimization." }, { status: 400 });
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    current.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), name, email, site, service, message });
    fs.writeFileSync(file, JSON.stringify(current.slice(0, 200)));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not store the request." }, { status: 400 });
  }
}
