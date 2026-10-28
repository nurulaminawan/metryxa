import "./globals.css";

const description =
  "Free SEO, AEO, and GEO workspace. Metryxa crawls a site, maps the sitemap, and scores pages from the HTML it fetched. Import Search Console or Analytics for query and folder opportunities.";

export const metadata = {
  metadataBase: new URL("https://metryxa.com"),
  title: {
    default: "Metryxa — SEO, GEO, and page speed",
    template: "%s · Metryxa",
  },
  description,
  applicationName: "Metryxa",
  keywords: ["SEO audit", "GEO", "answer engine optimization", "Search Console", "sitemap", "page speed"],
  authors: [{ name: "Metryxa", url: "https://metryxa.com" }],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Metryxa — SEO, GEO, and page speed",
    description,
    url: "https://metryxa.com/",
    siteName: "Metryxa",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Metryxa — SEO, GEO, and page speed",
    description,
  },
  robots: { index: true, follow: true },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Metryxa",
      url: "https://metryxa.com/",
      description,
    },
    {
      "@type": "SoftwareApplication",
      name: "Metryxa",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://metryxa.com/",
      description,
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does Metryxa measure?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Metryxa measures on-page SEO, answer-engine readiness, sitemap coverage, and the speed and security of the HTML response. Scores come from the fetched page and from Search Console or Analytics files you import.",
          },
        },
        {
          "@type": "Question",
          name: "Does Metryxa invent search volume or GTmetrix scores?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Load time, document size, referenced files, compression, and security headers are read from the response. Search volume and a full browser filmstrip are not invented.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#12324d" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
