import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MissingEmailDialog } from "./components/missing-email-dialog";
import { Navbar01 } from "./components/ui/shadcn-io/navbar-01";
import { Toaster } from "./components/ui/sonner";
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
          {/* Pages/paths provided by better-auth-ui */}
          <Route path="/auth/:pathname" element={<AuthPage />} />
          {/* Users account settings */}
          <Route path="/account/:pathname" element={<AccountSettings />} />
          {/* View any users public profile */}
          <Route path="/user/:userId" element={<UserProfile />} />
          {/* View the current users own profile */}
          <Route path="/profile" element={<UserProfile />} />
          {/* Manage users organizations (memberships for member + admin for admin/owner) */}
          <Route
            path="/organization/:pathname"
            element={<OrganizationSettings />}
          />
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
