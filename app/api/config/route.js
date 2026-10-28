import { captchaConfig } from "../../../lib/captcha.js";
import { guardRead } from "../../../lib/guard.js";
import { limitStore, POLICIES } from "../../../lib/rate-limit.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const limited = await guardRead(request);
  if (limited) return limited;
  const captcha = captchaConfig();
  return Response.json({
    captcha,
    limits: {
      crawl: { limit: POLICIES.crawl.limit, windowMinutes: POLICIES.crawl.windowMs / 60000 },
      store: await limitStore(),
    },
  });
}
