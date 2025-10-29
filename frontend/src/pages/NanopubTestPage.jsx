import React, { useState } from 'react';
import { NanopubViewer } from '@sciencelivehub/nanopub-view/react';
import NanopubCreator from '@sciencelivehub/nanopub-create';
import '@sciencelivehub/nanopub-view/dist/nanopub-viewer.css';
import '@sciencelivehub/nanopub-create/dist/nanopub-creator.css';

// Science Live color palette
const colors = {
  primary: '#be2e78',
  primaryHover: '#a02463',
  primaryLight: '#f5e8f0',
  secondary: '#101e43',
  secondaryLight: '#1a2d5a',
  accent: '#f8deed',
  textDark: '#1a1a1a',
  textMedium: '#4a4a4a',
  textLight: '#6b7280',
  bgLight: '#f8f9fa',
  bgSubtle: '#f3f4f6',
  borderLight: '#e5e7eb',
  border: '#d1d5db',
};

export default function NanopubTestPage() {
  const [activeTab, setActiveTab] = useState('view');
  const [nanopubUri, setNanopubUri] = useState('');
  const [templateUri, setTemplateUri] = useState('');
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);

  const loadViewExample = async (uri) => {
    setNanopubUri(uri);
    setIsLoadingView(true);
    // Small delay to show loading state
    setTimeout(() => setIsLoadingView(false), 500);
  };

  const loadCreateExample = async (uri) => {
    setTemplateUri(uri);
    setIsLoadingCreate(true);
    setTimeout(() => setIsLoadingCreate(false), 500);
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      paddingBottom: '20px',
      borderBottom: `2px solid ${colors.borderLight}`,
    },
    title: {
      fontSize: '2.2em',
      color: colors.secondary,
      marginBottom: '10px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    subtitle: {
      color: colors.textLight,
      fontSize: '1.1em',
    },
    tabNav: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      borderBottom: `2px solid ${colors.borderLight}`,
    },
    tab: (isActive) => ({
      padding: '12px 24px',
      border: 'none',
      background: isActive ? colors.primary : 'transparent',
      color: isActive ? 'white' : colors.textMedium,
      cursor: 'pointer',
      borderRadius: '8px 8px 0 0',
      fontWeight: isActive ? 600 : 400,
      fontSize: '16px',
      transition: 'all 0.2s ease',
    }),
    inputGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 600,
      color: colors.secondary,
      fontSize: '0.95em',
    },
    inputRow: {
      display: 'flex',
      gap: '10px',
    },
    input: {
      flex: 1,
      padding: '12px',
      border: `1px solid ${colors.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
    },
    button: {
      padding: '12px 24px',
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
    },
    secondaryButton: {
      padding: '8px 16px',
      background: 'white',
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 600,
      transition: 'all 0.2s ease',
      marginTop: '8px',
    },
    examplesBox: {
      marginTop: '20px',
      padding: '20px',
      background: colors.accent,
      borderRadius: '8px',
      border: `1px solid ${colors.borderLight}`,
    },
    examplesTitle: {
      fontSize: '1.1em',
      fontWeight: 600,
      color: colors.secondary,
      marginBottom: '15px',
    },
    examplesList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    exampleItem: {
      marginBottom: '12px',
      padding: '12px',
      background: 'white',
      borderRadius: '6px',
      border: `1px solid ${colors.borderLight}`,
    },
    exampleButton: {
      background: 'none',
      border: 'none',
      color: colors.primary,
      cursor: 'pointer',
      textDecoration: 'underline',
      fontSize: '14px',
      padding: 0,
      fontWeight: 500,
    },
    exampleDesc: {
      color: colors.textLight,
      fontSize: '13px',
      marginTop: '4px',
    },
    viewerContainer: {
      border: `1px solid ${colors.borderLight}`,
      borderRadius: '8px',
      padding: '20px',
      background: 'white',
      minHeight: '400px',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: colors.textLight,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🧪 Nanopub Libraries Test Page</h1>
        <p style={styles.subtitle}>Test nanopub-view and nanopub-create libraries</p>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button
          onClick={() => setActiveTab('view')}
          style={styles.tab(activeTab === 'view')}
          onMouseEnter={(e) => {
            if (activeTab !== 'view') {
              e.currentTarget.style.background = colors.bgSubtle;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'view') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          📖 View Nanopub
        </button>
        <button
          onClick={() => setActiveTab('create')}
          style={styles.tab(activeTab === 'create')}
          onMouseEnter={(e) => {
            if (activeTab !== 'create') {
              e.currentTarget.style.background = colors.bgSubtle;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'create') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          ✍️ Create Nanopub
        </button>
      </div>

      {/* View Tab */}
      {activeTab === 'view' && (
        <div>
          <h2 style={{ color: colors.secondary, marginBottom: '15px' }}>View Nanopublication</h2>
          <p style={{ color: colors.textMedium, marginBottom: '25px' }}>
            Enter a nanopublication URI or try one of the examples below to see how nanopub-view displays it.
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Nanopub URI:</label>
            <div style={styles.inputRow}>
              <input
                type="text"
                value={nanopubUri}
                onChange={(e) => setNanopubUri(e.target.value)}
                style={styles.input}
                placeholder="https://w3id.org/np/RA..."
              />
              <button
                onClick={() => setNanopubUri('')}
                style={styles.button}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.primaryHover;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={styles.viewerContainer}>
            {nanopubUri ? (
              isLoadingView ? (
                <div style={styles.emptyState}>Loading...</div>
              ) : (
                <NanopubViewer
                  uri={nanopubUri}
                  onLoad={(data) => console.log('Nanopub loaded:', data)}
                  onError={(err) => console.error('Error loading nanopub:', err)}
                />
              )
            ) : (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '1.2em', marginBottom: '10px' }}>👆 Enter a nanopub URI above</p>
                <p>or choose an example below to get started</p>
              </div>
            )}
          </div>

          <div style={styles.examplesBox}>
            <h3 style={styles.examplesTitle}>📚 Try These Examples:</h3>
            <ul style={styles.examplesList}>
              <li style={styles.exampleItem}>
                <button
                  style={styles.exampleButton}
                  onClick={() => loadViewExample('https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc')}
                >
                  AIDA Sentence Example
                </button>
                <div style={styles.exampleDesc}>Example of an AIDA sentence nanopublication</div>
              </li>
              <li style={styles.exampleItem}>
                <button
                  style={styles.exampleButton}
                  onClick={() => loadViewExample('https://w3id.org/np/RAC7iNf2wxtsJVzmNRzEPqAQsZfO0Y8rrUufR71kvWwPY')}
                >
                  Citation Nanopub
                </button>
                <div style={styles.exampleDesc}>Example of a citation nanopublication</div>
              </li>
              <li style={styles.exampleItem}>
                <button
                  style={styles.exampleButton}
                  onClick={() => loadViewExample('https://w3id.org/np/RA95PFSIiN6-B5qh-a89s78Rmna22y2Yy7rGHEI9R6Vws')}
                >
                  Wikidata Reference
                </button>
                <div style={styles.exampleDesc}>Nanopub with Wikidata references</div>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div>
          <h2 style={{ color: colors.secondary, marginBottom: '15px' }}>Create Nanopublication</h2>
          <p style={{ color: colors.textMedium, marginBottom: '25px' }}>
            Enter a template URI or try one of the examples below to create a new nanopublication.
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Template URI:</label>
            <div style={styles.inputRow}>
              <input
                type="text"
                value={templateUri}
                onChange={(e) => setTemplateUri(e.target.value)}
                style={styles.input}
                placeholder="https://w3id.org/np/RA..."
              />
              <button
                onClick={() => setTemplateUri('')}
                style={styles.button}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.primaryHover;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={styles.viewerContainer}>
            {templateUri ? (
              isLoadingCreate ? (
                <div style={styles.emptyState}>Loading template...</div>
              ) : (
                <NanopubCreateDemo templateUri={templateUri} />
              )
            ) : (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '1.2em', marginBottom: '10px' }}>👆 Enter a template URI above</p>
                <p>or choose an example below to get started</p>
              </div>
            )}
          </div>

          <div style={styles.examplesBox}>
            <h3 style={styles.examplesTitle}>📝 Template Examples:</h3>
            <ul style={styles.examplesList}>
              <li style={styles.exampleItem}>
                <button
                  style={styles.exampleButton}
                  onClick={() => loadCreateExample('https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo')}
                >
                  CiTO Citation Template
                </button>
                <div style={styles.exampleDesc}>Create a citation using CiTO ontology</div>
              </li>
              <li style={styles.exampleItem}>
                <button
                  style={styles.exampleButton}
                  onClick={() => loadCreateExample('https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE')}
                >
                  AIDA Sentence Template
                </button>
                <div style={styles.exampleDesc}>Create an AIDA sentence nanopublication</div>
              </li>
              <li style={styles.exampleItem}>
                <button
                  style={styles.exampleButton}
                  onClick={() => loadCreateExample('https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI')}
                >
                  Comment Template
                </button>
                <div style={styles.exampleDesc}>Comment or evaluate papers</div>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Component for the Create demo
function NanopubCreateDemo({ templateUri }) {
  const [creator, setCreator] = React.useState(null);
  const [error, setError] = React.useState(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const initCreator = async () => {
      try {
        console.log('Initializing NanopubCreator...');
        const newCreator = new NanopubCreator();
        
        // Wait a bit for WASM to initialize in the background
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCreator(newCreator);
        console.log('NanopubCreator initialized successfully');
      } catch (err) {
        console.error('Failed to initialize NanopubCreator:', err);
        setError(err.message);
      }
    };

    initCreator();
  }, []);

  React.useEffect(() => {
    const loadTemplate = async () => {
      if (!creator || !containerRef.current || !templateUri) {
        return;
      }

      try {
        console.log('Loading template:', templateUri);
        containerRef.current.innerHTML = '<p style="color: #6b7280;">Loading template...</p>';
        await creator.renderFromTemplateUri(templateUri, containerRef.current);
        console.log('Template loaded successfully');
      } catch (err) {
        console.error('Failed to load template:', err);
        containerRef.current.innerHTML = `<p style="color: #ef4444; padding: 20px; background: #fee2e2; border-radius: 6px;">
          <strong>Error loading template:</strong> ${err.message}
        </p>`;
      }
    };

    loadTemplate();
  }, [creator, templateUri]);

  if (error) {
    return (
      <div style={{ color: '#ef4444', padding: '20px', background: '#fee2e2', borderRadius: '6px' }}>
        <strong>Error initializing creator:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      {!creator && <p style={{ color: '#6b7280' }}>Initializing creator...</p>}
      <div ref={containerRef}></div>
    </div>
  );
}
