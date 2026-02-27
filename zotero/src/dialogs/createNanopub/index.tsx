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
import { TooltipProvider } from "../../../../frontend/src/components/ui/tooltip";
import NanopubEditor from "../../../../frontend/src/pages/np/create/components/NanopubEditor";

const DEFAULT_TEMPLATE_URI =
  "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU"; // Annotating a paper quotation

function getInjectedPref(key: string): string | undefined {
  try {
    const v = new URLSearchParams(window.location.search).get(key);
    return v || undefined;
  } catch {
    return undefined;
  }
}

window.addEventListener("load", async () => {
  try {
    const darkmode = getInjectedPref("dark");

    if (!darkmode) {
      // This listener gets called twice, and the first time prefs are empty so skip it
      return;
    }

    if (darkmode === "true") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const el = document.getElementById("root");
    if (!el) {
      console.error("[createNanopub] #root not found");
      return;
    }

    // Show something immediately, before React mounts.
    if (!el.textContent) {
      el.textContent = "Loading…";
    }

    const prefilledDataString = getInjectedPref("prefilledData");

    // Retrieve the signing profile using API key
    const apiKey = getInjectedPref("apiKey");
    if (!apiKey) {
      window.alert(
        `Science Live API key not set, please set it in Zotero Settings.`,
      );
      return;
    }

    const apiUrl =
      getInjectedPref("apiUrl") || "https://api.sciencelive4all.org";
    let profile;
    try {
      const result = await fetch(`${apiUrl}/signing/profile`, {
        headers: { "x-api-key": apiKey ?? "" },
      });
      profile = await result.json();
      if (!profile.name) {
        window.alert(
          `Science Live API key not set, please set it in Zotero Settings.`,
        );
        return;
      }
    } catch {
      window.alert(
        `Failed to connect to Science Live. Check your Internet connection, and/or your Science Live API key in Zotero Settings.`,
      );
      return;
    }

    let prefilledData;
    try {
      prefilledData = prefilledDataString
        ? JSON.parse(prefilledDataString)
        : undefined;
    } catch {
      console.log("[createNanopub] Invalid prefilledData passed");
    }

    createRoot(el).render(
      <React.StrictMode>
        <TooltipProvider>
          <NanopubEditor
            templateUri={getInjectedPref("templateUri") ?? DEFAULT_TEMPLATE_URI}
            identity={profile}
            publishServer={"https://registry.knowledgepixels.com/"}
            onPublished={async ({ uri }) => {
              console.log("Published:", uri);
            }}
            prefilledData={prefilledData}
            embedded
            showProfile
          />
          <Toaster theme={darkmode ? "dark" : "light"} />
        </TooltipProvider>
      </React.StrictMode>,
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
