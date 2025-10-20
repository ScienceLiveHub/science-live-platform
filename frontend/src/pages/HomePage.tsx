import { DatabaseTest } from '@/components/DatabaseTest';

export function HomePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>🧬 Science Live Platform</h1>
        <p>Step 1: Foundation Setup Complete ✅</p>
        <p>Step 2: Database Setup Complete ✅</p>
        <p>Step 3: Nanopub Parser Complete ✅</p>
      </div>

      <DatabaseTest />

      <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a 
          href="/api/v1/health" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          Test API Health
        </a>
        <a 
          href="/api/v1/users/test" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          Test Database
        </a>
        <a 
          href="/test-parser"
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#4F46E5',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          🧪 Test Parser (Sample)
        </a>
        <a 
          href="/test-real"
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#DC2626',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🌐 Test Real Nanopubs
        </a>
      </div>
    </div>
  );
}
