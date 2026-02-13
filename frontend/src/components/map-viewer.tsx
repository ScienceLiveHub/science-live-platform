/**
 * Map Viewer (read-only map)
 *
 * A read-only Leaflet map that renders a WKT geometry string.
 * Used by ViewGeographicalCoverage to display the geographical area.
 *
 * This is a default export so it can be lazy-loaded.
 */

import { Map, MapTileLayer, MapZoomControl } from "@/components/ui/map";
import { wktToGeoJSON } from "@terraformer/wkt";
import type { LatLngExpression } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { GeoJSON, useMap } from "react-leaflet";

/**
 * Inner component that fits the map bounds to the GeoJSON layer
 */
function FitBounds({ geoJson }: { geoJson: GeoJSON.GeoJsonObject }) {
  const map = useMap();
  const geoJsonRef = useRef<any>(null);

  useEffect(() => {
    if (geoJsonRef.current && map) {
      try {
        const bounds = geoJsonRef.current.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      } catch {
        // Ignore bounds errors for edge cases
      }
    }
  }, [geoJson, map]);

  return (
    <GeoJSON
      ref={geoJsonRef}
      key={JSON.stringify(geoJson)}
      data={geoJson as any}
      style={{
        color: "#0d9488",
        weight: 2,
        fillColor: "#14b8a6",
        fillOpacity: 0.2,
      }}
    />
  );
}

export interface ReadOnlyMapProps {
  wkt: string;
}

export default function ReadOnlyMap({ wkt }: ReadOnlyMapProps) {
  const [geoJson, setGeoJson] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wkt) {
      setGeoJson(null);
      return;
    }
    try {
      const parsed = wktToGeoJSON(wkt);
      setGeoJson(parsed as unknown as GeoJSON.GeoJsonObject);
      setError(null);
    } catch (e) {
      console.warn("Failed to parse WKT for map display:", e);
      setError("Could not parse geometry");
      setGeoJson(null);
    }
  }, [wkt]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 text-muted-foreground text-sm p-4">
        {error}
      </div>
    );
  }

  const defaultCenter: LatLngExpression = [20, 0];

  return (
    <Map
      center={defaultCenter}
      zoom={2}
      className="h-full w-full"
      scrollWheelZoom={false}
    >
      <MapTileLayer />
      <MapZoomControl />
      {geoJson && <FitBounds geoJson={geoJson} />}
    </Map>
  );
}
