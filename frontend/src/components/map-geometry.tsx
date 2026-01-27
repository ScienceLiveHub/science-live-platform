"use client";

import { Badge } from "@/components/ui/badge";
import {
  Map,
  MapDrawCircle,
  MapDrawControl,
  MapDrawDelete,
  MapDrawEdit,
  MapDrawMarker,
  MapDrawPolygon,
  MapDrawPolyline,
  MapDrawRectangle,
  MapDrawUndo,
  MapLocateControl,
  MapTileLayer,
  useLeaflet,
} from "@/components/ui/map";
import type { LatLng, LatLngExpression } from "leaflet";
import { useState } from "react";

export type MapGeometryProps = {
  /**
   * Called whenever the drawn layers change.
   * - `undefined` when there are no shapes
   * - `string` WKT when one or more shapes exist
   */
  onWktChange?: (wkt: string | undefined) => void;
};

function formatCoord(latlng: LatLng) {
  // WKT expects X Y => lon lat
  return `${latlng.lng} ${latlng.lat}`;
}

function closeRing(coords: string[]) {
  if (coords.length === 0) return coords;
  return coords[0] === coords[coords.length - 1]
    ? coords
    : [...coords, coords[0]];
}

function polylineLatLngsToCoords(latlngs: unknown): LatLng[] {
  // Leaflet returns:
  // - Polyline: LatLng[]
  // - Polygon: LatLng[][] (or deeper)
  // We only need the first ring/line for now.
  if (Array.isArray(latlngs) && latlngs.length > 0) {
    const first = latlngs[0] as unknown;
    // If nested arrays, drill down until LatLng objects.
    if (Array.isArray(first)) {
      return polylineLatLngsToCoords(first);
    }
    return latlngs as LatLng[];
  }
  return [];
}

function circleToPolygonRing(
  center: LatLng,
  radiusMeters: number,
  segments = 32,
) {
  // Approximate circle with a polygon ring (WKT has no native CIRCLE).
  const R = 6378137; // Earth radius in meters (WGS84)
  const lat1 = (center.lat * Math.PI) / 180;
  const lon1 = (center.lng * Math.PI) / 180;
  const angularDistance = radiusMeters / R;

  const points: LatLng[] = [];
  for (let i = 0; i < segments; i++) {
    const bearing = (2 * Math.PI * i) / segments;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
      );

    points.push({
      lat: (lat2 * 180) / Math.PI,
      lng: (lon2 * 180) / Math.PI,
    } as LatLng);
  }

  const coords = closeRing(points.map(formatCoord));
  return coords;
}

export function MapGeometrySelector({ onWktChange }: MapGeometryProps) {
  // Arbitrary start coordinates of map.  Ideally it should be the current users position
  const TORONTO_COORDINATES = [43.6532, -79.3832] satisfies LatLngExpression;

  const { L } = useLeaflet();
  const [numberOfShapes, setNumberOfShapes] = useState(0);

  return L ? (
    <Map center={TORONTO_COORDINATES} zoom={3}>
      <MapTileLayer />
      <MapDrawControl
        onLayersChange={(layers) => {
          setNumberOfShapes(layers.getLayers().length);

          const wkts: string[] = [];
          layers.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              const p = layer.getLatLng();
              wkts.push(`POINT(${formatCoord(p)})`);
              return;
            }

            if (layer instanceof L.Circle) {
              const center = layer.getLatLng();
              const ring = circleToPolygonRing(center, layer.getRadius());
              wkts.push(`POLYGON((${ring.join(", ")}))`);
              return;
            }

            if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
              const ringLatLngs = polylineLatLngsToCoords(layer.getLatLngs());
              const ring = closeRing(ringLatLngs.map(formatCoord));
              if (ring.length >= 4) {
                wkts.push(`POLYGON((${ring.join(", ")}))`);
              }
              return;
            }

            if (layer instanceof L.Polyline) {
              const lineLatLngs = polylineLatLngsToCoords(layer.getLatLngs());
              if (lineLatLngs.length >= 2) {
                wkts.push(
                  `LINESTRING(${lineLatLngs.map(formatCoord).join(", ")})`,
                );
              }
              return;
            }
          });

          if (wkts.length === 0) {
            onWktChange?.(undefined);
          } else if (wkts.length === 1) {
            onWktChange?.(wkts[0]);
          } else {
            onWktChange?.(`GEOMETRYCOLLECTION(${wkts.join(", ")})`);
          }
        }}
      >
        <MapDrawMarker />
        <MapDrawPolyline />
        <MapDrawCircle />
        <MapDrawRectangle />
        <MapDrawPolygon />
        <MapDrawEdit />
        <MapDrawDelete />
        <MapDrawUndo />
      </MapDrawControl>
      <MapLocateControl className="absolute right-1 top-1 z-1000" />
      <Badge className="absolute right-1 bottom-1 z-1000">
        Shapes: {numberOfShapes}
      </Badge>
    </Map>
  ) : null;
}
