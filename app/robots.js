const SITE = "https://metryxa.com";

export default function robots() {
  const allow = { allow: "/" };
  return {
    rules: [
      { userAgent: "*", ...allow },
      { userAgent: "GPTBot", ...allow },
      { userAgent: "OAI-SearchBot", ...allow },
      { userAgent: "ChatGPT-User", ...allow },
      { userAgent: "Google-Extended", ...allow },
      { userAgent: "Googlebot", ...allow },
      { userAgent: "Bingbot", ...allow },
      { userAgent: "PerplexityBot", ...allow },
      { userAgent: "ClaudeBot", ...allow },
      { userAgent: "Applebot-Extended", ...allow },
      { userAgent: "Amazonbot", ...allow },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
