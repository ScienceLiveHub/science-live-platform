import { NanopubViewer } from "@sciencelivehub/nanopub-view/react";
import { useState } from "react";

export function NanopubTest() {
  const [showViewer, setShowViewer] = useState(false);

  // Sample nanopub in TriG format
  const sampleNanopub = `@prefix : <http://purl.org/nanopub/temp/mynanopub#> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix npx: <http://purl.org/nanopub/x/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix ex: <http://example.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .

:Head {
    : np:hasAssertion :assertion ;
        np:hasProvenance :provenance ;
        np:hasPublicationInfo :pubinfo ;
        a np:Nanopublication .
}

:assertion {
    ex:mosquito ex:transmits ex:malaria .
    ex:mosquito a ex:Insect .
}

:provenance {
    :assertion prov:hadPrimarySource <http://dx.doi.org/10.3233/ISU-2010-0613> .
    :assertion prov:wasAttributedTo <https://orcid.org/0000-0001-2345-6789> .
}

:pubinfo {
    : dcterms:created "2025-10-20T00:00:00Z" .
    : dcterms:creator <https://orcid.org/0000-0001-2345-6789> .
    : a npx:ExampleNanopub .
}`;

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "2rem" }}>Nanopub Viewer Test</h1>

        {!showViewer ? (
          <div>
            <button
              onClick={() => setShowViewer(true)}
              style={{
                padding: "16px 32px",
                backgroundColor: "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "2rem",
              }}
            >
              🔃 Load Sample Nanopub
            </button>

            <div style={{ marginTop: "2rem" }}>
              <h3>📝 Sample Nanopub Content:</h3>
              <pre
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: "1rem",
                  borderRadius: "8px",
                  overflow: "auto",
                  fontSize: "0.85em",
                  border: "1px solid #D1D5DB",
                }}
              >
                {sampleNanopub}
              </pre>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setShowViewer(false)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#6B7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              ← Back
            </button>

            <NanopubViewer content={sampleNanopub} />
          </div>
        )}
      </div>
    </div>
  );
}
