import "./globals.css";

export const metadata = {
  title: "Metryxa — SEO and AI answer workspace",
  description:
    "Crawl a site, import Search Console, find competitor gaps, and draft GEO-ready fixes from the evidence on the page.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,520;9..144,640&family=Outfit:wght@380;480;580&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
