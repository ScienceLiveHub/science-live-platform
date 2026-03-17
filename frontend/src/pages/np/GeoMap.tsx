/**
 * GeoMap Page
 *
 * Displays a world map showing locations of nanopublications that have
 * geographical coverage data. Each location is rendered as a polygon or
 * marker on the map. Clicking a location loads and displays the
 * corresponding nanopublication below the map.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map, MapTileLayer, MapZoomControl } from "@/components/ui/map";
import { Spinner } from "@/components/ui/spinner";
import { AsyncLabel } from "@/hooks/use-labels";
import { useNanopub } from "@/hooks/use-nanopub";
import GEOLOCATION_QUERY from "@/lib/queries/geolocation.rq";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import { wktToGeoJSON } from "@terraformer/wkt";
import type { LatLngExpression } from "leaflet";
import {
  ExternalLink,
  Globe,
  MapPin,
  MessageCircle,
  Quote,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { NanopubViewer } from "./create/components/NanopubViewer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single result row from the geolocation SPARQL query. */
interface GeoLocation {
  nanopub: string;
  paper: string;
  location: string;
  locationLabel: string;
  wkt?: string;
  bbox?: string;
  quotation: string;
  quotationEnd?: string;
  comment: string;
  creator: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse SPARQL result rows into typed GeoLocation objects. */
function parseResults(rows: Record<string, string>[]): GeoLocation[] {
  return rows
    .filter((row) => row.wkt || row.bbox)
    .map((row) => ({
      nanopub: row.nanopub,
      paper: row.paper,
      location: row.location,
      locationLabel: row.location_label ?? "",
      wkt: row.wkt,
      bbox: row.bbox,
      quotation: row.quotation ?? "",
      quotationEnd: row.quotation_end,
      comment: row.comment ?? "",
      creator: row.creator ?? "",
    }));
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
        const isSelected = loc.nanopub === selectedNanopub;
        return (
          <GeoJSON
            key={`${loc.nanopub}-${loc.location}-${idx}`}
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
// Detail panel for selected location (before nanopub loads)
// ---------------------------------------------------------------------------

function LocationDetail({ location }: { location: GeoLocation }) {
  return (
    <Card className="border-l-8 border-l-teal-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-teal-600" />
          {location.locationLabel}
          <Link to={`/np/?uri=${location.nanopub}`} target="_blank">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Paper */}
        {location.paper && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Paper
            </p>
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

        {/* Quotation */}
        {location.quotation && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              <Quote className="h-4 w-4 inline-block mr-1" />
              Quotation
            </p>
            <blockquote className="border-l-4 border-teal-300 bg-teal-50 dark:bg-teal-950/20 pl-4 py-2 text-sm italic text-foreground/80 rounded-r-md">
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

        {/* Comment */}
        {location.comment && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              <MessageCircle className="h-4 w-4 inline-block mr-1" />
              Comment
            </p>
            <p className="text-sm text-foreground/80">{location.comment}</p>
          </div>
        )}

        {/* Creator */}
        {location.creator && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Creator
            </p>
            <a
              href={location.creator}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
            >
              <AsyncLabel uri={location.creator} />
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Nanopub detail panel (loads and displays the full nanopub)
// ---------------------------------------------------------------------------

function NanopubDetail({ uri }: { uri: string }) {
  const { store, loading, error, creatorUserIdsByOrcid } = useNanopub(uri);

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3 text-muted-foreground">
        <Spinner /> <span>Loading nanopublication…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 text-red-900 dark:text-red-300 text-sm">
        Failed to load nanopublication: {error}
      </div>
    );
  }

  if (!store) return null;

  return (
    <NanopubViewer
      store={store}
      creatorUserIdsByOrcid={creatorUserIdsByOrcid}
      showShareMenu={true}
      showCitation={false}
    />
  );
}

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
  const [mapBounds, setMapBounds] = useState<{
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null>(null);

  const detailRef = useRef<HTMLDivElement>(null);

  // Fetch geolocation data
  const fetchData = useCallback(
    async (search: string, bounds: typeof mapBounds) => {
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
          GEOLOCATION_QUERY,
          bindParams,
          NANOPUB_SPARQL_ENDPOINT_FULL,
        );

        setLocations(parseResults(rows));
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
              selectedNanopub={selectedLocation?.nanopub ?? null}
            />
          )}
        </Map>
      </div>

      {/* Results count */}
      {!loading && !error && locations.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {locations.length} location{locations.length !== 1 ? "s" : ""} found
          {mapBounds && " (filtered by map area)"}
        </p>
      )}

      {/* Selected Location Detail */}
      {selectedLocation && (
        <div ref={detailRef} className="flex flex-col gap-4">
          {/* Location summary card */}
          <LocationDetail location={selectedLocation} />
        </div>
      )}
    </main>
  );
}
