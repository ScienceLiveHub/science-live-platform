/**
 * NanopubSearch React wrapper for Zotero
 *
 * This is a React standalone dialog which mounts into a root within an iframe
 * in a XUL/XHTML file. It uses the Zotero chrome dialog context to avoid the
 * limitations of the normal Zotero XUL environment.
 *
 * Variables are passed in via query parameters injected by
 * scripts/dialogs/nanopubSearch/bridge.js.
 */

import * as React from "react";
import { createRoot } from "react-dom/client";

import { TooltipProvider } from "../../../../frontend/src/components/ui/tooltip";
import { NanopubSearchPicker } from "../../../../frontend/src/pages/np/components/NanopubSearchPicker";

function getParam(key: string): string | undefined {
  try {
    const v = new URLSearchParams(window.location.search).get(key);
    return v || undefined;
  } catch {
    return undefined;
  }
}

window.addEventListener("load", () => {
  try {
    const darkmode = getParam("dark");

    // This listener gets called twice, and the first time params are empty so skip it
    if (!darkmode) {
      return;
    }

    if (darkmode === "true") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const el = document.getElementById("root");
    if (!el) {
      console.error("[nanopubSearch] #root not found");
      return;
    }

    // Show something immediately, before React mounts.
    if (!el.textContent) {
      el.textContent = "Loading…";
    }

    const initialQuery = getParam("q") || "";

    createRoot(el).render(
      <React.StrictMode>
        <TooltipProvider>
          <NanopubSearchPicker
            initialQuery={initialQuery}
            confirmLabel="Import Selected into Zotero Item"
            onConfirm={(selectedUris: string[]) => {
              const callback = (window as any).nanopubSearchCallback;
              if (typeof callback === "function") {
                callback(selectedUris);
              } else {
                console.warn(
                  "[nanopubSearch] nanopubSearchCallback not available",
                );
              }
            }}
            onCancel={() => {
              const callback = (window as any).nanopubSearchCallback;
              if (typeof callback === "function") {
                callback([]); // empty array = cancelled
              } else {
                console.warn(
                  "[nanopubSearch] nanopubSearchCallback not available for cancel",
                );
              }
            }}
            onOpenExternalUrl={(url: string) => {
              const callback = (window as any).openExternalUrl;
              if (typeof callback === "function") {
                callback(url);
              } else {
                console.warn(
                  "[nanopubSearch] openExternalUrl not available, falling back to window.open",
                );
                window.open(url, "_blank");
              }
            }}
          />
        </TooltipProvider>
      </React.StrictMode>,
    );
    console.log("[nanopubSearch] React render() called");
  } catch (e) {
    console.error("[nanopubSearch] fatal error", e);
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
