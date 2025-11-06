import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { NanopubTest } from "./pages/NanopubTest";
import { RealNanopubTest } from "./pages/RealNanopubTest";
import { TestNanopubViewer } from "./pages/TestNanopubViewer";
import NanopubTestPage from "./pages/NanopubTestPage";
import { SignInPage } from "./pages/SignInPage";
import { SignupPage } from "./pages/SignupPage";
import { SignOut } from "./pages/SignOut";

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth TODO: replace with better-auth-ui */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signout" element={<SignOut />} />
        <Route path="/signup" element={<SignupPage />} /> {/* CURRENT DEMO */}
        {/* Main Pages - For Demo/Production */}
        <Route path="/" element={<HomePage />} />
        <Route path="/test-nanopub" element={<NanopubTestPage />} />{" "}
        {/* CURRENT DEMO */}
        {/* Development/Testing Pages - Keep for development */}
        <Route path="/test-parser" element={<NanopubTest />} />
        <Route path="/test-real" element={<RealNanopubTest />} />
        <Route path="/test-viewer" element={<TestNanopubViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
