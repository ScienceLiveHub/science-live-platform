import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { MapGeometrySelector } from "@/components/map-geometry";
import { Label } from "@/components/ui/label";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { useFormedible } from "@/hooks/use-formedible";
import { validDoi, validUriPlaceholder } from "@/lib/validation";
import z from "zod";
import { NanopubTemplateDefComponentProps } from "./component-registry";

export default function DocumentGeographicalCoverage({
  publish,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  /**
   * The Schema for types, validation, and error messages
   */
  const schema = z.object({
    paper: validDoi, // The "https://doi.org/" prefix is prepended when published.
    quoteType: z.enum(["whole", "ends"]),
    quotation: z.string().min(5).max(500),
    "quotation-end": z.string().min(5).max(500).optional(),
    location: validUriPlaceholder, // Actually a local URI (introduced resource), so a suffix to current URI
    "location-label": z.string().nonempty(),
    geometry: validUriPlaceholder.optional(), // Actually a local URI (introduced resource), so a suffix to current URI
    wkt: z.string().min(5).max(1500).optional(),
    bbox: z.string().min(5).max(1500).optional(),
    comment: z.string().min(5).max(1000),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "paper",
        type: "text",
        label: "Cited DOI",
        placeholder: "DOI, starting with 10.",
        required: true,
      },
      {
        name: "quoteType",
        type: "radio",
        options: [
          {
            value: "whole",
            label: "Quote whole text (less than 500 characters)",
          },
          { value: "ends", label: "Quote start/end" },
        ],
      },
      {
        name: "quotation",
        type: "textarea",
        label: "Quoted Text",
        placeholder: "The exact quotation from the paper",
        required: true,
        textareaConfig: {},
      },
      {
        name: "quotation-end",
        type: "textarea",
        label: "Quoted Text End",
        description: "Use when quoting beginning and end of a longer passage",
        placeholder: "The exact quotation from the paper",
        textareaConfig: {},
        conditional: (values) => values.quoteType === "ends",
      },
      {
        name: "search",
        type: "text",
        label: "Location search",
        component: ({ fieldApi }) => (
          <>
            <Label>Search for a location or enter manually below</Label>
            <div>
              <PlaceAutocomplete
                onPlaceSelect={(feature) => {
                  fieldApi.form.setFieldValue(
                    "location",
                    feature.properties.osm_value,
                  );
                  fieldApi.form.setFieldValue(
                    "location-label",
                    feature.properties.name,
                  );
                  // TODO: ideally this should also set the geometry WKT and/or show on the map.
                }}
              />
            </div>
          </>
        ),
      },
      {
        name: "location",
        type: "text",
        label: "Short ID for location",
        description:
          "An ID for the geographical location to be used as the URI suffix",
        placeholder: "",
        required: true,
      },
      {
        name: "location-label",
        type: "text",
        label: "Area name",
        description: "Name of the area covered",
        placeholder: "e.g. 'Northern Europe', 'Amazon Basin'",
        required: true,
      },
      // TODO: this is required for wkt, but not for bbox.
      // It can possibly be hidden and filled by code, based on map area selection
      {
        name: "geometry",
        type: "text",
        label: "Short ID for geometry",
        placeholder: "",
      },
      {
        // TODO: this has the datatype http://www.opengis.net/ont/geosparql#wktLiteral
        // according to the template. How does that translate to the generated RDF?
        name: "wkt",
        type: "text",
        label: "Geometry as Well-known Text (WKT)",
        placeholder: "e.g. POINT(2.3 48.9) or POLYGON((...)) etc",
        // Component from https://shadcn-map.vercel.app/
        component: ({ fieldApi }) => (
          <>
            <Label>Mark area geometry</Label>
            <MapGeometrySelector
              onWktChange={(wkt) => {
                fieldApi.setValue(wkt ?? "");
              }}
            />
          </>
        ),
      },
      // TODO: what is the difference between this and the wkt?  Is it just redundant?
      // {
      //   name: "bbox",
      //   type: "text",
      //   label:
      //     "Bounding box as WKT POLYGON (alternative to geometry - optional)",
      //   placeholder: "",
      // },
      {
        name: "comment",
        type: "textarea",
        label: "Comment",
        description:
          "Explain how this quotation supports your conclusion about the geographical coverage",
        placeholder: "Explanation",
        textareaConfig: {},
        required: true,
      },
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        paper: "",
        quoteType: "whole",
        quotation: "",
        location: "",
        "location-label": "",
        comment: "",
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await publish(value);
      },
    },
  });
  return <Form />;
}
