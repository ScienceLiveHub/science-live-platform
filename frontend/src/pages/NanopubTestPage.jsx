import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { NanopubViewer } from '@sciencelivehub/nanopub-view/react';
import NanopubCreator from '@sciencelivehub/nanopub-create';
import '../styles/NanopubTestPage.css';

export default function NanopubTestPage() {
  const [activeTab, setActiveTab] = useState('view');
  const [nanopubUri, setNanopubUri] = useState('');
  const [templateUri, setTemplateUri] = useState('');
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  
  // Profile state
  const [hasProfile, setHasProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileOrcid, setProfileOrcid] = useState('');
  const [isSettingUpProfile, setIsSettingUpProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  const creatorRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize creator and check for existing profile
  useEffect(() => {
    const initCreator = async () => {
      if (!creatorRef.current) {
        try {
          creatorRef.current = new NanopubCreator({
            theme: 'default',
            showHelp: true
          });
          // Note: initWasm() is called automatically in constructor
          // Just wait a moment for it to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Set up event listeners
          creatorRef.current.on('create', ({ trigContent }) => {
            console.log('✅ Nanopub created!');
            console.log('📄 Content:', trigContent);
            alert('Nanopublication created successfully! Check console for details.');
          });
          
          creatorRef.current.on('publish', ({ uri, signedContent }) => {
            console.log('✅ Nanopub published!');
            console.log('🌐 URI:', uri);
            console.log('📄 Signed content:', signedContent);
            if (uri) {
              alert(`Nanopublication published!\n\nURI: ${uri}\n\nView at: https://nanodash.knowledgepixels.com/explore?id=${uri}`);
            } else {
              alert('Nanopublication signed and ready to download!');
            }
          });
          
          creatorRef.current.on('error', ({ type, error }) => {
            console.error('❌ Error:', type, error);
            alert(`Error during ${type}: ${error.message}`);
          });
          
          // Check if profile already exists
          if (creatorRef.current.hasProfile()) {
            const profile = creatorRef.current.getProfile();
            setHasProfile(true);
            setProfileName(profile.name || '');
            setProfileOrcid(profile.orcid || '');
          }
        } catch (error) {
          console.error('Failed to initialize creator:', error);
        }
      }
    };
    
    initCreator();
  }, []);

  const handleSetupProfile = async (e) => {
    e.preventDefault();
    
    if (!profileName.trim()) {
      setProfileError('Please enter your name');
      return;
    }
    
    setIsSettingUpProfile(true);
    setProfileError('');
    
    try {
      await creatorRef.current.setupProfile(
        profileName.trim(),
        profileOrcid.trim() || null
      );
      
      setHasProfile(true);
      setProfileError('');
    } catch (error) {
      console.error('Profile setup failed:', error);
      setProfileError(`Failed to setup profile: ${error.message}`);
    } finally {
      setIsSettingUpProfile(false);
    }
  };

  const loadViewExample = async (uri) => {
    setNanopubUri(uri);
    setIsLoadingView(true);
    setTimeout(() => setIsLoadingView(false), 500);
  };

  const loadCreateExample = async (uri) => {
    if (!hasProfile) {
      setProfileError('Please setup your profile first before creating nanopublications');
      return;
    }
    
    setTemplateUri(uri);
    setIsLoadingCreate(true);
    
    if (creatorRef.current && containerRef.current) {
      try {
        containerRef.current.innerHTML = ''; // Clear container
        await creatorRef.current.renderFromTemplateUri(uri, containerRef.current);
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    }
    
    setIsLoadingCreate(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (creatorRef.current) {
        creatorRef.current = null;
      }
    };
  }, []);

  return (
    <div className="nanopub-test-page">
      {/* Header with Navigation */}
      <header className="page-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <i className="fas fa-globe logo-icon"></i>
            <span className="logo-text">Science Live</span>
          </Link>
          
          <nav className="nav-links">
            <Link to="/" className="nav-link">
              <i className="fas fa-arrow-left"></i> Back to Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="page-container">
        {/* Hero Section */}
        <div className="test-hero">
          <h1 className="page-title">
            <i className="fas fa-flask"></i> Nanopublication Tools Demo
          </h1>
          <p className="page-subtitle">
            Test the core features of Science Live: viewing and creating nanopublications
          </p>
          <div className="demo-badge">
            <i className="fas fa-bolt"></i>
            <span>Live Demo - October 2025</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('view')}
            className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
          >
            <i className="fas fa-book-open tab-icon"></i>
            <span className="tab-label">View Nanopublication</span>
            <span className="tab-desc">Display & explore existing nanopubs</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          >
            <i className="fas fa-pen-fancy tab-icon"></i>
            <span className="tab-label">Create Nanopublication</span>
            <span className="tab-desc">Author new knowledge bricks</span>
          </button>
        </div>

        {/* View Tab Content */}
        {activeTab === 'view' && (
          <div className="tab-content">
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <i className="fas fa-book-open"></i> Nanopublication Viewer
                </h2>
                <p className="section-description">
                  Enter a nanopublication URI to see how Science Live beautifully displays
                  scientific knowledge with automatic template fetching and interactive features.
                </p>
              </div>

              {/* Input Section */}
              <div className="input-card">
                <label className="input-label">
                  <i className="fas fa-link"></i>
                  Nanopublication URI
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    value={nanopubUri}
                    onChange={(e) => setNanopubUri(e.target.value)}
                    className="text-input"
                    placeholder="https://w3id.org/np/RA..."
                  />
                  {nanopubUri && (
                    <button
                      onClick={() => setNanopubUri('')}
                      className="btn btn-secondary"
                    >
                      <i className="fas fa-times"></i> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Examples */}
              <div className="examples-section">
                <h3 className="examples-title">
                  <i className="fas fa-book"></i>
                  Try These Examples
                </h3>
                <div className="examples-grid">
                  <div className="example-card">
                    <div className="example-header">
                      <i className="fas fa-microscope example-icon"></i>
                      <div>
                        <h4>AIDA Sentence</h4>
                        <p>Structured scientific claim with provenance</p>
                      </div>
                    </div>
                    <button
                      onClick={() => loadViewExample('https://w3id.org/np/RAfSPxIIuH8uX9Sk2XWEJAQOQN7DjQt_-I2XEGPNj3zBg')}
                      className="btn btn-primary btn-small"
                    >
                      Load Example <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>

                  <div className="example-card">
                    <div className="example-header">
                      <i className="fas fa-file-alt example-icon"></i>
                      <div>
                        <h4>Citation Nanopub</h4>
                        <p>Bibliographic citation as a nanopublication</p>
                      </div>
                    </div>
                    <button
                      onClick={() => loadViewExample('https://w3id.org/np/RA1Rh2OoWHPP9lzK6Au5KmcTw1bBfN-fg_GnbkNJkYavo')}
                      className="btn btn-primary btn-small"
                    >
                      Load Example <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>

                  <div className="example-card">
                    <div className="example-header">
                      <i className="fas fa-file-alt example-icon"></i>
                      <div>
                        <h4>Indicate Geographical area in Nanopub</h4>
                        <p>Quote and indicate geographical location as a nanopublication</p>
                      </div>
                    </div>
                    <button
                      onClick={() => loadViewExample('https://w3id.org/np/RAuU9BrOOYHLkOki1W_jANOyuC7YYiaz14Zvn2ie0Y-Q8')}
                      className="btn btn-primary btn-small"
                    >
                      Load Example <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>

                  <div className="example-card">
                    <div className="example-header">
                      <i className="fas fa-globe example-icon"></i>
                      <div>
                        <h4>Wikidata Reference</h4>
                        <p>Linked data with Wikidata integration</p>
                      </div>
                    </div>
                    <button
                      onClick={() => loadViewExample('https://w3id.org/np/RAO-uvgIVtvbyvzb95vUz28h_AzhnhbjjVmc_dU2LD1sA')}
                      className="btn btn-primary btn-small"
                    >
                      Load Example <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewer Display */}
              <div className="viewer-section">
                {nanopubUri ? (
                  isLoadingView ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading nanopublication...</p>
                    </div>
                  ) : (
                    <div className="viewer-container">
                      <NanopubViewer
                        uri={nanopubUri}
                        onLoad={(data) => console.log('Nanopub loaded:', data)}
                        onError={(err) => console.error('Error loading nanopub:', err)}
                      />
                    </div>
                  )
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-search empty-icon"></i>
                    <h3>No Nanopublication Selected</h3>
                    <p>Enter a URI above or choose an example to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Tab Content */}
        {activeTab === 'create' && (
          <div className="tab-content">
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <i className="fas fa-pen-fancy"></i> Nanopublication Creator
                </h2>
                <p className="section-description">
                  Create your own FAIR knowledge bricks. First setup your profile, then load a template.
                </p>
              </div>

              {/* Profile Section */}
              <div className="profile-section">
                <h3 className="section-subtitle">
                  <i className="fas fa-user-circle"></i> Your Profile
                  {hasProfile && <span className="status-badge status-success">✓ Configured</span>}
                  {!hasProfile && <span className="status-badge status-warning">⚠ Not configured</span>}
                </h3>

                {!hasProfile ? (
                  <div className="profile-setup-card">
                    <p className="profile-info">
                      To create and sign nanopublications, you need to setup a profile with your name and ORCID.
                      This generates cryptographic keys to sign your nanopublications.
                    </p>
                    
                    <form onSubmit={handleSetupProfile} className="profile-form">
                      <div className="form-group">
                        <label htmlFor="profile-name">
                          <i className="fas fa-user"></i> Your Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="profile-name"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Jane Doe"
                          className="text-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="profile-orcid">
                          <i className="fas fa-id-card"></i> ORCID (optional)
                        </label>
                        <input
                          type="text"
                          id="profile-orcid"
                          value={profileOrcid}
                          onChange={(e) => setProfileOrcid(e.target.value)}
                          placeholder="https://orcid.org/0000-0002-1234-5678"
                          className="text-input"
                        />
                        <small className="help-text">
                          Learn more at <a href="https://orcid.org" target="_blank" rel="noopener noreferrer">orcid.org</a>
                        </small>
                      </div>

                      {profileError && (
                        <div className="error-message">
                          <i className="fas fa-exclamation-triangle"></i> {profileError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSettingUpProfile}
                      >
                        {isSettingUpProfile ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Generating Keys...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-key"></i> Generate Keys & Save Profile
                          </>
                        )}
                      </button>
                      
                      <p className="help-text">
                        <i className="fas fa-info-circle"></i> Keys are stored locally in your browser and never leave your device.
                      </p>
                    </form>
                  </div>
                ) : (
                  <div className="profile-display-card">
                    <div className="profile-info-grid">
                      <div className="profile-field">
                        <span className="profile-label">
                          <i className="fas fa-user"></i> Name:
                        </span>
                        <span className="profile-value">{profileName}</span>
                      </div>
                      
                      {profileOrcid && (
                        <div className="profile-field">
                          <span className="profile-label">
                            <i className="fas fa-id-card"></i> ORCID:
                          </span>
                          <span className="profile-value">
                            <a href={profileOrcid} target="_blank" rel="noopener noreferrer">
                              {profileOrcid}
                            </a>
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="profile-note">
                      <i className="fas fa-lock"></i> Your profile and keys are stored securely in your browser.
                    </p>
                  </div>
                )}
              </div>

              {/* Template Section - Only show if profile is setup */}
              {hasProfile && (
                <>
                  {/* Input Section */}
                  <div className="input-card">
                    <label className="input-label">
                      <i className="fas fa-file-code"></i>
                      Template URI
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        value={templateUri}
                        onChange={(e) => setTemplateUri(e.target.value)}
                        className="text-input"
                        placeholder="https://w3id.org/np/RA... (template URI)"
                      />
                      {templateUri && (
                        <button
                          onClick={() => setTemplateUri('')}
                          className="btn btn-secondary"
                        >
                          <i className="fas fa-times"></i> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="examples-section">
                    <h3 className="examples-title">
                      <i className="fas fa-book"></i>
                      Try These Templates
                    </h3>
                    <div className="examples-grid">
                      <div className="example-card">
                        <div className="example-header">
                          <i className="fas fa-microscope example-icon"></i>
                          <div>
                            <h4>AIDA Sentence Template</h4>
                            <p>Structured template for scientific claims</p>
                          </div>
                        </div>
                        <button
                          onClick={() => loadCreateExample('https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE')}
                          className="btn btn-primary btn-small"
                        >
                          Load Template <i className="fas fa-arrow-right"></i>
                        </button>
                      </div>

                      <div className="example-card">
                        <div className="example-header">
                          <i className="fas fa-comments example-icon"></i>
                          <div>
                            <h4>Annotate papers with Geographical Area</h4>
                            <p>Documenting geographical coverage of research based on textual evidence</p>
                          </div>
                        </div>
                        <button
                          onClick={() => loadCreateExample('https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao')}
                          className="btn btn-primary btn-small"
                        >
                          Load Template <i className="fas fa-arrow-right"></i>
                        </button>
                      </div>

                      <div className="example-card">
                        <div className="example-header">
                          <i className="fas fa-comments example-icon"></i>
                          <div>
                            <h4>Introducing a new idea</h4>
                            <p>Template for linking concepts and ideas</p>
                          </div>
                        </div>
                        <button
                          onClick={() => loadCreateExample('http://purl.org/np/RAn0gvGnriPVVIes27pRmyCzVVQk5cKbjiQNu9phlpCjE')}
                          className="btn btn-primary btn-small"
                        >
                          Load Template <i className="fas fa-arrow-right"></i>
                        </button>
                      </div>

                      <div className="example-card coming-soon">
                        <div className="example-header">
                          <i className="fas fa-star example-icon"></i>
                          <div>
                            <h4>More Templates</h4>
                            <p>Additional templates coming soon</p>
                          </div>
                        </div>
                        <span className="badge">Coming Soon</span>
                      </div>
                    </div>
                  </div>

                  {/* Creator Display */}
                  <div className="creator-section">
                    {templateUri ? (
                      isLoadingCreate ? (
                        <div className="loading-state">
                          <div className="spinner"></div>
                          <p>Loading template...</p>
                        </div>
                      ) : (
                        <div className="creator-container">
                          <div ref={containerRef}></div>
                        </div>
                      )
                    ) : (
                      <div className="empty-state">
                        <i className="fas fa-magic empty-icon"></i>
                        <h3>Ready to Create</h3>
                        <p>Enter a template URI above or choose an example to begin creating your nanopublication</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="info-panel">
          <div className="info-header">
            <i className="fas fa-lightbulb info-icon"></i>
            <h3>What You're Seeing</h3>
          </div>
          <div className="info-content">
            <p>
              <strong>Nanopublications</strong> are the smallest units of publishable information.
              Each nanopub contains:
            </p>
            <ul>
              <li>
                <strong>Assertion:</strong> The actual claim or statement
              </li>
              <li>
                <strong>Provenance:</strong> Where the information comes from
              </li>
              <li>
                <strong>Publication Info:</strong> Who created it, when, and how
              </li>
            </ul>
            <p className="info-footer">
              These tools demonstrate Science Live's core capability: making scientific
              knowledge FAIR (Findable, Accessible, Interoperable, Reusable).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
