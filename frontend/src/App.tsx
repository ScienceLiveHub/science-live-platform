import { Routes, Route, BrowserRouter, useNavigate } from "react-router-dom";
import { HomePage } from "./pages/homepage/page";
import { NanopubTest } from "./pages/NanopubTest";
import { RealNanopubTest } from "./pages/RealNanopubTest";
import { TestNanopubViewer } from "./pages/TestNanopubViewer";
import NanopubTestPage from "./pages/NanopubTestPage";
import AuthPage from "./pages/AuthPage";
import { Providers } from "./providers";

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route path="/auth/:pathname" element={<AuthPage />} />

          {/* Main Pages - For Demo/Production */}
          <Route path="/" element={<HomePage />} />
          <Route path="/test-nanopub" element={<NanopubTestPage />} />

          {/* Development/Testing Pages - Keep for development */}
          <Route path="/test-parser" element={<NanopubTest />} />
          <Route path="/test-real" element={<RealNanopubTest />} />
          <Route path="/test-viewer" element={<TestNanopubViewer />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}

export default App;
