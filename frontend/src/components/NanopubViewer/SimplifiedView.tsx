import type { ParsedNanopub } from '@/types/nanopub';

interface SimplifiedViewProps {
  data: ParsedNanopub;
  onViewTechnical: () => void;
}

export function SimplifiedView({ data, onViewTechnical }: SimplifiedViewProps) {
  return (
    <div>
      {/* Header Card */}
      <div style={{
        backgroundColor: '#EFF6FF',
        padding: '24px',
        borderRadius: '12px',
        border: '2px solid #BFDBFE',
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#1E3A8A',
          marginBottom: '16px'
        }}>
          Research Claim
        </h2>
        
        {data.metadata.creator && (
          <div style={{ marginBottom: '8px', color: '#1E40AF' }}>
            <strong>👤 Created by:</strong> {data.metadata.creator.split('/').pop()}
          </div>
        )}
        
        {data.metadata.created && (
          <div style={{ color: '#1E40AF' }}>
            <strong>📅 Date:</strong> {new Date(data.metadata.created).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Main Assertions */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1F2937'
        }}>
          💡 Key Claims
        </h3>
        
        {data.assertions.map((assertion, idx) => (
          <div 
            key={idx}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #E5E7EB',
              marginBottom: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ 
              fontSize: '16px', 
              lineHeight: '1.6',
              color: '#374151'
            }}>
              <span style={{ fontWeight: '600', color: '#4F46E5' }}>
                {assertion.subjectLabel}
              </span>
              {' '}
              <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                {assertion.predicateLabel}
              </span>
              {' '}
              <span style={{ fontWeight: '600', color: '#059669' }}>
                {assertion.objectLabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Source Information */}
      {data.provenance.other && data.provenance.other.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#1F2937'
          }}>
            📚 Source Information
          </h3>
          <div style={{
            backgroundColor: '#FEF3C7',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #FDE68A',
            color: '#78350F'
          }}>
            This claim has {data.provenance.other.length} provenance record(s)
          </div>
        </div>
      )}

      {/* Technical Details Link */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          onClick={onViewTechnical}
          style={{
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#4F46E5',
            border: '2px solid #4F46E5',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🔬 View Technical Details
        </button>
      </div>
    </div>
  );
}
