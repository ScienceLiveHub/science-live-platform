/**
 * Shared utilities for Zotero chrome -> content iframe bridge scripts.
 *
 * This file runs in Zotero chrome/XUL context and must be loaded via a
 * <script> tag *before* the dialog-specific bridge.js so its helpers are
 * available on the global scope.
 */

/* global window, console, setInterval, clearInterval */

/**
 * Forward a named callback from the chrome window into the iframe's
 * contentWindow so the React app running inside the iframe can invoke it.
 *
 * @param {HTMLIFrameElement} iframe  - The iframe element.
 * @param {string} callbackName       - Property name on `window` to forward.
 * @param {string} logPrefix          - Prefix for log messages, e.g. "[createNanopub]".
 */
export function injectCallbackToIframe(iframe, callbackName, logPrefix) {
  try {
    if (typeof window[callbackName] === "function" && iframe.contentWindow) {
      iframe.contentWindow[callbackName] = window[callbackName];
    }
  } catch (e) {
    console.warn(
      logPrefix + " could not forward " + callbackName + " to iframe",
      e,
    );
  }
}

/**
 * Poll an iframe until its contentDocument reaches "complete" readyState,
 * then invoke the onReady callback.
 *
 * NOTE: We cannot rely on iframe.addEventListener("load", ...) because in
 * XUL chrome context with type="content" iframes, the load event on the
 * iframe element does not fire reliably. Instead we poll for the iframe's
 * contentDocument to reach "complete" readyState after setting the new src.
 *
 * @param {HTMLIFrameElement} iframe  - The iframe element to poll.
 * @param {Function} onReady          - Called once when the iframe is loaded.
 * @param {string} logPrefix          - Prefix for log messages, e.g. "[createNanopub]".
 * @param {number} [maxAttempts=50]   - Maximum number of polling attempts.
 * @param {number} [intervalMs=200]   - Milliseconds between polling attempts.
 */
export function pollIframeReady(
  iframe,
  onReady,
  logPrefix,
  maxAttempts,
  intervalMs,
) {
  var attempts = 0;
  var limit = maxAttempts || 50; // ~10 seconds at 200 ms intervals
  var interval = intervalMs || 200;
  var timer = setInterval(function () {
    attempts++;
    try {
      var doc =
        iframe.contentDocument ||
        (iframe.contentWindow && iframe.contentWindow.document);
      if (doc && doc.readyState === "complete") {
        clearInterval(timer);
        console.log(logPrefix + " iframe loaded (detected via polling)");
        onReady();
      } else if (attempts >= limit) {
        clearInterval(timer);
        console.warn(logPrefix + " iframe load polling timed out");
      }
    } catch (e) {
      // Cross-origin or not-yet-ready — keep polling
      if (attempts >= limit) {
        clearInterval(timer);
        console.warn(
          logPrefix + " iframe load polling timed out with error",
          e,
        );
      }
    }
  }, interval);
}
