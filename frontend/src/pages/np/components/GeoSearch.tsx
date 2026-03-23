import { Map, MapTileLayer, MapZoomControl } from "@/components/ui/map";
import { Spinner } from "@/components/ui/spinner";
import { GEOLOCATION } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { useCallback, useEffect, useState } from "react";
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
  /** Optional keyword to filter geographic results. */
  searchTerm: string;
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
 */
export function GeoSearch({
  searchTerm,
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

  // Expose the search function so the parent can trigger it
  // We use a ref-style pattern via the component's imperative API
  // but for simplicity, we expose it via a custom hook pattern.
  // Instead, the parent calls search via the exposed prop.

  return (
    <GeoSearchInner
      loading={loading}
      error={error}
      locations={locations}
      selectedLocation={selectedLocation}
      bounds={bounds}
      onBoundsChange={handleBoundsChange}
      onLocationSelect={handleLocationSelect}
      onSearch={search}
    />
  );
}

// ---------------------------------------------------------------------------
// Expose search trigger via ref for parent components
// ---------------------------------------------------------------------------

import { forwardRef, useImperativeHandle, useRef } from "react";

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
    { searchTerm, onBoundsChange, onSearchStart, onSearchEnd },
    ref,
  ) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locations, setLocations] = useState<GeoLocation[]>([]);
    const [selectedLocation, setSelectedLocation] =
      useState<GeoLocation | null>(null);
    const [bounds, setBounds] = useState<MapBounds | null>(null);
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
        loading,
        flyToAndSearch: (
          targetBounds: LatLngBoundsExpression,
          term: string,
        ) => {
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

    return (
      <GeoSearchInner
        loading={loading}
        error={error}
        locations={locations}
        selectedLocation={selectedLocation}
        bounds={bounds}
        onBoundsChange={handleBoundsChange}
        onLocationSelect={handleLocationSelect}
        onMapReady={handleMapReady}
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
  onBoundsChange: (bounds: MapBounds) => void;
  onLocationSelect: (loc: GeoLocation) => void;
  onSearch?: () => void;
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
  onBoundsChange,
  onLocationSelect,
  onMapReady,
}: GeoSearchInnerProps) {
  return (
    <div className="flex flex-col gap-4">
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
