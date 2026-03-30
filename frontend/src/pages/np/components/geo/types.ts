/** A single result row from the geolocation SPARQL query. */
export interface GeoLocation {
  np: string;
  paper: string;
  location: string;
  locationLabel: string;
  date: Date;
  wkt?: string;
  bbox?: string;
  quotation: string;
  quotationEnd?: string;
  comment: string;
  creator: string;
}

/** Bounding box coordinates for map area filtering. */
export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Parse SPARQL result rows into typed GeoLocation objects. */
export function parseGeoResults(rows: Record<string, string>[]): GeoLocation[] {
  return rows
    .filter((row) => row.wkt || row.bbox)
    .map((row) => ({
      np: row.np,
      paper: row.paper,
      location: row.location,
      locationLabel: row.location_label ?? "",
      date: new Date(row.date),
      wkt: row.wkt,
      bbox: row.bbox,
      quotation: row.quotation ?? "",
      quotationEnd: row.quotation_end,
      comment: row.comment ?? "",
      creator: row.creator ?? "",
    }));
}
