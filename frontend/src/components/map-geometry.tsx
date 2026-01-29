"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Map,
  MapDrawControl,
  MapDrawMarker,
  MapDrawPolygon,
  MapDrawPolyline,
  MapDrawRectangle,
  MapLocateControl,
  MapTileLayer,
  useLeaflet,
} from "@/components/ui/map";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { geojsonToWKT, wktToGeoJSON } from "@terraformer/wkt";
import type { FeatureGroup, LatLngExpression } from "leaflet";
import { useEffect, useRef, useState } from "react";

export type MapGeometryProps = {
  /**
   * The WKT string value.
   */
  value?: string;
  /**
   * Called whenever the drawn layers change.
   * - `undefined` when there are no shapes
   * - `string` WKT when one or more shapes exist
   */
  onWktChange?: (wkt: string | undefined) => void;
};

export function MapGeometrySelector({ value, onWktChange }: MapGeometryProps) {
  // Arbitrary start coordinates of map. Ideally it should be the current users position
  const TORONTO_COORDINATES = [43.6532, -79.3832] satisfies LatLngExpression;

  const { L } = useLeaflet();
  const [numberOfShapes, setNumberOfShapes] = useState(0);
  const [mode, setMode] = useState<"map" | "text">("map");
  const [internalValue, setInternalValue] = useState<string | undefined>(
    undefined,
  );

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const featureGroupRef = useRef<FeatureGroup | null>(null);
  const lastEmittedValue = useRef<string | undefined>(undefined);

  const handleWktChange = (wkt: string | undefined) => {
    if (!isControlled) {
      setInternalValue(wkt);
    }
    onWktChange?.(wkt);
  };

  const updateMapFromValue = (fg: FeatureGroup, val: string | undefined) => {
    if (!L) return;

    // Recursive helper to add only leaf layers (not groups) to the feature group
    // This ensures that we don't end up with nested FeatureGroups which cause
    // problems when converting back to WKT (creating nested GeometryCollections).
    const addNonGroupLayers = (sourceLayer: any) => {
      if (sourceLayer instanceof L.LayerGroup) {
        sourceLayer.eachLayer(addNonGroupLayers);
      } else {
        fg.addLayer(sourceLayer);
      }
    };

    fg.clearLayers();
    if (val) {
      try {
        const geojson = wktToGeoJSON(val);
        const geojsonLayer = L.geoJSON(geojson);
        addNonGroupLayers(geojsonLayer);
      } catch (e) {
        console.error("Failed to parse WKT", e);
      }
    }
    setNumberOfShapes(fg.getLayers().length);
  };

  // Sync Value -> Map when value changes (and map is mounted)
  useEffect(() => {
    if (
      featureGroupRef.current &&
      L &&
      mode === "map" &&
      currentValue !== lastEmittedValue.current
    ) {
      updateMapFromValue(featureGroupRef.current, currentValue);
      lastEmittedValue.current = currentValue;
    }
  }, [currentValue, L, mode]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleWktChange(undefined)}
          disabled={!currentValue}
          type="button"
        >
          Clear
        </Button>
        <Label htmlFor="mode-toggle">Map Mode</Label>
        <Switch
          id="mode-toggle"
          checked={mode === "map"}
          onCheckedChange={(c) => setMode(c ? "map" : "text")}
        />
      </div>

      {mode === "map" ? (
        L ? (
          <Map center={TORONTO_COORDINATES} zoom={3}>
            <MapTileLayer />
            <MapDrawControl
              onFeatureGroupReady={(fg) => {
                featureGroupRef.current = fg;
                // Initialize map with current value on mount
                updateMapFromValue(fg, currentValue);
                lastEmittedValue.current = currentValue;
              }}
              onLayersChange={(fg) => {
                const layers = fg.getLayers();
                setNumberOfShapes(layers.length);

                let newWkt: string | undefined;

                if (layers.length === 0) {
                  newWkt = undefined;
                } else {
                  try {
                    // fg.toGeoJSON() returns a FeatureCollection
                    const fc = fg.toGeoJSON() as any;

                    // Helper to flatten geometries and handle nested GeometryCollections
                    // that might have crept in or resulted from the structure.
                    const extractGeometriesFromGeom = (geom: any): any[] => {
                      if (!geom) return [];
                      if (geom.type === "GeometryCollection") {
                        return geom.geometries.flatMap(
                          extractGeometriesFromGeom,
                        );
                      }
                      return [geom];
                    };

                    const extractGeometries = (features: any[]): any[] => {
                      return features.flatMap((f) => {
                        if (!f.geometry) return [];
                        if (f.geometry.type === "GeometryCollection") {
                          return extractGeometriesFromGeom(f.geometry);
                        }
                        return [f.geometry];
                      });
                    };

                    const geometries = extractGeometries(fc.features);

                    if (geometries.length === 0) {
                      newWkt = undefined;
                    } else if (geometries.length === 1) {
                      newWkt = geojsonToWKT(geometries[0]);
                    } else {
                      newWkt = geojsonToWKT({
                        type: "GeometryCollection",
                        geometries,
                      });
                    }
                  } catch (e) {
                    console.error("Failed to convert layers to WKT", e);
                  }
                }

                if (newWkt !== lastEmittedValue.current) {
                  lastEmittedValue.current = newWkt;
                  handleWktChange(newWkt);
                }
              }}
            >
              <MapDrawMarker />
              <MapDrawPolyline />
              <MapDrawRectangle />
              <MapDrawPolygon />
              {/* <MapDrawEdit />
              <MapDrawDelete />
              <MapDrawUndo /> */}
            </MapDrawControl>
            <MapLocateControl className="absolute left-1 top-1 z-1000" />
            <Badge className="absolute right-1 bottom-1 z-1000">
              Shapes: {numberOfShapes}
            </Badge>
          </Map>
        ) : null
      ) : (
        <Textarea
          value={currentValue || ""}
          onChange={(e) => {
            const val = e.target.value || undefined;
            // Update immediately for text area
            lastEmittedValue.current = val;
            handleWktChange(val);
          }}
          className="min-h-100 font-mono"
          placeholder="Enter WKT geometry..."
        />
      )}
    </div>
  );
}
