import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar01 } from "./components/ui/shadcn-io/navbar-01";
import { Toaster } from "./components/ui/sonner";
import AccountPage from "./pages/AccountPage";
import AuthPage from "./pages/AuthPage";
import EmailVerfied from "./pages/EmailVerified";
import { HomePage } from "./pages/homepage/page";
import { NanopubTest } from "./pages/NanopubTest";
import NanopubTestPage from "./pages/NanopubTestPage";
import { RealNanopubTest } from "./pages/RealNanopubTest";
import { TestNanopubViewer } from "./pages/TestNanopubViewer";
import { Providers } from "./providers";
import ViewNanopub from "./pubs/ViewNanopub";
import ViewRaw from "./pubs/ViewRaw";

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <div className="relative w-full">
          <Navbar01 />
          <Toaster />
        </div>
        <Routes>
          <Route path="/auth/:pathname" element={<AuthPage />} />
          <Route path="/account/:pathname" element={<AccountPage />} />

          {/* Main Pages - For Demo/Production */}
          <Route path="/" element={<HomePage />} />
          <Route path="/np-raw/:nanopubId" element={<ViewRaw />} />
          <Route path="/np/:uri" element={<ViewNanopub />} />
          <Route path="/test-nanopub" element={<NanopubTestPage />} />
          <Route path="/email-verified" element={<EmailVerfied />} />

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
