/**
 * Bridge Zotero prefs (chrome window) -> content iframe via query parameters.
 *
 * This file runs in Zotero chrome/XUL context where Zotero globals are still available.
 * It injects them as query parameters into the iframe which runs in a seperate browser
 * context where React components can run seamlessly without Zotero context limitations.
 */

/* global Zotero, window, document, console, URLSearchParams */

window.addEventListener("load", () => {
  try {
    const iframe = document.getElementById("nanopub-browser");
    if (!iframe) return;

    // In some Zotero dialog contexts the global Zotero object isn't injected on `window`,
    // but it *is* available on the opener (main Zotero window).
    // `typeof` guards are important here: in some contexts `window`/`Zotero` may not be present.
    const ZoteroGlobal =
      (typeof Zotero !== "undefined" && Zotero) ||
      (typeof window !== "undefined" &&
        window.opener &&
        window.opener.Zotero) ||
      (typeof window !== "undefined" && window.top && window.top.Zotero);

    const baseSrc =
      iframe.getAttribute("src") ||
      "chrome://__addonRef__/content/createNanopub.html";

    const apiKey =
      ZoteroGlobal?.Prefs?.get("__prefsPrefix__.apiKey", true) ?? "";

    // The URI of the template, passed in via optional args of openDialog()
    const templateUri = window.arguments[0];
    const prefilledData = window.arguments[1];
    const apiUrl = window.arguments[2];
    const darkMode = window.arguments[3];

    if (!apiKey) {
      console.warn(
        "[createNanopub] prefs injection: Zotero.Prefs not available on this window; tried window, opener, top",
      );
    }
    console.warn("[createNanopub] prefs injection key:", apiKey);

    const params = new URLSearchParams();
    if (apiKey) params.set("apiKey", apiKey);
    if (apiUrl) params.set("apiUrl", apiUrl);
    if (templateUri) params.set("templateUri", templateUri);
    // Everything must be passed as strings, so convert objects to string
    if (prefilledData)
      params.set("prefilledData", JSON.stringify(prefilledData));
    if (darkMode) params.set("dark", "true");
    // Set or append the params to the iframe query string
    iframe.setAttribute(
      "src",
      params.toString() ? baseSrc + "?" + params.toString() : baseSrc,
    );
  } catch (e) {
    console.error("[createNanopub] failed to inject prefs into iframe", e);
  }
});
