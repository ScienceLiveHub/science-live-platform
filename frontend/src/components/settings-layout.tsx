import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Building2,
  ChevronDown,
  KeyRound,
  Shield,
  User,
  Wrench,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: "Account",
    path: "account",
    icon: User,
    title: "Account Settings",
    description: "Manage your account details and preferences.",
  },
  {
    label: "Security",
    path: "security",
    icon: Shield,
    title: "Security Settings",
    description: "Manage your security settings and two-factor authentication.",
  },
  {
    label: "API Keys",
    path: "api-keys",
    icon: KeyRound,
    title: "API Keys",
    description: "Manage your API keys for programmatic access.",
  },
  {
    label: "Organizations",
    path: "organizations",
    icon: Building2,
    title: "Organizations",
    description: "Manage your organization memberships and settings.",
  },
  {
    label: "Advanced",
    path: "advanced",
    icon: Wrench,
    title: "Advanced Settings",
    description: "Manage advanced settings.",
  },
];

function SettingsSidebar({ className }: { className?: string }) {
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop() || "account";

  return (
    <nav className={cn("flex flex-col gap-1 font-bold", className)}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={`/settings/${item.path}`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive || currentPath === item.path
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function MobileSettingsMenu() {
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop() || "account";
  const currentItem =
    navItems.find((item) => item.path === currentPath) || navItems[0];
  const CurrentIcon = currentItem.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            {currentItem.label}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-50">
        {navItems.map((item) => (
          <DropdownMenuItem key={item.path} asChild>
            <NavLink
              to={`/settings/${item.path}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 w-full cursor-pointer",
                  (isActive || currentPath === item.path) && "bg-muted",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SettingsContent({ item }: { item: NavItem }) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-semibold">{item.title}</h2>
        <p className="text-muted-foreground">{item.description}</p>
      </div>
    </div>
  );
}

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <main className="container mx-auto flex grow flex-col self-center p-4 md:p-6 md:max-w-300">
      {/* Mobile Menu - shown on small screens */}
      <div className="md:hidden mb-4">
        <MobileSettingsMenu />
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar - hidden on small screens */}
        <aside className="hidden md:block w-48 shrink-0">
          <SettingsSidebar className="sticky top-6" />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 md:pl-6">{children}</div>
      </div>
    </main>
  );
}
