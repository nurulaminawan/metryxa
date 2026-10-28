(function () {
  var script = document.currentScript;
  if (!script) return;
  var project = script.getAttribute("data-project");
  if (!project) return;
  var ref = document.referrer || "";
  var params = new URLSearchParams(location.search);
  var utm = params.get("utm_source") || "";
  var endpoint = new URL("/api/collect", script.src).toString();
  var payload = JSON.stringify({
    project: project,
    url: location.href,
    ref: ref,
    utm: utm,
    title: document.title,
  });
  var blob = new Blob([payload], { type: "text/plain" });
  if (navigator.sendBeacon) navigator.sendBeacon(endpoint, blob);
  else fetch(endpoint, { method: "POST", body: payload, mode: "cors", keepalive: true });
})();
