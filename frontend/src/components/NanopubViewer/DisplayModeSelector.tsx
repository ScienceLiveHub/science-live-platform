import { DisplayMode } from '@/types/nanopub';

interface DisplayModeSelectorProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

export function DisplayModeSelector({ mode, onChange }: DisplayModeSelectorProps) {
  const modes: { value: DisplayMode; label: string; icon: string; description: string }[] = [
    {
      value: 'beginner',
      label: 'Beginner',
      icon: '🌱',
      description: 'Simple, easy-to-understand explanation'
    },
    {
      value: 'simplified',
      label: 'Simplified',
      icon: '📊',
      description: 'Key information with context'
    },
    {
      value: 'technical',
      label: 'Technical',
      icon: '🔬',
      description: 'Full RDF triples and metadata'
    }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px'
    }}>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: mode === m.value ? '#4F46E5' : 'white',
            color: mode === m.value ? 'white' : '#374151',
            border: mode === m.value ? '2px solid #4F46E5' : '2px solid #E5E7EB',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: mode === m.value ? '600' : '400',
            fontSize: '14px'
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{m.icon}</div>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{m.label}</div>
          <div style={{ 
            fontSize: '11px', 
            opacity: mode === m.value ? 0.9 : 0.6,
            lineHeight: '1.3'
          }}>
            {m.description}
          </div>
        </button>
      ))}
    </div>
  );
}
