import { guideFaqs, SITE } from "../../lib/public-copy.js";

const title = "Free SEO, AEO, and GEO checks";
const description =
  "Metryxa is a free workspace for an on-page SEO audit, answer engine optimization, GEO, a sitemap URL map, Search Console opportunities, and HTML page speed. Scores come from the pages it fetches.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/guide" },
  openGraph: { title, description, url: `${SITE}/guide`, type: "article" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: guideFaqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function GuidePage() {
  return (
    <main className="guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <a className="brand-mark" href="/"><span className="mark" /> Metryxa</a>
      <h1>Free SEO, AEO, and GEO checks from a real crawl</h1>
      <p className="sub">
        Metryxa fetches your pages and scores what came back. Use it when you want a free on-page SEO audit,
        an answer-engine check, a sitemap map, or a Search Console review that stays tied to your own export.
      </p>
      {guideFaqs.map((item) => (
        <section key={item.question}>
          <h2>{item.question}</h2>
          <p>{item.answer}</p>
        </section>
      ))}
      <p><a href="/">Crawl a site</a></p>
    </main>
  );
}
