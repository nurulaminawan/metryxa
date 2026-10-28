const TRACKING = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "si",
]);

export function assertHttpUrl(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch {
    throw new Error("Enter a full URL, including https://");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs can be audited");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    host === "0.0.0.0"
  ) {
    throw new Error("That host is blocked");
  }
  return url;
}

export function normalizeUrl(input, base) {
  const url = base ? new URL(input, base) : assertHttpUrl(input);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  if (/\/index\.html?$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/index\.html?$/i, "");
  }
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function sameHost(a, b) {
  try {
    return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}

export function hostLabel(input) {
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return input;
  }
}
