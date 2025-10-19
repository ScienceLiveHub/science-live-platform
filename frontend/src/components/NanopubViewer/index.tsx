import { useState, useEffect } from 'react';
import { parseNanopub } from '@/lib/nanopub-parser';
import { DisplayModeSelector } from './DisplayModeSelector';
import { TechnicalView } from './TechnicalView';
import { SimplifiedView } from './SimplifiedView';
import type { ParsedNanopub, DisplayMode } from '@/types/nanopub';

interface NanopubViewerProps {
  nanopubUri?: string;
  nanopubContent?: string;
}

export function NanopubViewer({ nanopubUri, nanopubContent }: NanopubViewerProps) {
  const [mode, setMode] = useState<DisplayMode>('simplified');
  const [parsedData, setParsedData] = useState<ParsedNanopub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadNanopub();
  }, [nanopubUri, nanopubContent]);

  async function loadNanopub() {
    setLoading(true);
    setError('');

    try {
      let content = nanopubContent;

      // If URI provided, fetch the content
      if (nanopubUri && !content) {
        const response = await fetch(`/api/v1/nanopubs/fetch?uri=${encodeURIComponent(nanopubUri)}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch nanopublication');
        }
        
        content = data.content;
      }

      if (!content) {
        throw new Error('No nanopublication content provided');
      }

      // Parse the nanopub
      const parsed = await parseNanopub(content);
      setParsedData(parsed);
    } catch (err) {
      console.error('Error loading nanopub:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        padding: '48px', 
        textAlign: 'center',
        color: '#6B7280'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ fontSize: '18px' }}>Loading nanopublication...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#FEE2E2',
        border: '2px solid #DC2626',
        borderRadius: '8px',
        color: '#991B1B'
      }}>
        <h3 style={{ marginBottom: '12px' }}>❌ Error Loading Nanopublication</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#FEF3C7',
        border: '2px solid #F59E0B',
        borderRadius: '8px',
        color: '#78350F'
      }}>
        <p>No nanopublication data available</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <DisplayModeSelector mode={mode} onChange={setMode} />

      {mode === 'technical' && (
        <TechnicalView data={parsedData} />
      )}

      {mode === 'simplified' && (
        <SimplifiedView 
          data={parsedData}
          onViewTechnical={() => setMode('technical')}
        />
      )}

      {mode === 'beginner' && (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: '#F0FDF4',
          borderRadius: '12px',
          border: '2px solid #BBF7D0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
          <h3 style={{ fontSize: '24px', marginBottom: '16px', color: '#065F46' }}>
            Beginner-Friendly View
          </h3>
          <p style={{ fontSize: '16px', color: '#047857', marginBottom: '24px' }}>
            Coming soon! This will show an AI-generated, easy-to-understand explanation.
          </p>
          <button
            onClick={() => setMode('simplified')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            View Simplified Instead
          </button>
        </div>
      )}
    </div>
  );
}
