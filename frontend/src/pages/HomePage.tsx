import { Link } from "react-router-dom";
import { authClient } from "@/auth/auth-client";

export function HomePage() {
  const {
    data: session,
    // isPending, //loading state
    // error, //error object
    // refetch, //refetch the session
  } = authClient.useSession();
  return (
    <div className="home-page">
      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <div className="logo-container">
            <div className="logo-icon">
              <i className="fas fa-globe"></i>
            </div>
            <h1 className="logo-text">Science Live</h1>
          </div>
          <p className="tagline">
            Transform research into connected knowledge through stackable
            knowledge bricks
          </p>
          <p className="subtitle">
            Making scientific work FAIR: Findable, Accessible, Interoperable,
            Reusable
          </p>

          <div className="cta-buttons">
            <Link to="/test-nanopub" className="btn btn-primary">
              <i className="fas fa-flask"></i>
              <span>Try Demo</span>
            </Link>
            <a
              href="https://github.com/ScienceLiveHub"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <i className="fas fa-book-open"></i>
              <span>Documentation</span>
            </a>
            {!session ? (
              <>
                <Link to="/signin" className="btn btn-secondary">
                  <i className="fas fa-sign-in-alt"></i>
                  <span>Sign In</span>
                </Link>
                <Link to="/signup" className="btn btn-primary">
                  <i className="fas fa-user-plus"></i>
                  <span>Sign Up</span>
                </Link>
              </>
            ) : (
              <Link to="/signout" className="btn btn-secondary">
                <i className="fas fa-sign-in-alt"></i>
                <span>Sign Out</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Project Status */}
      <section className="status-section">
        <div className="container">
          <h2 className="section-title">
            <i className="fas fa-chart-line"></i> Development Progress
          </h2>
          <p className="section-subtitle">October 2025 - June 2026</p>

          <div className="timeline">
            <div className="timeline-item complete">
              <div className="timeline-marker">
                <i className="fas fa-check"></i>
              </div>
              <div className="timeline-content">
                <h3>Step 1: Foundation</h3>
                <p>Monorepo, Vercel, React setup</p>
              </div>
            </div>

            <div className="timeline-item complete">
              <div className="timeline-marker">
                <i className="fas fa-check"></i>
              </div>
              <div className="timeline-content">
                <h3>Step 2: Database</h3>
                <p>PostgreSQL integration</p>
              </div>
            </div>

            <div className="timeline-item complete">
              <div className="timeline-marker">
                <i className="fas fa-check"></i>
              </div>
              <div className="timeline-content">
                <h3>Step 3: Nanopub Viewer & Creator</h3>
                <p>Parse, display and create knowledge bricks</p>
              </div>
            </div>

            <div className="timeline-item active">
              <div className="timeline-marker">
                <i className="fas fa-spinner fa-pulse"></i>
              </div>
              <div className="timeline-content">
                <h3>Step 4: Credit System</h3>
                <p>Currently in development</p>
              </div>
            </div>

            <div className="timeline-item planned">
              <div className="timeline-marker">
                <i className="far fa-clock"></i>
              </div>
              <div className="timeline-content">
                <h3>Step 5: ORCID Auth</h3>
                <p>Planned</p>
              </div>
            </div>

            <div className="timeline-item planned">
              <div className="timeline-marker">
                <i className="far fa-clock"></i>
              </div>
              <div className="timeline-content">
                <h3>Step 6: Template Engine</h3>
                <p>Planned</p>
              </div>
            </div>
          </div>

          <div className="milestones">
            <div className="milestone">
              <span className="milestone-label">Beta Launch</span>
              <span className="milestone-date">January 2026</span>
            </div>
            <div className="milestone">
              <span className="milestone-label">Public Launch</span>
              <span className="milestone-date">June 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">
            <i className="fas fa-star"></i> Key Features
          </h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-book-open"></i>
              </div>
              <h3>View Knowledge Bricks</h3>
              <p>
                Beautiful, interactive display of scientific nanopublications
                with automatic template fetching
              </p>
              <Link to="/test-nanopub" className="feature-link">
                Try viewer <i className="fas fa-arrow-right"></i>
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-pen-fancy"></i>
              </div>
              <h3>Create Knowledge Bricks</h3>
              <p>
                Transform research findings into FAIR nanopublications using
                intuitive templates
              </p>
              <Link to="/test-nanopub" className="feature-link">
                Try creator <i className="fas fa-arrow-right"></i>
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-project-diagram"></i>
              </div>
              <h3>Connect Research</h3>
              <p>
                Link findings across studies, creating a connected knowledge
                graph
              </p>
              <span className="feature-badge">Coming Soon</span>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <h3>Get Credit</h3>
              <p>
                Proper attribution and credit for every contribution through
                ORCID integration
              </p>
              <span className="feature-badge">In Development</span>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3>Discover Knowledge</h3>
              <p>
                Search and find relevant nanopublications across the scientific
                community
              </p>
              <span className="feature-badge">Coming Soon</span>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h3>Analyze Impact</h3>
              <p>
                Track how your knowledge bricks are used and built upon by
                others
              </p>
              <span className="feature-badge">Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* What are Nanopublications */}
      <section className="info-section">
        <div className="container">
          <div className="info-content">
            <div className="info-text">
              <h2>
                <i className="fas fa-globe"></i> What are Nanopublications?
              </h2>
              <p>
                Nanopublications are the smallest units of publishable
                information. Each nanopublication is:
              </p>
              <ul className="info-list">
                <li>
                  <strong>Structured:</strong> Clear assertion, provenance, and
                  publication info
                </li>
                <li>
                  <strong>Linked:</strong> Connected to other knowledge using
                  standard vocabularies
                </li>
                <li>
                  <strong>Attributed:</strong> Properly credited to its creator
                </li>
                <li>
                  <strong>Verifiable:</strong> Cryptographically signed and
                  trustworthy
                </li>
                <li>
                  <strong>Permanent:</strong> Immutable and permanently
                  accessible
                </li>
              </ul>
            </div>

            <div className="info-visual">
              <div className="nanopub-structure">
                <div className="np-box assertion">
                  <h4>
                    <i className="fas fa-file-alt"></i> Assertion
                  </h4>
                  <p>The actual claim or statement</p>
                </div>
                <div className="np-box provenance">
                  <h4>
                    <i className="fas fa-microscope"></i> Provenance
                  </h4>
                  <p>Where did this come from?</p>
                </div>
                <div className="np-box pubinfo">
                  <h4>
                    <i className="fas fa-user-circle"></i> Publication Info
                  </h4>
                  <p>Who, when, and how?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="tech-section">
        <div className="container">
          <h2 className="section-title">
            <i className="fas fa-tools"></i> Built With
          </h2>

          <div className="tech-grid">
            <div className="tech-item">
              <div className="tech-logo">
                <i className="fab fa-react"></i>
              </div>
              <span>React + TypeScript</span>
            </div>
            <div className="tech-item">
              <div className="tech-logo">
                <i className="fas fa-bolt"></i>
              </div>
              <span>Vite</span>
            </div>
            <div className="tech-item">
              <div className="tech-logo">
                <i className="fas fa-database"></i>
              </div>
              <span>PostgreSQL</span>
            </div>
            <div className="tech-item">
              <div className="tech-logo">
                <i className="fas fa-cloud"></i>
              </div>
              <span>Vercel</span>
            </div>
            <div className="tech-item">
              <div className="tech-logo">
                <i className="fas fa-globe"></i>
              </div>
              <span>Nanopublications</span>
            </div>
            <div className="tech-item">
              <div className="tech-logo">
                <i className="fas fa-link"></i>
              </div>
              <span>RDF/TriG</span>
            </div>
          </div>
        </div>
      </section>

      {/* Team & Funding */}
      <section className="team-section">
        <div className="container">
          <h2 className="section-title">
            <i className="fas fa-users"></i> Team & Partners
          </h2>

          <div className="team-grid">
            <div className="team-card">
              <h3>Project Lead</h3>
              <p>
                <strong>Anne Fouilloux</strong>
              </p>
              <p>VitenHub AS</p>
            </div>

            <div className="team-card">
              <h3>Technical Architecture</h3>
              <p>
                <strong>Knowledge Pixels</strong>
              </p>
              <p>+ Prophet Town</p>
            </div>

            <div className="team-card">
              <h3>Semantic Consulting</h3>
              <p>
                <strong>Barbara Magagna</strong>
              </p>
              <p>Mabablue</p>
            </div>

            <div className="team-card highlight">
              <h3>Funded By</h3>
              <p>
                <strong>Astera Institute</strong>
              </p>
              <p>Supporting Open Science</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Transform Your Research?</h2>
          <p>Start creating FAIR knowledge bricks today</p>
          <div className="cta-buttons">
            <Link to="/test-nanopub" className="btn btn-primary btn-large">
              <i className="fas fa-rocket"></i>
              <span>Try the Demo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-col">
              <h4>Science Live</h4>
              <p>Making research FAIR and connected</p>
            </div>

            <div className="footer-col">
              <h4>Links</h4>
              <ul>
                <li>
                  <a
                    href="https://sciencelive4all.org"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-globe"></i> Website
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ScienceLiveHub"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fab fa-github"></i> GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="http://nanopub.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-external-link-alt"></i>{" "}
                    Nanopublications
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href="mailto:contact@sciencelive4all.org">
                    <i className="fas fa-envelope"></i> Email
                  </a>
                </li>
                <li>
                  <a
                    href="https://calendly.com/anne-fouilloux/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-calendar-alt"></i> Book a Call
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/company/sciencelive"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fab fa-linkedin"></i> LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 Science Live Platform | v0.1.0 (Development)</p>
            <p>Supported by the Astera Institute</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
