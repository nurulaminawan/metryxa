function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function performanceReport(page) {
  if (!page || page.error) {
    return {
      ms: page?.ms || 0,
      kb: 0,
      requests: 0,
      speed: 0,
      images: 0,
      security: 0,
      optimization: 0,
      structure: 0,
      notes: [page?.error || "This page was not fetched, so there is no performance measurement."],
    };
  }
  const ms = page.ms || 0;
  const kb = Math.round((page.htmlBytes || 0) / 1024);
  const measuredAssets = Boolean(page.assets);
  const assets = page.assets || {};
  const imageTotal = page.images?.total || 0;
  const requests = measuredAssets
    ? 1 + (assets.scripts || 0) + (assets.stylesheets || 0) + imageTotal + (assets.iframes || 0)
    : null;
  const headers = page.headers || {};
  const notes = [];

  let speed = 100;
  if (ms > 2500) {
    speed -= 35;
    notes.push(`HTML arrived in ${ms} ms. Aim for under 800 ms for the document itself.`);
  } else if (ms > 800) {
    speed -= 12;
    notes.push(`HTML arrived in ${ms} ms.`);
  }
  if (kb > 200) {
    speed -= 15;
    notes.push(`The HTML document is ${kb} KB before images and scripts.`);
  }
  if (measuredAssets && (assets.blockingScripts || 0) > 0) {
    speed -= 10;
    notes.push(`${assets.blockingScripts} script${assets.blockingScripts === 1 ? "" : "s"} in the head block rendering. Add defer or async.`);
  }
  if (!measuredAssets) notes.push("Script and stylesheet counts were not stored on this crawl. Recrawl to measure them.");

  let images = 100;
  if (imageTotal && page.images.missingAlt / imageTotal > 0.3) {
    images -= 30;
    notes.push(`${page.images.missingAlt} of ${imageTotal} images have no alt text.`);
  }
  if ((assets.imagesMissingDimensions || 0) > 2) {
    images -= 15;
    notes.push(`${assets.imagesMissingDimensions} images have no width and height, which causes layout shift.`);
  }
  if (!imageTotal) images = 90;

  let security = page.https ? 100 : 50;
  if (!page.https) notes.push("The final URL is not HTTPS.");
  if (!headers.hsts) security -= 10;
  if (!headers.csp) security -= 8;
  if (!headers.nosniff) security -= 8;
  if (!headers.xfo) security -= 8;
  if (!headers.hsts || !headers.nosniff) notes.push("One or more common security headers are missing: HSTS, CSP, nosniff, or X-Frame-Options.");

  let optimization = 100;
  if ("encoding" in headers && !headers.encoding) {
    optimization -= 20;
    notes.push("The HTML response did not advertise Content-Encoding. Gzip or Brotli should be on.");
  }
  if ("cache" in headers && !headers.cache) {
    optimization -= 12;
    notes.push("No Cache-Control header on the document.");
  }
  if (requests > 50) {
    optimization -= 18;
    notes.push(`${requests} files are referenced in the HTML. That count excludes files loaded later by JavaScript.`);
  } else if (requests > 25) {
    optimization -= 8;
  }
  if (page.finalUrl && page.url && page.finalUrl !== page.url) {
    notes.push(`The request redirected to ${page.finalUrl}.`);
  }

  speed = clamp(speed);
  images = clamp(images);
  security = clamp(security);
  optimization = clamp(optimization);
  return {
    ms,
    kb,
    requests,
    encoding: "encoding" in headers ? headers.encoding || "not set" : "recrawl to measure",
    cache: "cache" in headers ? headers.cache || "not set" : "recrawl to measure",
    speed,
    images,
    security,
    optimization,
    structure: clamp(speed * 0.4 + images * 0.2 + security * 0.2 + optimization * 0.2),
    notes,
  };
}
