import { Routes, Route, BrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/homepage/page";
import { NanopubTest } from "./pages/NanopubTest";
import { RealNanopubTest } from "./pages/RealNanopubTest";
import { TestNanopubViewer } from "./pages/TestNanopubViewer";
import NanopubTestPage from "./pages/NanopubTestPage";
import AuthPage from "./pages/AuthPage";
import { Providers } from "./providers";
import AccountPage from "./pages/AccountPage";
import { Navbar01 } from "./components/ui/shadcn-io/navbar-01";

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <div className="relative w-full">
          <Navbar01 />
        </div>
        <Routes>
          <Route path="/auth/:pathname" element={<AuthPage />} />
          <Route path="/account/:pathname" element={<AccountPage />} />

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
