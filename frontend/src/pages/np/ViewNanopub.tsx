import { NanopubIcon } from "@/components/nanopub-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, MapTileLayer, MapZoomControl } from "@/components/ui/map";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncLabel } from "@/hooks/use-labels";
import { useNanopub } from "@/hooks/use-nanopub";
import { GEOLOCATION, SEARCH_NANOPUBS } from "@/lib/queries";
import {
  executeBindSparql,
  NANOPUB_SPARQL_ENDPOINT_FULL,
  NANOPUB_SPARQL_ENDPOINT_TEXT,
} from "@/lib/sparql";
import { isNanopubUri } from "@/lib/uri";
import { wktToGeoJSON } from "@terraformer/wkt";
import type { LatLngExpression } from "leaflet";
import {
  ExternalLink,
  FileCode,
  FileSymlink,
  Globe,
  MapPin,
  MessageCircle,
  Quote,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import { Link, useSearchParams } from "react-router-dom";
import { NanopubReferences } from "./components/NanopubReferences";
import SearchResultList, { SearchResult } from "./components/SearchResultList";
import { NanopubViewer } from "./view/NanopubViewer";
import ViewerDemo from "./ViewerDemo";

// ---------------------------------------------------------------------------
// Types for GeoLocation
// ---------------------------------------------------------------------------

/** A single result row from the geolocation SPARQL query. */
interface GeoLocation {
  np: string;
  paper: string;
  location: string;
  locationLabel: string;
  date: Date;
  wkt?: string;
  bbox?: string;
  quotation: string;
  quotationEnd?: string;
  comment: string;
  creator: string;
}

// ---------------------------------------------------------------------------
// Map sub-components
// ---------------------------------------------------------------------------

interface GeoLayerProps {
  locations: GeoLocation[];
  onSelect: (loc: GeoLocation) => void;
  selectedNanopub: string | null;
}

/**
 * Renders all GeoJSON geometries on the map and fits bounds to show them all.
 */
function GeoLayers({ locations, onSelect, selectedNanopub }: GeoLayerProps) {
  const map = useMap();
  const hasInitialFit = useRef(false);

  // Parse all WKT geometries
  const parsed = useMemo(() => {
    return locations
      .map((loc) => {
        const wktStr = loc.wkt || loc.bbox;
        if (!wktStr) return null;
        try {
          const geoJson = wktToGeoJSON(wktStr);
          return { loc, geoJson: geoJson as unknown as GeoJSON.GeoJsonObject };
        } catch (e) {
          console.warn("Failed to parse WKT:", wktStr, e);
          return null;
        }
      })
      .filter(Boolean) as {
      loc: GeoLocation;
      geoJson: GeoJSON.GeoJsonObject;
    }[];
  }, [locations]);

  // Fit bounds to all geometries on initial load
  useEffect(() => {
    if (hasInitialFit.current || parsed.length === 0 || !map) return;

    // Use a small timeout to let GeoJSON layers render
    const timer = setTimeout(() => {
      try {
        const L = (window as any).L;
        if (!L) return;

        const allBounds = L.latLngBounds([]);
        for (const { geoJson } of parsed) {
          const layer = L.geoJSON(geoJson);
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            allBounds.extend(bounds);
          }
        }
        if (allBounds.isValid()) {
          map.fitBounds(allBounds, {
            padding: [40, 40],
            maxZoom: 12,
          });
        }
        hasInitialFit.current = true;
      } catch (e) {
        console.warn("Failed to fit bounds:", e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [parsed, map]);

  return (
    <>
      {parsed.map(({ loc, geoJson }, idx) => {
        const isSelected = loc.np === selectedNanopub;
        return (
          <GeoJSON
            key={`${loc.np}-${loc.location}-${idx}`}
            data={geoJson as any}
            style={{
              color: isSelected ? "#7c3aed" : "#0d9488",
              weight: isSelected ? 3 : 2,
              fillColor: isSelected ? "#8b5cf6" : "#14b8a6",
              fillOpacity: isSelected ? 0.35 : 0.2,
            }}
            pointToLayer={(_feature, latlng) => {
              const L = (window as any).L;
              if (!L) return null as any;
              return L.circleMarker(latlng, {
                radius: 10,
              });
            }}
            eventHandlers={{
              click: () => onSelect(loc),
            }}
            onEachFeature={(_feature, layer) => {
              layer.bindTooltip(loc.locationLabel, {
                sticky: true,
                className:
                  "bg-popover text-popover-foreground rounded-md border px-2 py-1 text-sm shadow-md font-sans",
              });
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Tracks the current map bounds and reports them via callback.
 */
function MapBoundsTracker({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth(),
      });
    };

    // Update bounds on initial load
    updateBounds();

    // Update bounds on map move/zoom
    map.on("moveend", updateBounds);
    map.on("zoomend", updateBounds);

    return () => {
      map.off("moveend", updateBounds);
      map.off("zoomend", updateBounds);
    };
  }, [map, onBoundsChange]);

  return null;
}

// ---------------------------------------------------------------------------
// Detail panel for selected location
// ---------------------------------------------------------------------------

function LocationDetail({ location }: { location: GeoLocation }) {
  return (
    <div className="border-l-4 border-l-teal-500 bg-muted/30 rounded-r-md p-4 space-y-3">
      <h4 className="flex items-center gap-2 font-semibold">
        <MapPin className="h-4 w-4 text-teal-600" />
        {location.locationLabel}
        <Link to={`/np/?uri=${location.np}`} target="_blank">
          {/* <Globe className="h-4 w-4 text-muted-foreground hover:text-foreground" /> */}
          <NanopubIcon className="h-3 w-3" />
        </Link>
      </h4>
      {location.paper && (
        <div>
          <a
            href={location.paper}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
          >
            <AsyncLabel uri={location.paper} />
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      )}
      {location.quotation && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            <Quote className="h-3 w-3 inline-block mr-1" />
            Quotation
          </p>
          <blockquote className="border-l-2 border-teal-300 bg-teal-50 dark:bg-teal-950/20 pl-3 py-1 text-sm italic text-foreground/80 rounded-r-md">
            {location.quotation}
            {location.quotationEnd && (
              <>
                {" … "}
                {location.quotationEnd}
              </>
            )}
          </blockquote>
        </div>
      )}

      {location.comment && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            <MessageCircle className="h-3 w-3 inline-block mr-1" />
            Comment
          </p>
          <p className="text-sm text-foreground/80">{location.comment}</p>
        </div>
      )}
      {/* Creator */}
      {location.creator && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            By{" "}
            <a
              href={location.creator}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
            >
              <AsyncLabel uri={location.creator} />
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

/**
 * ViewNanopub
 *
 * All-in-one search page for nanopublications.
 * If the input is a nanopub URI (detected via isNanopubUri), loads and displays it.
 * Otherwise, performs a text search across the nanopub network and displays results.
 * Includes a tabbed interface for General Search and Geographic Search.
 */

export default function ViewNanopub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const uri = searchParams.get("uri") || "";
  const searchQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(uri || searchQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Map state
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLocations, setMapLocations] = useState<GeoLocation[]>([]);
  const [selectedMapLocation, setSelectedMapLocation] =
    useState<GeoLocation | null>(null);
  const [mapBounds, setMapBounds] = useState<{
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null>(null);

  // Track if we've done the initial fetch when geo tab becomes active
  const mapInitialFetchDoneRef = useRef(false);

  // Current active tab
  const [activeTab, setActiveTab] = useState<string>("general");

  const {
    store,
    loading: nanopubLoading,
    error: nanopubError,
    creatorUserIdsByOrcid,
  } = useNanopub(uri);

  // Determine if current input is a nanopub URI
  const isNanopubInput = isNanopubUri(inputValue);

  useEffect(() => {
    setInputValue(uri || searchQuery);
  }, [uri, searchQuery]);

  // Load search results when searchQuery changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(null);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);

    const performSearch = async () => {
      try {
        const rows = await executeBindSparql(
          SEARCH_NANOPUBS,
          { searchTerm: searchQuery },
          NANOPUB_SPARQL_ENDPOINT_TEXT,
          controller.signal,
        );

        setSearchResults(
          rows.map((row) => ({
            np: row.np,
            label: row.label || "",
            date: new Date(row.date),
            creator: row.creator || "",
            isExample: row.isExample === "true",
            maxScore: parseFloat(row.maxScore),
            referenceCount: parseInt(row.referenceCount),
          })),
        );
      } catch (e: any) {
        // Ignore errors from aborted requests
        if (e?.name === "AbortError") {
          return;
        }
        console.error("Search failed:", e);
        setSearchError(e?.message || "Search failed");
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [searchQuery]);

  // Fetch geolocation data
  const fetchMapData = useCallback(
    async (search: string, bounds: typeof mapBounds) => {
      try {
        setMapLoading(true);
        setMapError(null);

        // Build bind parameters
        const bindParams: Record<string, string> = {};

        // Add search term if provided
        if (search.trim()) {
          bindParams.searchTerm = search.trim();
        }

        // Add bounding box if provided
        if (bounds) {
          bindParams.bboxMinX = bounds.minLng.toString();
          bindParams.bboxMinY = bounds.minLat.toString();
          bindParams.bboxMaxX = bounds.maxLng.toString();
          bindParams.bboxMaxY = bounds.maxLat.toString();
        }

        const rows = await executeBindSparql(
          GEOLOCATION,
          bindParams,
          NANOPUB_SPARQL_ENDPOINT_FULL,
        );

        setMapLocations(
          rows
            .filter((row) => row.wkt || row.bbox)
            .map((row) => ({
              np: row.np,
              paper: row.paper,
              location: row.location,
              locationLabel: row.location_label ?? "",
              date: new Date(row.date),
              wkt: row.wkt,
              bbox: row.bbox,
              quotation: row.quotation ?? "",
              quotationEnd: row.quotation_end,
              comment: row.comment ?? "",
              creator: row.creator ?? "",
            })),
        );
      } catch (e: any) {
        // Ignore errors from aborted requests
        if (e?.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch geolocation data:", e);
        setMapError(e?.message || "Failed to fetch geolocation data");
      } finally {
        setMapLoading(false);
      }
    },
    [],
  );

  // Reset the initial fetch flag when switching away from geo tab
  useEffect(() => {
    if (activeTab !== "geo") {
      mapInitialFetchDoneRef.current = false;
    }
  }, [activeTab]);

  const handleGoClick = () => {
    if (!inputValue.trim() && activeTab !== "geo") return;

    // If on Geographic Search tab, perform map area search
    if (activeTab === "geo") {
      if (mapBounds) {
        fetchMapData(inputValue, mapBounds);
      }
      return;
    }

    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      setSearchParams(next);
      setSearchResults(null);
    } else {
      // It's a search query - perform search
      const next = new URLSearchParams(searchParams);
      next.set("q", inputValue);
      next.delete("uri");
      setSearchParams(next);
    }
  };

  const handleMapLocationSelect = useCallback((loc: GeoLocation) => {
    setSelectedMapLocation(loc);
  }, []);

  const loading = nanopubLoading || searchLoading;
  const error = nanopubError || searchError;

  // Check if we have active content (URI loaded or search performed)
  const hasActiveContent = uri || searchQuery;

  const defaultCenter: LatLngExpression = [20, 0];

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-4xl">
      {/* Prominent Search Field - always visible but different styles based on context */}
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
              disabled={loading || (activeTab === "geo" && mapLoading)}
              onClick={handleGoClick}
            >
              {loading || (activeTab === "geo" && mapLoading) ? (
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

      {/* Tabbed Search Interface - only when no active content */}
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
              <TabsTrigger value="geo" className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                Geographic Search
              </TabsTrigger>
            </TabsList>

            {/* General Search Tab */}
            <TabsContent value="general" className="mt-4">
              {/* Status / Errors */}
              {loading && hasActiveContent && (
                <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
                  <Spinner />{" "}
                  <span>
                    {searchQuery
                      ? "Searching..."
                      : "Loading nanopublication..."}
                  </span>
                </div>
              )}
              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
                  {error}
                </div>
              )}

              {/* Search Results */}
              {searchQuery &&
              !searchLoading &&
              !searchError &&
              searchResults ? (
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold">
                    {searchResults.length} result
                    {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
                  </h2>
                  {searchResults.length > 0 ? (
                    <SearchResultList searchResults={searchResults} />
                  ) : (
                    <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
                      No results found for your search.
                    </div>
                  )}
                </div>
              ) : null}
            </TabsContent>

            {/* Geographic Search Tab */}
            <TabsContent value="geo" className="mt-4">
              <div className="flex flex-col gap-4">
                {/* Map loading/error states */}
                {mapLoading && (
                  <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
                    <Spinner /> <span>Loading geographical data…</span>
                  </div>
                )}
                {mapError && (
                  <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 text-red-900 dark:text-red-300">
                    {mapError}
                  </div>
                )}

                {/* Map */}
                <div className="rounded-md border overflow-hidden h-[400px]">
                  <Map
                    center={defaultCenter}
                    zoom={2}
                    className="h-full w-full"
                    scrollWheelZoom={true}
                  >
                    <MapTileLayer />
                    <MapZoomControl />
                    <MapBoundsTracker onBoundsChange={setMapBounds} />
                    {!mapLoading && !mapError && (
                      <GeoLayers
                        locations={mapLocations}
                        onSelect={handleMapLocationSelect}
                        selectedNanopub={selectedMapLocation?.np ?? null}
                      />
                    )}
                  </Map>
                </div>

                {/* Selected Location Detail */}
                {selectedMapLocation && (
                  <LocationDetail location={selectedMapLocation} />
                )}

                {/* Map Results count */}
                {!mapLoading && !mapError && mapLocations.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {mapLocations.length} location
                    {mapLocations.length !== 1 ? "s" : ""} found
                    {mapBounds && " (filtered by map area)"}
                  </p>
                )}

                {/* Map Results List */}
                {!mapLoading && !mapError && mapLocations.length > 0 && (
                  <SearchResultList
                    searchResults={mapLocations.map((l) => ({
                      np: l.np,
                      creator: l.creator,
                      date: l.date,
                      label: l.locationLabel,
                    }))}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Status / Errors - shown when there IS active content */}
      {loading && hasActiveContent && (
        <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Spinner />{" "}
          <span>
            {searchQuery ? "Searching..." : "Loading nanopublication..."}
          </span>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}

      {/* Nanopub Viewer */}
      {uri && !searchQuery ? (
        <>
          {!nanopubLoading && !nanopubError && (
            <>
              {store ? (
                <>
                  <NanopubViewer
                    store={store}
                    creatorUserIdsByOrcid={creatorUserIdsByOrcid}
                  />{" "}
                  {/* Nanopub References Panel - shown when viewing a nanopub */}
                  <NanopubReferences nanopubUri={uri} />
                </>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {/* Search Results - shown when there IS active content */}
      {searchQuery && !searchLoading && !searchError && searchResults ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
            for "{searchQuery}"
          </h2>
          {searchResults.length > 0 ? (
            <SearchResultList searchResults={searchResults} />
          ) : (
            <div className="rounded-md border bg-muted/30 p-4 text-muted-foreground">
              No results found for your search.
            </div>
          )}
        </div>
      ) : null}

      {/* Default Demo when no URI or search and general tab is active */}
      {!uri && !searchQuery && activeTab === "general" ? (
        <div className="mt-8">
          <ViewerDemo />
        </div>
      ) : null}
    </main>
  );
}
