declare global {
  namespace JSX {
    interface NanopubDisplay {
      url?: string;
      rdf?: string;
    }
    interface NanopubStatus {
      url?: string;
    }
    interface IntrinsicElements {
      "nanopub-display": NanopubDisplay;
      "nanopub-status": NanopubStatus;
    }
  }
}

export {};
