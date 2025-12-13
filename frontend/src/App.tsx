import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar01 } from "./components/ui/shadcn-io/navbar-01";
import { Toaster } from "./components/ui/sonner";
import AccountSettings from "./pages/AccountSettings";
import AuthPage from "./pages/AuthPage";
import Demo from "./pages/Demo";
import EmailVerfied from "./pages/EmailVerified";
import { HomePage } from "./pages/homepage/page";
import CreateNanopub from "./pages/np/create/CreateNanopub";
import ViewNanopub from "./pages/np/ViewNanopub";
import { NanopubTest } from "./pages/old/NanopubTest";
import NanopubTestPage from "./pages/old/NanopubTestPage";
import { RealNanopubTest } from "./pages/old/RealNanopubTest";
import { TestNanopubViewer } from "./pages/old/TestNanopubViewer";
import UserProfile from "./pages/UserProfile";
import { Providers } from "./providers";

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
          <Route path="/account/:pathname" element={<AccountSettings />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile" element={<UserProfile />} />

          {/* Main Pages - For Demo/Production */}
          <Route path="/" element={<HomePage />} />
          <Route path="/np/" element={<ViewNanopub />} />
          <Route path="/np/demo" element={<Demo />} />
          <Route path="/np/:uri" element={<ViewNanopub />} />
          <Route path="/np/create" element={<CreateNanopub />} />
          <Route path="/np/create/:uri" element={<CreateNanopub />} />
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
