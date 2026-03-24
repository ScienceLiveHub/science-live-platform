import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, MapTileLayer, MapZoomControl } from "@/components/ui/map";
import { Spinner } from "@/components/ui/spinner";
import { GEOLOCATION } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { Globe } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useMap } from "react-leaflet";
import SearchResultList from "./SearchResultList";
import {
  GeoLayers,
  LocationDetail,
  MapBoundsTracker,
  parseGeoResults,
  type GeoLocation,
  type MapBounds,
} from "./geo";

interface GeoSearchProps {
  /** Optional initial keyword to filter geographic results. */
  initialSearchTerm?: string;
  /** Called when map bounds change so the parent can track them. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Called when a search is initiated (for parent loading state). */
  onSearchStart?: () => void;
  /** Called when a search completes (for parent loading state). */
  onSearchEnd?: () => void;
}

const DEFAULT_CENTER: LatLngExpression = [20, 0];

/**
 * GeoSearch
 *
 * Displays a map-based geographic search interface for nanopublications.
 * Users can pan/zoom the map to define a region, optionally enter a keyword,
 * and search for nanopubs with geographical coverage in that area.
 *
 * This component manages its own search input state.
 */
export function GeoSearch({
  initialSearchTerm = "",
  onBoundsChange,
  onSearchStart,
  onSearchEnd,
}: GeoSearchProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<GeoLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(
    null,
  );
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const handleBoundsChange = useCallback(
    (newBounds: MapBounds) => {
      setBounds(newBounds);
      onBoundsChange?.(newBounds);
    },
    [onBoundsChange],
  );

  /** Fetch geolocation data for the current map area and optional search term. */
  const fetchMapData = useCallback(
    async (search: string, mapBounds: MapBounds | null) => {
      try {
        setLoading(true);
        setError(null);
        onSearchStart?.();

        const bindParams: Record<string, string> = {};

        if (search.trim()) {
          bindParams.searchTerm = search.trim();
        }

        if (mapBounds) {
          bindParams.bboxMinX = mapBounds.minLng.toString();
          bindParams.bboxMinY = mapBounds.minLat.toString();
          bindParams.bboxMaxX = mapBounds.maxLng.toString();
          bindParams.bboxMaxY = mapBounds.maxLat.toString();
        }

        const rows = await executeBindSparql(
          GEOLOCATION,
          bindParams,
          NANOPUB_SPARQL_ENDPOINT_FULL,
        );

        setLocations(parseGeoResults(rows));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Failed to fetch geolocation data:", e);
        setError(e?.message || "Failed to fetch geolocation data");
      } finally {
        setLoading(false);
        onSearchEnd?.();
      }
    },
    [onSearchStart, onSearchEnd],
  );

  /** Trigger a search using the current bounds and search term. */
  const search = useCallback(() => {
    fetchMapData(searchTerm, bounds);
  }, [fetchMapData, searchTerm, bounds]);

  const handleLocationSelect = useCallback((loc: GeoLocation) => {
    setSelectedLocation(loc);
  }, []);

  return (
    <GeoSearchInner
      loading={loading}
      error={error}
      locations={locations}
      selectedLocation={selectedLocation}
      bounds={bounds}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      onBoundsChange={handleBoundsChange}
      onLocationSelect={handleLocationSelect}
      onSearch={search}
    />
  );
}

// ---------------------------------------------------------------------------
// Expose search trigger via ref for parent components
// ---------------------------------------------------------------------------

export interface GeoSearchHandle {
  /** Trigger a geographic search with the current bounds and search term. */
  search: () => void;
  /** Whether a search is currently in progress. */
  loading: boolean;
  /** Fly the map to the given bounds, then trigger a search with the given term. */
  flyToAndSearch: (bounds: LatLngBoundsExpression, searchTerm: string) => void;
}

/**
 * GeoSearch with ref-based imperative handle.
 *
 * The parent can call `ref.current.search()` to trigger a search,
 * and read `ref.current.loading` to check loading state.
 */
