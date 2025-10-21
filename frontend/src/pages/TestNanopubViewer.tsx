// frontend/src/pages/TestNanopubViewer.tsx
import { useState } from 'react';
import { NanopubViewer } from '@sciencelivehub/nanopub-view/react';
import '@sciencelivehub/nanopub-view/src/styles/viewer.css';

export function TestNanopubViewer() {
  const [uri, setUri] = useState('https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc');
  const [currentUri, setCurrentUri] = useState(uri);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = (data: any) => {
    console.log('Nanopub loaded:', data);
    setLoading(false);
    setError(null);
  };

  const handleError = (err: Error) => {
    console.error('Error loading nanopub:', err);
    setError(err.message);
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCurrentUri(uri);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Nanopub Viewer Test</h1>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="Enter nanopublication URI..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {loading ? 'Loading...' : 'Load Nanopub'}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '15px',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '4px',
          color: '#991b1b',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Example Links */}
      <div style={{ marginBottom: '30px' }}>
        <p style={{ marginBottom: '10px', fontWeight: '600' }}>Try these examples:</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setUri('https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc')}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            ImageNet Quote
          </button>
          <button
            onClick={() => setUri('https://w3id.org/np/RAltRkGOtHoj5LcBJZ62AMVOAVc0hnxt45LMaCXgxJ4fw')}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Example 2
          </button>
          <button
            onClick={() => setUri('https://w3id.org/np/RAyE-3z1_NojbRmAw6LuTgIoyLfhZ1zJ-dsuwOLM3SpZc')}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Example 3
          </button>
          <button
            onClick={() => setUri('https://w3id.org/np/RAE8VvRRXE65JsAsqwlNxoY7HSZ9t2Gvqo_YqAWcEDrcU')}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Example 4
          </button>
          <button
            onClick={() => setUri('https://w3id.org/kpxl/ios/ds/np/RAKN2Y56DjlJHRGLK75_vK0Aa7_jl6PwENnzHkqroL-QA')}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Example 5
          </button>
        </div>
      </div>

      {/* Nanopub Viewer */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <NanopubViewer
          uri={currentUri}
          onLoad={handleLoad}
          onError={handleError}
          options={{
            theme: 'default',
            showMetadata: true
          }}
        />
      </div>
    </div>
  );
}
