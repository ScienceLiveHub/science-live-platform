import { DatabaseTest } from '@/components/DatabaseTest';

export function HomePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>🧬 Science Live Platform</h1>
        <p>Step 1: Foundation Setup Complete ✅</p>
        <p>Step 2: Database Setup Complete ✅</p>
        <p>Step 3: Nanopub Parser - Testing...</p>
      </div>

      <DatabaseTest />

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a 
          href="/api/v1/health" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ marginRight: '1rem' }}
        >
          Test API Health
        </a>
        <a 
          href="/api/v1/users/test" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ marginRight: '1rem' }}
        >
          Test Database (JSON)
        </a>
        <a 
          href="/test-parser"
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#4F46E5',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}
        >
          🧪 Test Nanopub Parser
        </a>
      </div>
    </div>
  );
}
