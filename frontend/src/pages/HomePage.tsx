import { DatabaseTest } from '@/components/DatabaseTest';

export function HomePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>🧬 Science Live Platform</h1>
        <p>Step 1: Foundation Setup Complete ✅</p>
        <p>Step 2: Database Setup - Testing Now...</p>
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
        >
          Test Database (JSON)
        </a>
      </div>
    </div>
  );
}
