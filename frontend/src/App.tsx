import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NanopubTest } from './pages/NanopubTest';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test-parser" element={<NanopubTest />} />
      </Routes>
    </Router>
  );
}

export default App;
