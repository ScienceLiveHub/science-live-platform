import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, HandHelping, Link2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * The Create modes, as peer tabs: a single nanopublication (the existing flow), a
 * whole FORRT replication chain, or a replication request. Rendered at the top of
 * the CreateNanopub page and the wizards, so switching is one click and the
 * top-level nav stays just Browse / Create.
 */
export default function CreateModeTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith("/np/create/chain")
    ? "chain"
    : pathname.startsWith("/np/create/request")
      ? "request"
      : "single";

  // The shared active-tab style (bg-input/30) is nearly invisible against the
  // muted list in dark mode. Give the active tab a solid background, a border,
  // a shadow and bolder text so the two modes are clearly distinguishable.
  const triggerCls =
    "flex items-center gap-1.5 data-[state=active]:font-semibold " +
    "data-[state=active]:shadow-sm data-[state=active]:border-border " +
    "dark:data-[state=active]:bg-background dark:data-[state=active]:border-border";

  return (
    <Tabs
      value={active}
      onValueChange={(v) =>
        navigate(
          v === "chain"
            ? "/np/create/chain"
            : v === "request"
              ? "/np/create/request"
              : "/np/create",
        )
      }
    >
      <TabsList>
        <TabsTrigger value="single" className={triggerCls}>
          <FileText className="h-4 w-4" />
          Create Nanopublication
        </TabsTrigger>
        <TabsTrigger value="chain" className={triggerCls}>
          <Link2 className="h-4 w-4" />
          Create FORRT Chain
        </TabsTrigger>
        <TabsTrigger value="request" className={triggerCls}>
          <HandHelping className="h-4 w-4" />
          Request a Replication
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
