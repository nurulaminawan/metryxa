import { ContactForm } from "../../components/ContactForm";
import { guideFaqs, SITE } from "../../lib/public-copy.js";

const title = "SEO audit, AEO, and page speed";
const description =
  "Metryxa crawls a site and charts the HTML it fetched. Request a quote for an SEO audit, a detailed audit, or page speed optimization.";

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

const pagesCopy = process.env.NEXT_PUBLIC_STATIC_HOST === "1";

export default function GuidePage() {
  return (
    <main className="guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <h1>SEO, AEO, and GEO checks from a real crawl</h1>
      <p className="sub">
        Metryxa fetches your pages and charts what came back: titles, indexation, answer-engine signals, and the HTML response.
        A crawl stays in your browser. An audit engagement is quoted for the site.
      </p>
      <section id="seo-audit">
        <h2>Detailed SEO audit</h2>
        <p>
          The audit reads the pages the crawl fetched. It covers titles, meta descriptions, headings, canonicals, indexation,
          images, schema, word count, internal links, and the sitemap. The detailed engagement adds Search Console striking-distance
          queries, a competitor page comparison, and GEO and AEO signals: an answer in the opening, question headings, lists, tables, citations, an author, and a date.
        </p>
      </section>
      <section id="page-speed">
        <h2>Page speed optimization</h2>
        <p>
          The report charts document time, HTML size, and a response mix from the fetched page: speed, images, security headers, and delivery.
          Page speed optimization turns those readings into a change list for the document, the files it links, compression, and cache.
          A browser filmstrip and Core Web Vitals are included only when a PageSpeed Insights key is available. They are not guessed.
        </p>
      </section>
      <section id="pricing">
        <h2>Pricing</h2>
        <p>Each engagement is quoted after we see the site. Choose one and send the form. The reply includes the price and the scope.</p>
        <div className="price-grid">
          <article className="price-card">
            <h3>SEO audit</h3>
            <p>Crawl, on-page findings, sitemap coverage, and the report charts.</p>
            <a className="btn" href="/guide?service=SEO%20audit#contact">Contact us</a>
          </article>
          <article className="price-card">
            <h3>Detailed audit</h3>
            <p>The SEO audit, plus Search Console opportunities, a competitor page, and AEO and GEO signals.</p>
            <a className="btn" href="/guide?service=Detailed%20audit#contact">Contact us</a>
          </article>
          <article className="price-card">
            <h3>Page speed optimization</h3>
            <p>Document time, HTML weight, linked files, compression, cache, and security headers, with a change list.</p>
            <a className="btn" href="/guide?service=Page%20speed%20optimization#contact">Contact us</a>
          </article>
        </div>
      </section>
      <ContactForm />
      {guideFaqs.map((item) => (
        <section key={item.question}>
          <h2>{item.question}</h2>
          <p>{item.answer}</p>
        </section>
      ))}
      <p><a href={pagesCopy ? "/#tools" : "/"}>{pagesCopy ? "Open the checks" : "Crawl a site"}</a></p>
    </main>
  );
}
