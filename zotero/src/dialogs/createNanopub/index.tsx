/**
 * CreateNanopub React wrapper for Zotero
 *
 * This is a React standalone dialog which mounts into a root within a "window"
 * (typically a browser or iframe in a XUL/XHTML file). This is done in order to
 * use the Zotero chrome dialog context which avoids the limitations of the
 * normal Zotero XUL environment.
 *
 * It can't access normal variables/globals from the plugin (such as Zotero.Prefs)
 * but variables can be passed in using the scripts/dialogs/createNanopub/bridge.js
 * script via query parameters.
 *
 */

import * as React from "react";
import { createRoot } from "react-dom/client";

// Reuse the app's existing embedded nanopub creator UI.
// NOTE: This file runs in Zotero's chrome dialog context.
import { Toaster } from "../../../../frontend/src/components/ui/sonner";
import CreateNanopubEmbedded, {
  EmbeddedPublisherProfile,
} from "../../../../frontend/src/pages/np/create/CreateNanopubEmbedded";
import { EXAMPLE_privateKey } from "../../../../frontend/src/lib/uri";

declare const Services: any;

const DEFAULT_TEMPLATE_URI =
  "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo";

// Placeholder profile for now (first step: show the UI in Zotero).
// You can later replace this with a proper profile stored in plugin prefs.
const DEFAULT_PROFILE = {
  name: "Zotero User",
  orcid: "https://orcid.org/0000-0000-0000-0000",
  privateKey: EXAMPLE_privateKey,
};

function getInjectedPref(key: string): string | undefined {
  try {
    const v = new URLSearchParams(window.location.search).get(key);
    return v || undefined;
  } catch {
    return undefined;
  }
}

function CreateNanopub(props: {
  profile: EmbeddedPublisherProfile;
  templateUri: string;
}) {
  return (
    <React.StrictMode>
      <CreateNanopubEmbedded
        templateUri={props.templateUri}
        profile={props.profile}
        publishServer={"https://registry.knowledgepixels.com/"}
        onPublished={async ({ uri }) => {
          // Best-effort feedback in Zotero.
          try {
            Services.prompt.alert(
              null,
              "Nanopublication Published",
              `Published nanopublication:\n\n${uri}`,
            );
          } catch {
            // ignore
          }
        }}
      />
      <Toaster />
    </React.StrictMode>
  );
}

window.addEventListener("load", () => {
  try {
    // Visible in Zotero error console (Tools → Developer → Error Console)
    // so we can diagnose when the dialog is blank.
    console.log("[createNanopub] dialog script loaded");

    const el = document.getElementById("root");
    if (!el) {
      console.error("[createNanopub] #root not found");
      return;
    }

    // Show something immediately, before React mounts.
    if (!el.textContent) {
      el.textContent = "Loading…";
    }

    createRoot(el).render(
      <CreateNanopub
        templateUri={getInjectedPref("templateUri") ?? DEFAULT_TEMPLATE_URI}
        profile={{
          // This dialog UI is hosted inside an <iframe> (content context).
          // We can't reliably access Zotero chrome globals like Zotero.Prefs from here,
          // so the chrome parent window injects prefs into the iframe src querystring.
          name: getInjectedPref("name") ?? DEFAULT_PROFILE.name,
          orcid: getInjectedPref("orcid") ?? DEFAULT_PROFILE.orcid,
          privateKey: EXAMPLE_privateKey,
        }}
      />,
    );
    console.log("[createNanopub] React render() called");
  } catch (e) {
    console.error("[createNanopub] fatal error", e);
    try {
      const el = document.getElementById("root");
      if (el) {
        el.textContent = `Error loading UI: ${String(e)}`;
      }
    } catch {
      // ignore
    }
  }
});
