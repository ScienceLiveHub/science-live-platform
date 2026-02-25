import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MissingEmailDialog } from "./components/missing-email-dialog";
import { Navbar01 } from "./components/ui/shadcn-io/navbar-01";
import { Toaster } from "./components/ui/sonner";
import AuthPage from "./pages/AuthPage";
import Demo from "./pages/Demo";
import EmailVerified from "./pages/EmailVerified";
import { HomePage } from "./pages/homepage/page";
import CreateNanopub from "./pages/np/create/CreateNanopub";
import ViewNanopub from "./pages/np/ViewNanopub";
import AccountSettings from "./pages/settings/AccountSettings";
import OrganizationSettings from "./pages/settings/OrganizationSettings";
import SigningKeysSettings from "./pages/settings/SigningKeysSettings";
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
          {/* Pages/paths provided by better-auth-ui */}
          <Route path="/auth/:pathname" element={<AuthPage />} />
          {/* User app settings */}
          <Route path="/settings/advanced" element={<SigningKeysSettings />} />
          {/* User account/auth related settings */}
          <Route path="/settings/:pathname" element={<AccountSettings />} />
          {/* Organization settings (for admin/owner) */}
          <Route
            path="/organization/:pathname"
            element={<OrganizationSettings />}
          />
          {/* View any users public profile */}
          <Route path="/user/:userId" element={<UserProfile />} />
          {/* View the current users own profile */}
          <Route path="/profile" element={<UserProfile />} />
          {/* Main App Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/np/" element={<ViewNanopub />} />
          <Route path="/np/create" element={<CreateNanopub />} />
          <Route path="/np/create/:uri" element={<CreateNanopub />} />
          <Route path="/np/demo" element={<Demo />} />
          <Route path="/email-verified" element={<EmailVerified />} />{" "}
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}

export default App;
