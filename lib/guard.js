import { captchaConfig, verifyCaptcha } from "./captcha.js";
import { clientAddress, enforceRateLimit } from "./rate-limit.js";

const OUTBOUND = new Set(["crawl", "competitor", "urlmap", "intel"]);

export function guardRead(request) {
  return enforceRateLimit(request, "read");
}

export function guardWrite(request) {
  return enforceRateLimit(request, "write");
}

export function guardBeacon(request, headers) {
  return enforceRateLimit(request, "beacon", headers);
}

export function guardAction(request, type) {
  return enforceRateLimit(request, OUTBOUND.has(type) ? "crawl" : "write");
}

export async function guardNewCrawl(request, token) {
  if (captchaConfig().enabled) {
    const attempts = await enforceRateLimit(request, "captcha");
    if (attempts) return attempts;
    const verdict = await verifyCaptcha(token, clientAddress(request));
    if (!verdict.ok) return Response.json({ error: verdict.error }, { status: 400 });
  }
  return await enforceRateLimit(request, "crawl");
}
