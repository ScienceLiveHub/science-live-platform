import { wktToGeoJSON } from "@terraformer/wkt";
import { useEffect, useMemo, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import type { GeoLocation } from "./types";

interface GeoLayerProps {
  locations: GeoLocation[];
  onSelect: (loc: GeoLocation) => void;
  selectedNanopub: string | null;
}

/**
 * Renders all GeoJSON geometries on the map and fits bounds to show them all.
 */
export function GeoLayers({
  locations,
  onSelect,
  selectedNanopub,
}: GeoLayerProps) {
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
