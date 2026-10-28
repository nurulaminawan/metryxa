export default function sitemap() {
  const lastModified = new Date("2026-10-28");
  return [
    { url: "https://metryxa.com/", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://metryxa.com/guide", lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
