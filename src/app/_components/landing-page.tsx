import Link from "next/link";

export function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link className="landing-logo" href="/" aria-label="Tabby home">
            <span className="landing-logo-mark" aria-hidden>
              t
            </span>
            <span>Tabby</span>
          </Link>
          <nav aria-label="Primary">
            <a href="#how-it-works">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="#features">Features</a>
            <Link className="landing-nav-cta" href="/app">
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="landing-hero" aria-labelledby="hero-brand">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p id="hero-brand" className="landing-brand">
                Tabby
              </p>
              <h1>Save the mess. Close the tabs. Come back clear.</h1>
              <p className="landing-support">
                A local-first workspace for the links, notes, and tasks hiding
                in your browser — private by default, no account required to
                start.
              </p>
              <div className="landing-cta-group">
                <Link className="landing-btn primary" href="/app">
                  Try the local workspace
                </Link>
                <a
                  className="landing-btn ghost"
                  href="https://github.com/ByTrai/tab"
                  rel="noreferrer"
                  target="_blank"
                >
                  View source
                </a>
              </div>
            </div>
            <div className="landing-hero-visual" aria-hidden="true">
              <div className="hero-mock">
                <div className="hero-mock-rail">
                  <span className="hero-mock-pill active">Research sprint</span>
                  <span className="hero-mock-pill">Weekend reads</span>
                </div>
                <div className="hero-mock-board">
                  <article className="hero-tab">
                    <strong>Capture stack</strong>
                    <small>8 tabs parked</small>
                  </article>
                  <article className="hero-tab">
                    <strong>Notes for Monday</strong>
                    <small>Local draft</small>
                  </article>
                  <article className="hero-tab">
                    <strong>Resume later</strong>
                    <small>Reopen when ready*</small>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-section"
          id="how-it-works"
          aria-labelledby="workflow-title"
        >
          <p className="landing-kicker">Workflow</p>
          <h2 id="workflow-title">
            Park work, clear the deck, resume on purpose
          </h2>
          <p className="landing-lede">
            Tabby is built around the same job as a tab organizer: gather what
            matters, put the browser away, and reopen when you are ready —
            starting with a solid local web workspace today.
          </p>
          <ol className="landing-steps">
            <li>
              <strong>Save</strong>
              <span>
                Drop links, notes, and tasks into named groups on this device.
              </span>
            </li>
            <li>
              <strong>Close</strong>
              <span>
                Clear the tab clutter knowing the important bits are already
                parked.
              </span>
            </li>
            <li>
              <strong>Resume</strong>
              <span>
                Search and open what you need without reconstructing the day
                from memory.
              </span>
            </li>
          </ol>
        </section>

        <section
          className="landing-section tone-ink"
          id="privacy"
          aria-labelledby="privacy-title"
        >
          <p className="landing-kicker">Local-first</p>
          <h2 id="privacy-title">Your workspace stays on your machine</h2>
          <p className="landing-lede">
            IndexedDB keeps data in the browser you are using. Export a JSON
            backup when you want a portable copy. There is no cloud sync product
            yet — and we will not pretend otherwise.
          </p>
          <ul className="landing-privacy-points">
            <li>No account required for the local workspace</li>
            <li>No analytics on saved URLs or note contents</li>
            <li>Import and export use a versioned schema you can inspect</li>
          </ul>
        </section>

        <section
          className="landing-section"
          id="features"
          aria-labelledby="features-title"
        >
          <p className="landing-kicker">What ships today</p>
          <h2 id="features-title">Honest capabilities — nothing vaporware</h2>
          <p className="landing-lede">
            These are the surfaces available now. Extension capture, sync, and
            store listings are still on the roadmap.
          </p>
          <ul className="landing-feature-list">
            <li>
              <strong>Local web workspace</strong>
              Workspaces, groups, links, notes, and tasks that persist offline
              in your browser.
            </li>
            <li>
              <strong>Soft delete</strong>
              Items move to trash so you can restore mistakes instead of losing
              them.
            </li>
            <li>
              <strong>Portable backups</strong>
              Export and import schema v2 JSON you can keep outside the browser.
            </li>
            <li>
              <strong>Open development</strong>
              Source, roadmap, and security reporting live in the public
              repository.
            </li>
          </ul>
        </section>

        <section
          className="landing-section landing-final-cta"
          aria-labelledby="cta-title"
        >
          <h2 id="cta-title">Start on this device</h2>
          <p>
            Open the workspace, park a few links, and see whether the rhythm
            fits your day. Source stays available if you want to read how it
            works.
          </p>
          <div className="landing-cta-group">
            <Link className="landing-btn primary" href="/app">
              Open Tabby
            </Link>
            <a
              className="landing-btn ghost"
              href="https://github.com/ByTrai/tab/blob/main/roadmap.md"
              rel="noreferrer"
              target="_blank"
            >
              Read the roadmap
            </a>
          </div>
          <p className="landing-footnote">
            * Browser tab reopen from saved captures ships with the extension
            path; the web app focuses on organizing what you save locally.
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p>
            <strong>Tabby</strong> — local-first tab and task organization.
          </p>
          <nav aria-label="Footer">
            <Link href="/app">App</Link>
            <a
              href="https://github.com/ByTrai/tab"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              href="https://github.com/ByTrai/tab/blob/main/SECURITY.md"
              rel="noreferrer"
              target="_blank"
            >
              Security
            </a>
            <a
              href="https://github.com/ByTrai/tab/blob/main/LICENSE"
              rel="noreferrer"
              target="_blank"
            >
              MIT License
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
