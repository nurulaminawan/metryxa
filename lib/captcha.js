const TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "1x00000000000000000000BB",
  "2x00000000000000000000AB",
  "3x00000000000000000000FF",
]);

export function captchaConfig() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || "";
  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  const enabled = Boolean(siteKey && secret);
  return {
    enabled,
    siteKey: enabled ? siteKey : "",
    test: enabled && TEST_SITE_KEYS.has(siteKey),
  };
}

export async function verifyCaptcha(token, ip) {
  if (!captchaConfig().enabled) return { ok: true };
  if (!token) return { ok: false, error: "Complete the human check before starting a crawl." };
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: String(token).slice(0, 2048),
  });
  if (ip && ip !== "local") body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (data.success) return { ok: true };
    return { ok: false, error: "The human check was not accepted. Try it again." };
  } catch {
    return { ok: false, error: "The human check could not be verified. Try again in a moment." };
  }
}
