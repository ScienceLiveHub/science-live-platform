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

    // Keep these keys in sync with the plugin pref names.
    // (They are stored under the pref prefix from package.json: extensions.zotero.sciencelive)
    const name =
      ZoteroGlobal?.Prefs?.get("extensions.zotero.sciencelive.name", true) ??
      "";
    const orcid =
      ZoteroGlobal?.Prefs?.get("extensions.zotero.sciencelive.orcid", true) ??
      "";

    // The URI of the template, passed in via optional args of openDialog()
    const templateUri = window.arguments[0];

    if (!name && !orcid) {
      console.warn(
        "[createNanopub] prefs injection: Zotero.Prefs not available on this window; tried window, opener, top",
      );
    }

    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (orcid) params.set("orcid", orcid);
    if (templateUri) params.set("templateUri", templateUri);

    iframe.setAttribute(
      "src",
      params.toString() ? baseSrc + "?" + params.toString() : baseSrc,
    );
  } catch (e) {
    // Best-effort only; the iframe will fall back to defaults.
    // Visible in Zotero error console (Tools → Developer → Error Console)
    console.error("[createNanopub] failed to inject prefs into iframe", e);
  }
});
