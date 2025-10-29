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
        <Route path="/" element={<HomePage />} />
        <Route path="/test-parser" element={<NanopubTest />} />
        <Route path="/test-real" element={<RealNanopubTest />} />
        <Route path="/test-viewer" element={<TestNanopubViewer />} />
        <Route path="/test-nanopub" element={<NanopubTestPage />} />
      </Routes>
    </Router>
  );
}

export default App;
