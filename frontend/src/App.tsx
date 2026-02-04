import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MissingEmailDialog } from "./components/missing-email-dialog";
import { Navbar01 } from "./components/ui/shadcn-io/navbar-01";
import { Toaster } from "./components/ui/sonner";
import AcceptInvitation from "./pages/AcceptInvitation";
import AccountSettings from "./pages/AccountSettings";
import AuthPage from "./pages/AuthPage";
import Demo from "./pages/Demo";
import EmailVerified from "./pages/EmailVerified";
import { HomePage } from "./pages/homepage/page";
import CreateNanopub from "./pages/np/create/CreateNanopub";
import ViewNanopub from "./pages/np/ViewNanopub";
import OrganizationSettings from "./pages/OrganizationSettings";
import UserProfile from "./pages/UserProfile";
import { Providers } from "./providers";

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <div className="relative w-full">
          <Navbar01 />
          <Toaster />
          <MissingEmailDialog />
        </div>
        <Routes>
          <Route path="/auth/:pathname" element={<AuthPage />} />
          <Route path="/account/:pathname" element={<AccountSettings />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile" element={<UserProfile />} />

          <Route
            path="/organization/:pathname"
            element={<OrganizationSettings />}
          />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

          {/* Main Pages - For Demo/Production */}
          <Route path="/" element={<HomePage />} />
          <Route path="/np/" element={<ViewNanopub />} />
          <Route path="/np/demo" element={<Demo />} />
          <Route path="/np/create" element={<CreateNanopub />} />
          <Route path="/np/create/:uri" element={<CreateNanopub />} />
          <Route path="/email-verified" element={<EmailVerified />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}

export default App;
