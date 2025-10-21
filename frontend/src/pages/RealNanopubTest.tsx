import { useState } from 'react';
import { NanopubViewer } from '@sciencelivehub/nanopub-view/react';
import '@sciencelivehub/nanopub-view/src/styles/viewer.css';

export function RealNanopubTest() {
  const [nanopubUri, setNanopubUri] = useState('');
  const [showViewer, setShowViewer] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Example real nanopub URIs
  const exampleUris = [
    {
      uri: 'https://w3id.org/np/RAQAXoGL_GWDzFEp2pSwmGNouN4B56TtPORyHjEOe9ZI4',
      description: 'Simple example nanopub'
    },
    {
      uri: 'https://registry.knowledgepixels.com/np/RAnKRlRthf6F-C6zz3S1kwLoCKfSOciX5PvCVIKSJnjuI',
      description: 'Science Live open infrastructure'
    },
    {
      uri: 'https://w3id.org/np/RAEg3XH-p6Aybhw_SdF_B1zgtS5lVwH4FaHPgzO7kJPcI',
      description: 'Another example'
    }
  ];

  function loadNanopub(uri: string) {
    setNanopubUri(uri);
    setShowViewer(true);
  }

  function handleCustomLoad() {
    if (inputValue.trim()) {
      loadNanopub(inputValue.trim());
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1rem' }}>🌐 Real Nanopublication Test</h1>
        <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
          Test the viewer with real nanopublications from the network
        </p>

        {!showViewer ? (
          <div>
            {/* Example URIs */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
                📚 Example Nanopublications
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exampleUris.map((example, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      backgroundColor: 'white',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {example.description}
                      </div>
                      <code style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        wordBreak: 'break-all'
                      }}>
                        {example.uri}
                      </code>
                    </div>
                    <button
                      onClick={() => loadNanopub(example.uri)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginLeft: '16px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Load →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom URI Input */}
            <div style={{
              padding: '24px',
              backgroundColor: '#F9FAFB',
              border: '2px solid #E5E7EB',
              borderRadius: '8px'
            }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
                🔗 Load Custom Nanopub URI
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter nanopub URI (e.g., https://w3id.org/np/RA...)"
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomLoad();
                    }
                  }}
                />
                <button
                  onClick={handleCustomLoad}
                  disabled={!inputValue.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: inputValue.trim() ? '#10B981' : '#D1D5DB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Load
                </button>
              </div>
              <div style={{
                marginTop: '12px',
                fontSize: '13px',
                color: '#6B7280'
              }}>
                💡 Tip: You can find more nanopubs at nanodash.knowledgepixels.com
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Back Button and URI Display */}
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#F3F4F6',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                  Loading nanopub:
                </div>
                <code style={{
                  fontSize: '13px',
                  color: '#374151',
                  wordBreak: 'break-all'
                }}>
                  {nanopubUri}
                </code>
              </div>
              <button
                onClick={() => {
                  setShowViewer(false);
                  setInputValue('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginLeft: '16px',
                  whiteSpace: 'nowrap'
                }}
              >
                ← Back
              </button>
            </div>

            {/* Viewer */}
            <NanopubViewer uri={nanopubUri} />
          </div>
        )}
      </div>
    </div>
  );
}