export const GeoSearchWithRef = forwardRef<GeoSearchHandle, GeoSearchProps>(
  function GeoSearchWithRef(
    { initialSearchTerm = "", onBoundsChange, onSearchStart, onSearchEnd },
    ref,
  ) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locations, setLocations] = useState<GeoLocation[]>([]);
    const [selectedLocation, setSelectedLocation] =
      useState<GeoLocation | null>(null);
    const [bounds, setBounds] = useState<MapBounds | null>(null);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const boundsRef = useRef<MapBounds | null>(null);
    const mapFlyToRef = useRef<
      ((bounds: LatLngBoundsExpression, onComplete: () => void) => void) | null
    >(null);

    const handleBoundsChange = useCallback(
      (newBounds: MapBounds) => {
        setBounds(newBounds);
        boundsRef.current = newBounds;
        onBoundsChange?.(newBounds);
      },
      [onBoundsChange],
    );

    const fetchMapData = useCallback(
      async (search: string, mapBounds: MapBounds | null) => {
        try {
          setLoading(true);
          setError(null);
          onSearchStart?.();

          const bindParams: Record<string, string> = {};

          if (search.trim()) {
            bindParams.searchTerm = search.trim();
          }

          if (mapBounds) {
            bindParams.bboxMinX = mapBounds.minLng.toString();
            bindParams.bboxMinY = mapBounds.minLat.toString();
            bindParams.bboxMaxX = mapBounds.maxLng.toString();
            bindParams.bboxMaxY = mapBounds.maxLat.toString();
          }

          const rows = await executeBindSparql(
            GEOLOCATION,
            bindParams,
            NANOPUB_SPARQL_ENDPOINT_FULL,
          );

          setLocations(parseGeoResults(rows));
        } catch (e: any) {
          if (e?.name === "AbortError") return;
          console.error("Failed to fetch geolocation data:", e);
          setError(e?.message || "Failed to fetch geolocation data");
        } finally {
          setLoading(false);
          onSearchEnd?.();
        }
      },
      [onSearchStart, onSearchEnd],
    );

    // We need a ref to searchTerm so the imperative handle always has the latest
    const searchTermRef = useRef(searchTerm);
    searchTermRef.current = searchTerm;

    useImperativeHandle(
      ref,
      () => ({
        search: () => {
          fetchMapData(searchTermRef.current, boundsRef.current);
        },
        get loading() {
          return loading;
        },
        flyToAndSearch: (
          targetBounds: LatLngBoundsExpression,
          term: string,
        ) => {
          // Update the search term when flying to a location
          setSearchTerm(term);
          if (mapFlyToRef.current) {
            mapFlyToRef.current(targetBounds, () => {
              // After the fly animation completes, search with the final bounds
              fetchMapData(term, boundsRef.current);
            });
          }
        },
      }),
      [fetchMapData, loading],
    );

    const handleLocationSelect = useCallback((loc: GeoLocation) => {
      setSelectedLocation(loc);
    }, []);

    const handleMapReady = useCallback(
      (
        flyTo: (bounds: LatLngBoundsExpression, onComplete: () => void) => void,
      ) => {
        mapFlyToRef.current = flyTo;
      },
      [],
    );

    /** Trigger a search using the current bounds and search term. */
    const search = useCallback(() => {
      fetchMapData(searchTerm, bounds);
    }, [fetchMapData, searchTerm, bounds]);

    return (
      <GeoSearchInner
        loading={loading}
        error={error}
        locations={locations}
        selectedLocation={selectedLocation}
        bounds={bounds}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onBoundsChange={handleBoundsChange}
        onLocationSelect={handleLocationSelect}
        onMapReady={handleMapReady}
        onSearch={search}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Shared inner rendering component
// ---------------------------------------------------------------------------

interface GeoSearchInnerProps {
  loading: boolean;
  error: string | null;
  locations: GeoLocation[];
  selectedLocation: GeoLocation | null;
  bounds: MapBounds | null;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  onLocationSelect: (loc: GeoLocation) => void;
  onSearch: () => void;
  /** Callback to expose the map's flyToBounds function to the parent. */
  onMapReady?: (
    flyTo: (bounds: LatLngBoundsExpression, onComplete: () => void) => void,
  ) => void;
}

/**
 * Helper component that lives inside the Map to expose flyToBounds.
 * Uses react-leaflet's useMap() hook to access the Leaflet map instance.
 */
function MapFlyToController({
  onReady,
}: {
  onReady: (
    flyTo: (bounds: LatLngBoundsExpression, onComplete: () => void) => void,
  ) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    onReady((bounds: LatLngBoundsExpression, onComplete: () => void) => {
      map.once("moveend", () => {
        // Small delay to let MapBoundsTracker update boundsRef first
        setTimeout(onComplete, 50);
      });
      map.flyToBounds(bounds, { duration: 0.6, padding: [20, 20] });
    });
  }, [map, onReady]);

  return null;
}

function GeoSearchInner({
  loading,
  error,
  locations,
  selectedLocation,
  bounds,
  searchTerm,
  onSearchTermChange,
  onBoundsChange,
  onLocationSelect,
  onMapReady,
  onSearch,
}: GeoSearchInnerProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          className="h-12 text-lg px-6"
          placeholder="Enter search query..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch();
            }
          }}
        />
        <Button
          className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 h-12 px-8 text-lg"
          disabled={loading}
          onClick={onSearch}
        >
          {loading ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <>
              <Globe className="h-5 w-5 mr-2" />
              Search Area
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-muted-foreground text-sm">
        Move/Pan the map to select an area of interest then submit a search
        query
      </p>

      {/* Map loading/error states */}
      {loading && (
        <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Spinner /> <span>Loading geographical data…</span>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 text-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="rounded-md border overflow-hidden h-[400px]">
        <Map
          center={DEFAULT_CENTER}
          zoom={2}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <MapTileLayer />
          <MapZoomControl />
          {onMapReady && <MapFlyToController onReady={onMapReady} />}
          <MapBoundsTracker onBoundsChange={onBoundsChange} />
          {!loading && !error && (
            <GeoLayers
              locations={locations}
              onSelect={onLocationSelect}
              selectedNanopub={selectedLocation?.np ?? null}
            />
          )}
        </Map>
      </div>

      {/* Selected Location Detail */}
      {selectedLocation && <LocationDetail location={selectedLocation} />}

      {/* Map Results count */}
      {!loading && !error && locations.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {locations.length} location
          {locations.length !== 1 ? "s" : ""} found
          {bounds && " (filtered by map area)"}
        </p>
      )}

      {/* Map Results List */}
      {!loading && !error && locations.length > 0 && (
        <SearchResultList
          searchResults={locations.map((l) => ({
            np: l.np,
            creator: l.creator,
            date: l.date,
            label: l.locationLabel,
          }))}
        />
      )}
    </div>
  );
}
