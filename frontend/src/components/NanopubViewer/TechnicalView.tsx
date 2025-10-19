import type { ParsedNanopub } from '@/types/nanopub';

interface TechnicalViewProps {
  data: ParsedNanopub;
}

export function TechnicalView({ data }: TechnicalViewProps) {
  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Metadata */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1F2937',
          borderBottom: '2px solid #E5E7EB',
          paddingBottom: '8px'
        }}>
          📋 Metadata
        </h2>
        <div style={{ 
          backgroundColor: '#F9FAFB', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          {data.metadata.creator && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Creator:</strong> <code>{data.metadata.creator}</code>
            </div>
          )}
          {data.metadata.created && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Created:</strong> <code>{data.metadata.created}</code>
            </div>
          )}
          {data.metadata.license && (
            <div style={{ marginBottom: '8px' }}>
              <strong>License:</strong> <code>{data.metadata.license}</code>
            </div>
          )}
          <div>
            <strong>URI:</strong> <code style={{ 
              wordBreak: 'break-all',
              fontSize: '12px'
            }}>{data.uri}</code>
          </div>
        </div>
      </section>

      {/* Assertions */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1F2937',
          borderBottom: '2px solid #E5E7EB',
          paddingBottom: '8px'
        }}>
          💡 Assertions ({data.assertions.length})
        </h2>
        {data.assertions.map((assertion, idx) => (
          <div 
            key={idx}
            style={{
              backgroundColor: '#F0FDF4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #BBF7D0',
              marginBottom: '12px'
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#065F46' }}>Subject:</strong>{' '}
              <code style={{ fontSize: '13px' }}>{assertion.subject}</code>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#065F46' }}>Predicate:</strong>{' '}
              <code style={{ fontSize: '13px' }}>{assertion.predicate}</code>
            </div>
            <div>
              <strong style={{ color: '#065F46' }}>Object:</strong>{' '}
              <code style={{ fontSize: '13px' }}>{assertion.object}</code>
            </div>
          </div>
        ))}
      </section>

      {/* Provenance */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1F2937',
          borderBottom: '2px solid #E5E7EB',
          paddingBottom: '8px'
        }}>
          🔍 Provenance
        </h2>
        <div style={{ 
          backgroundColor: '#FEF3C7', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #FDE68A'
        }}>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            fontSize: '12px',
            color: '#78350F'
          }}>
            {JSON.stringify(data.provenance, null, 2)}
          </pre>
        </div>
      </section>

      {/* Publication Info */}
      <section>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1F2937',
          borderBottom: '2px solid #E5E7EB',
          paddingBottom: '8px'
        }}>
          📄 Publication Info
        </h2>
        <div style={{ 
          backgroundColor: '#EFF6FF', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #BFDBFE'
        }}>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            fontSize: '12px',
            color: '#1E3A8A'
          }}>
            {JSON.stringify(data.publicationInfo, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}
