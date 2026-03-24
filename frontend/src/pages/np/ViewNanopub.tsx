import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LatLngBoundsExpression } from "leaflet";
import { Brain, FileCode, Globe, Search } from "lucide-react";
import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AiQueryTab } from "./components/ai-query";
import { GeneralSearch } from "./components/GeneralSearch";
import { GeoSearchWithRef, type GeoSearchHandle } from "./components/GeoSearch";
import { NanopubView } from "./components/NanopubView";

/** Approximate bounding box for Southern Europe, used in Geo example. */
const EUROPE_BOUNDS: LatLngBoundsExpression = [
  [34, -10], // south-west (lat, lng)
  [48, 35], // north-east (lat, lng)
];

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

/**
 * ViewNanopub
 *
 * Unified entry point for browsing nanopublications. Provides:
 *
 * 1. **General Search** - keyword search across the nanopub network.
 * 2. **Geographic Search** - map-based region search, optionally filtered by keyword.
 * 3. **AI Search** - COMING SOON - AI assisted queries.
 * 4. **View Nanopub** - load and display a nanopub by its URI.
 *
 * Each tab manages its own search input. The component shows either the tab
 * interface (when no content is active) or the content views (when a URI or
 * search query is active).
 */
export default function ViewNanopub() {
  const [searchParams] = useSearchParams();
  const uri = searchParams.get("uri") || "";
  const searchQuery = searchParams.get("q") || "";

  const geoSearchRef = useRef<GeoSearchHandle>(null);

  // Check if we have active content (URI loaded or search performed)
  const hasActiveContent = uri || searchQuery;

  /** Example: fly the map to Southern Europe and search for "crab". */
  const handleCrabExample = useCallback(() => {
    geoSearchRef.current?.flyToAndSearch(EUROPE_BOUNDS, "crab");
  }, []);

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-4xl">
      {/* ----------------------------------------------------------------- */}
      {/* Tabbed Search Interface - only when no active content             */}
      {/* ----------------------------------------------------------------- */}
      {!hasActiveContent && (
        <>
          <div className="flex flex-col items-center justify-center flex-1">
            <h1 className="flex items-center text-xl text-muted-foreground font-black my-8">
              <FileCode className="mr-4" />
              BROWSE NANOPUBLICATIONS
            </h1>
          </div>
          <div className="w-full max-w-2xl mx-auto">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full justify-center">
                <TabsTrigger
                  value="general"
                  className="flex items-center gap-1.5"
                >
                  <Search className="h-4 w-4" />
                  General Search
                </TabsTrigger>
                <TabsTrigger
                  value="aiquery"
                  className="flex items-center gap-1.5"
                >
                  <Brain className="h-4 w-4" />
                  AI Query
                </TabsTrigger>
                <TabsTrigger value="geo" className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  Geographic Search
                </TabsTrigger>
              </TabsList>

              {/* General Search Tab */}
              <TabsContent value="general" className="mt-4">
                <GeneralSearch />
              </TabsContent>

              {/* AI Query Tab */}
              <TabsContent value="aiquery" className="mt-4">
                <AiQueryTab />
              </TabsContent>

              {/* Geographic Search Tab */}
              <TabsContent value="geo" className="mt-4">
                <GeoSearchWithRef ref={geoSearchRef} />
                <div className="mt-10 mb-4 gap-2 w-full md:w-auto">
                  Some examples:
                  <ul className="mt-2 space-y-2">
                    <li className="flex items-start gap-2">
                      <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
                      <button
                        type="button"
                        onClick={handleCrabExample}
                        className="text-purple-600 dark:text-purple-400 hover:underline text-left cursor-pointer"
                      >
                        Data about Crabs around Southern Europe
                      </button>
                    </li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Active Content Area - shows compact search + results              */}
      {/* ----------------------------------------------------------------- */}

      {/* General Search with compact search bar */}
      {searchQuery && (
        <div className="w-full max-w-2xl mx-auto">
          <GeneralSearch />
        </div>
      )}

      {/* View a single nanopub by URI */}
      {uri && !searchQuery && <NanopubView uri={uri} />}
    </main>
  );
}
