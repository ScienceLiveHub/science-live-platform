import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Link2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * The two Create modes, as peer tabs: a single nanopublication (the existing
 * flow) or a whole FORRT replication chain. Rendered at the top of both the
 * CreateNanopub page and the ForrtChainWizard, so switching is one click and the
 * top-level nav stays just Browse / Create.
 */
export default function CreateModeTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith("/np/create/chain") ? "chain" : "single";

  return (
    <Tabs
      value={active}
      onValueChange={(v) =>
        navigate(v === "chain" ? "/np/create/chain" : "/np/create")
      }
    >
      <TabsList>
        <TabsTrigger value="single" className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          Create Nanopublication
        </TabsTrigger>
        <TabsTrigger value="chain" className="flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          Create FORRT Chain
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
