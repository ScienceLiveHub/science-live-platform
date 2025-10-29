import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NanopubTest } from './pages/NanopubTest';
import { RealNanopubTest } from './pages/RealNanopubTest';
import { TestNanopubViewer } from './pages/TestNanopubViewer';
import NanopubTestPage from './pages/NanopubTestPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Pages - For Demo/Production */}
        <Route path="/" element={<HomePage />} />
        <Route path="/test-nanopub" element={<NanopubTestPage />} /> {/* CURRENT DEMO */}
        
        {/* Development/Testing Pages - Keep for development */}
        <Route path="/test-parser" element={<NanopubTest />} />
        <Route path="/test-real" element={<RealNanopubTest />} />
        <Route path="/test-viewer" element={<TestNanopubViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
