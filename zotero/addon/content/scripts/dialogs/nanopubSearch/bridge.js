/**
 * Bridge chrome window params -> content iframe via query parameters.
 *
 * This file runs in Zotero chrome/XUL context. It reads window.arguments
 * (passed by openDialog) and injects them as query parameters into the iframe
 * which runs in a separate browser context where React components can run.
 *
 * window.arguments[0] = initialQuery (string) — the item title to pre-fill search
 * window.arguments[1] = darkMode (boolean) — whether Zotero is in dark mode
 */

/* global window, document, console, URLSearchParams, injectCallbackToIframe, pollIframeReady */

window.addEventListener("load", () => {
  try {
    const iframe = document.getElementById("nanopub-search-browser");
    if (!iframe) return;

    const baseSrc =
      iframe.getAttribute("src") ||
      "chrome://__addonRef__/content/nanopubSearch.html";

    // Read arguments passed from openDialog()
    const initialQuery = window.arguments[0];
    const darkMode = window.arguments[1];

    const params = new URLSearchParams();
    if (initialQuery) params.set("q", initialQuery);
    params.set("dark", darkMode ? "true" : "false");

    // Set or append the params to the iframe query string
    iframe.setAttribute(
      "src",
      params.toString() ? baseSrc + "?" + params.toString() : baseSrc,
    );

    // Inject the nanopubSearchCallback into the iframe's content world
    // after it loads (../utils.js).
    pollIframeReady(
      iframe,
      function () {
        injectCallbackToIframe(
          iframe,
          "nanopubSearchCallback",
          "[nanopubSearch]",
        );
      },
      "[nanopubSearch]",
    );
  } catch (e) {
    console.error("[nanopubSearch] failed to inject params into iframe", e);
  }
});
