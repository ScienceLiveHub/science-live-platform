import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { MapBounds } from "./types";

/**
 * Tracks the current map bounds and reports them via callback.
 */
export function MapBoundsTracker({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: MapBounds) => void;
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
