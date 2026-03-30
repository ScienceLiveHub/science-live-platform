/**
 * GeoMap Page
 *
 * Displays a world map showing locations of nanopublications that have
 * geographical coverage data. Each location is rendered as a polygon or
 * marker on the map. Clicking a location loads and displays the
 * corresponding nanopublication below the map.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, MapTileLayer, MapZoomControl } from "@/components/ui/map";
import { Spinner } from "@/components/ui/spinner";
import { GEOLOCATION } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import type { LatLngExpression } from "leaflet";
import { Globe, Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import SearchResultList from "./components/SearchResultList";
import {
  GeoLayers,
  LocationDetail,
  MapBoundsTracker,
  parseGeoResults,
  type GeoLocation,
  type MapBounds,
} from "./components/geo";

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function GeoMap() {
  const [locations, setLocations] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const detailRef = useRef<HTMLDivElement>(null);

  // Fetch geolocation data
  const fetchData = useCallback(
    async (search: string, bounds: MapBounds | null) => {
      try {
        setLoading(true);
        setError(null);

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

        setLocations(parseGeoResults(rows));
      } catch (e: any) {
        console.error("Failed to fetch geolocation data:", e);
        setError(e?.message || "Failed to fetch geolocation data");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Handle search button click
  const handleSearch = useCallback(() => {
    fetchData(searchTerm, mapBounds);
  }, [searchTerm, mapBounds, fetchData]);

  const handleSelect = useCallback((loc: GeoLocation) => {
    setSelectedLocation(loc);
    // Scroll to detail panel after a short delay for render
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const defaultCenter: LatLngExpression = [20, 0];

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <h1 className="flex items-center text-xl text-muted-foreground font-black my-8">
          <Globe className="mr-4" />
          BROWSE NANOPUBLICATIONS BY REGION
        </h1>
      </div>
      <p className="text-muted-foreground text-sm -mt-4">
        Explore nanopublications with geographical coverage. Zoom and pan the
        map to narrow search region.
      </p>

      {/* Loading State */}
      {loading && (
        <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Spinner /> <span>Loading geographical data…</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 text-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter a search term or leave empty to show everything in the region."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={loading} className="shrink-0">
          {loading ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search Here
        </Button>
      </div>

      {/* Map */}
      <div className="rounded-md border overflow-hidden h-[500px] md:h-[600px]">
        <Map
          center={defaultCenter}
          zoom={2}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <MapTileLayer />
          <MapZoomControl />
          <MapBoundsTracker onBoundsChange={setMapBounds} />
          {!loading && !error && (
            <GeoLayers
              locations={locations}
              onSelect={handleSelect}
              selectedNanopub={selectedLocation?.np ?? null}
            />
          )}
        </Map>
      </div>

      {/* Selected Location Detail */}
      {selectedLocation && (
        <div ref={detailRef} className="flex flex-col gap-4">
          <LocationDetail location={selectedLocation} />
        </div>
      )}

      {/* Results count */}
      {!loading && !error && locations.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {locations.length} location{locations.length !== 1 ? "s" : ""} found
            {mapBounds && " (filtered by map area)"}
          </p>
          <SearchResultList
            searchResults={locations.map((l) => ({
              np: l.np,
              creator: l.creator,
              date: l.date,
              label: l.locationLabel,
            }))}
          />
        </>
      )}
    </main>
  );
}
