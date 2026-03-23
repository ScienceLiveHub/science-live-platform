import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isNanopubUri } from "@/lib/uri";
import type { LatLngBoundsExpression } from "leaflet";
import { Brain, FileCode, FileSymlink, Globe, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GeneralSearch } from "./components/GeneralSearch";
import { GeoSearchWithRef, type GeoSearchHandle } from "./components/GeoSearch";
import { NanopubView } from "./components/NanopubView";
import ViewerDemo from "./ViewerDemo";

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
 * The input field auto-detects whether the user entered a nanopub URI or a
 * search query and routes to the appropriate view. A tab control switches
 * between General Search and Geographic Search when no content is active.
 */
export default function ViewNanopub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const uri = searchParams.get("uri") || "";
  const searchQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(uri || searchQuery);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [geoLoading, setGeoLoading] = useState(false);

  const geoSearchRef = useRef<GeoSearchHandle>(null);

  // Determine if current input is a nanopub URI
  const isNanopubInput = isNanopubUri(inputValue);

  // Check if we have active content (URI loaded or search performed)
  const hasActiveContent = uri || searchQuery;

  // Sync input value when URL params change externally
  // (e.g. clicking a link or browser back/forward)
  useEffect(() => {
    setInputValue(uri || searchQuery);
  }, [uri, searchQuery]);

  const handleGoClick = () => {
    if (!inputValue.trim() && activeTab !== "geo") return;

    // If on Geographic Search tab, trigger the geo search
    if (activeTab === "geo") {
      geoSearchRef.current?.search();
      return;
    }

    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      setSearchParams(next);
    } else {
      // It's a search query - perform search
      const next = new URLSearchParams(searchParams);
      next.set("q", inputValue);
      next.delete("uri");
      setSearchParams(next);
    }
  };

  /** Example: fly the map to Southern Europe and search for "crab". */
  const handleCrabExample = useCallback(() => {
    setInputValue("crab");
    geoSearchRef.current?.flyToAndSearch(EUROPE_BOUNDS, "crab");
  }, []);

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-4xl">
      {/* ----------------------------------------------------------------- */}
      {/* Search / URI Input Field                                          */}
      {/* ----------------------------------------------------------------- */}
      <div
        className={`flex flex-col items-center ${!hasActiveContent ? "justify-center flex-1" : ""}`}
      >
        {!hasActiveContent && (
          <h1 className="flex items-center text-xl text-muted-foreground font-black my-8">
            <FileCode className="mr-4" />
            BROWSE NANOPUBLICATIONS
          </h1>
        )}

        <div className={`w-full max-w-2xl ${hasActiveContent ? "" : "px-4"}`}>
          <div className="flex gap-2">
            <Input
              type="text"
              className={`w-full ${!hasActiveContent ? "h-12 text-lg px-6" : "justify-end"}`}
              placeholder={
                activeTab === "geo"
                  ? "Enter search query..."
                  : "Enter search query or nanopub URI..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleGoClick();
                }
              }}
            />
            <Button
              className={`inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 ${!hasActiveContent ? "h-12 px-8 text-lg" : "px-6"}`}
              disabled={geoLoading}
              onClick={handleGoClick}
            >
              {geoLoading ? (
                <Spinner className="h-5 w-5" />
              ) : activeTab === "geo" ? (
                <>
                  {!hasActiveContent && <Globe className="h-5 w-5" />}
                  Search Area
                </>
              ) : isNanopubInput ? (
                <>
                  {!hasActiveContent && <FileSymlink className="h-5 w-5" />}
                  View
                </>
              ) : (
                <>
                  {!hasActiveContent && <Search className="h-5 w-5" />}
                  Go
                </>
              )}
            </Button>
          </div>

          {!hasActiveContent && (
            <p className="text-center text-muted-foreground mt-4 text-sm">
              {activeTab === "geo"
                ? "Move/Pan the map to select an area of interest then submit a search query"
                : "Search across the Nanopublications network or enter a nanopublication URI to view it"}
            </p>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Tabbed Search Interface - only when no active content             */}
      {/* ----------------------------------------------------------------- */}
      {!hasActiveContent && (
        <div className="w-full max-w-2xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
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
              {/* Example links shown when idle */}
              <ViewerDemo />
            </TabsContent>

            {/* AI Query Tab */}
            <TabsContent value="aiquery" className="mt-4">
              COMING SOON
            </TabsContent>

            {/* Geographic Search Tab */}
            <TabsContent value="geo" className="mt-4">
              <GeoSearchWithRef
                ref={geoSearchRef}
                searchTerm={inputValue}
                onSearchStart={() => setGeoLoading(true)}
                onSearchEnd={() => setGeoLoading(false)}
              />
              {!!inputValue || (
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
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Active Content Area                                               */}
      {/* ----------------------------------------------------------------- */}

      {/* View a single nanopub by URI */}
      {uri && !searchQuery && <NanopubView uri={uri} />}

      {/* General keyword search results */}
      {searchQuery && <GeneralSearch searchQuery={searchQuery} />}
    </main>
  );
}
