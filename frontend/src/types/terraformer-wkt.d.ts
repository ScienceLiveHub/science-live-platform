declare module "@terraformer/wkt" {
  export function wktToGeoJSON(wkt: string): GeoJSON.Geometry;
  export function geojsonToWKT(geojson: GeoJSON.Geometry): string;
}
