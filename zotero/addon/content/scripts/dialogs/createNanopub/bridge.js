// Bridge Zotero prefs (chrome window) -> content iframe via query parameters.
//
// The React bundle is loaded inside createNanopub.html (content context) where Zotero globals
// like Zotero.Prefs are not reliably available. This script runs in the parent chrome dialog
// context and injects prefs into the iframe src.

/* global Zotero, window, document, console, URLSearchParams */

// This file runs in Zotero chrome/XUL context, not a normal browser environment.
// eslint-disable-next-line no-undef

window.addEventListener("load", () => {
  try {
    const iframe = document.getElementById("nanopub-browser");
    if (!iframe) return;

    // In some Zotero dialog contexts the global Zotero object isn't injected on `window`,
    // but it *is* available on the opener (main Zotero window).
    // `typeof` guards are important here: in some contexts `window`/`Zotero` may not be present.
    // eslint-disable-next-line no-undef
    const ZoteroGlobal =
      // eslint-disable-next-line no-undef
      (typeof Zotero !== "undefined" && Zotero) ||
      // eslint-disable-next-line no-undef
      (typeof window !== "undefined" &&
        window.opener &&
        window.opener.Zotero) ||
      // eslint-disable-next-line no-undef
      (typeof window !== "undefined" && window.top && window.top.Zotero);

    const baseSrc =
      iframe.getAttribute("src") ||
      "chrome://__addonRef__/content/createNanopub.html";

    // Keep these keys in sync with the plugin pref names.
    // (They are stored under the pref prefix from package.json: extensions.zotero.sciencelive)
    const name =
      (ZoteroGlobal && ZoteroGlobal.Prefs && ZoteroGlobal.Prefs.get
        ? ZoteroGlobal.Prefs.get("extensions.zotero.sciencelive.name", true)
        : "") + "";
    const orcid =
      (ZoteroGlobal && ZoteroGlobal.Prefs && ZoteroGlobal.Prefs.get
        ? ZoteroGlobal.Prefs.get("extensions.zotero.sciencelive.orcid", true)
        : "") + "";

    if (!name && !orcid) {
      console.warn(
        "[createNanopub] prefs injection: Zotero.Prefs not available on this window; tried window, opener, top",
      );
    }

    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (orcid) params.set("orcid", orcid);

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
