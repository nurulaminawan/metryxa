export function SiteFrame({ children }) {
  return (
    <>
      <header className="site-nav">
        <a className="brand-mark" href="/"><span className="mark" /> Metryxa</a>
        <nav className="site-links" aria-label="Primary">
          <a href="/#crawl">Crawl</a>
          <a href="/#tools">Tools</a>
          <a href="/guide">Guide</a>
          <a href="/guide#pricing">Pricing</a>
          <a className="nav-cta" href="/#crawl">Start a crawl</a>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <a className="brand-mark" href="/"><span className="mark" /> Metryxa</a>
            <p>Crawl a site, map the sitemap, and score the HTML that came back. Search volume and backlink counts stay out of the product.</p>
          </div>
          <div>
            <h2>Product</h2>
            <a href="/#crawl">Crawl</a>
            <a href="/#tools">Tools</a>
            <a href="/guide">Guide</a>
            <a href="/guide#pricing">Pricing</a>
          </div>
          <div>
            <h2>In a workspace</h2>
            <a href="/#tools">On-page audit</a>
            <a href="/#tools">Search Console review</a>
            <a href="/#tools">Technology and measured traffic</a>
          </div>
        </div>
        <div className="footer-base">© 2026 Metryxa</div>
      </footer>
    </>
  );
}
