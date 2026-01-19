/**
 * Most of this code is from Zotero team's official Make It Red example[1]
 * or the Zotero 7 documentation[2].
 * [1] https://github.com/zotero/make-it-red
 * [2] https://www.zotero.org/support/dev/zotero_7_for_developers
 */

var chromeHandle;

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "__addonRef__", rootURI + "content/"],
  ]);

  /**
   * Global variables for plugin code.
   * The `_globalThis` is the global root variable of the plugin sandbox environment
   * and all child variables assigned to it is globally accessible.
   * See `src/index.ts` for details.
   */
  const ctx = { rootURI };
  ctx._globalThis = ctx;

  /**
   * Polyfills for Zotero addon sandbox environment
   * Specifically, the n3 and showdown npm packages had issues without this
   *
   * TODO: Currently just the bare minimum to get things working, come back and check
   *       that these are implemented propery
   * -------------------------------------------------------------------------
   */
  if (typeof window === "undefined") {
    ctx._globalThis.window = ctx._globalThis;
  }
  if (typeof ctx.AbortController === "undefined") {
    class AbortSignalPolyfill {
      constructor() {
        this.aborted = false;
        this.onabort = null;
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return false;
      }
    }
    class AbortControllerPolyfill {
      constructor() {
        this.signal = new AbortSignalPolyfill();
      }
      abort() {
        this.signal.aborted = true;
        if (typeof this.signal.onabort === "function") {
          this.signal.onabort();
        }
      }
    }
    ctx.AbortController = AbortControllerPolyfill;
    ctx.AbortSignal = AbortSignalPolyfill;
  }
  if (typeof console === "undefined") {
    console = {
      warn: function (msg) {},
      log: function (msg) {},
      error: function (msg) {},
      trace: function (msg) {},
      group: function (msg) {},
      groupEnd: function (msg) {},
    };
    ctx.console = console;
  }
  // Adapted from https://github.com/feross/queue-microtask/blob/master/index.js
  if (typeof queueMicrotask === "function") {
    ctx.queueMicrotask = queueMicrotask.bind(
      typeof window !== "undefined" ? window : global,
    );
  } else {
    // reuse resolved promise, and allocate it lazily
    let promise;
    ctx.queueMicrotask = (cb) =>
      (promise || (promise = Promise.resolve())).then(cb).catch((err) =>
        setTimeout(() => {
          throw err;
        }, 0),
      );
  }
  /**
   * -------------------------------------------------------------------------
   */

  Services.scriptloader.loadSubScript(
    `${rootURI}/content/scripts/__addonRef__.js`,
    ctx,
  );
  await Zotero.__addonInstance__.hooks.onStartup();
}

async function onMainWindowLoad({ window }, reason) {
  await Zotero.__addonInstance__?.hooks.onMainWindowLoad(window);
}

async function onMainWindowUnload({ window }, reason) {
  await Zotero.__addonInstance__?.hooks.onMainWindowUnload(window);
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  await Zotero.__addonInstance__?.hooks.onShutdown();

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

async function uninstall(data, reason) {}
