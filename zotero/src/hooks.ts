import { ScienceLivePlugin } from "./modules/scienceLivePlugin";
import { getString, initLocale } from "./utils/locale";
import { getPref, setPref } from "./utils/prefs";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  ScienceLivePlugin.registerPrefs();

  ScienceLivePlugin.registerNotifier();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  await ensureProfilePrefs();

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function ensureProfilePrefs() {
  const currentName = getPref("name");
  const currentOrcid = getPref("orcid");
  const currentPrivateKey = getPref("privateKey");

  const needsProfile = !currentName || !currentOrcid || !currentPrivateKey;
  if (!needsProfile) return;

  const win = Zotero.getMainWindow() as mozIDOMWindowProxy;
  const prompts = Services.prompt as any;

  if (!currentName) {
    const nameInput = { value: "" };
    const result = prompts.prompt(
      win,
      "Setup Science Live Nanopub Profile",
      "The Science Live Nanopub extension requires initial setup, which involves entering your name, ORCID, and a RSA signing key.\nThese can be later changed in Zotero Settings.\n\nEnter your name:",
      nameInput,
    );

    if (!result) return;
    const trimmed = nameInput.value.trim();
    if (trimmed) {
      setPref("name", trimmed);
    }
  }

  if (!currentOrcid) {
    const orcidInput = { value: "" };
    const result = prompts.prompt(
      win,
      "Setup Nanopub Profile",
      "Enter your ORCID (full URL e.g. https://orcid.org/0000-0002-1234-5678):",
      orcidInput,
      "",
      { value: false },
    );

    if (!result) return;
    const trimmed = orcidInput.value.trim();
    if (trimmed) {
      setPref("orcid", trimmed);
    }
  }

  if (!currentPrivateKey) {
    const privateKeyInput = { value: "" };
    const result = prompts.prompt(
      win,
      "Setup Science Live Nanopub Profile",
      "Paste your RSA secret signing key below.\ne.g.\n   -----BEGIN RSA PRIVATE KEY-----\n   ABCD...\n   -----END PRIVATE KEY-----\n\n(To generate a new one, use https://cryptotools.net/rsagen or type `openssl genrsa` in your terminal)",
      privateKeyInput,
      "",
      { value: false },
    );

    if (!result) return;
    const trimmed = privateKeyInput.value.trim();
    if (trimmed) {
      setPref("privateKey", trimmed);
    }
  }
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  ScienceLivePlugin.registerRightClickMenu(win);

  ScienceLivePlugin.registerWindowMenu();

  ScienceLivePlugin.registerReaderMenu();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  ScienceLivePlugin.unregister();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  ScienceLivePlugin.unregister();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this function clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (
    event == "select" &&
    type == "tab" &&
    extraData[ids[0]].type == "reader"
  ) {
    // NanopubPluginFactory.exampleNotifierCallback();
  } else {
    return;
  }
}

function onDialogEvents(type: string) {
  // Dialog events handled here
  switch (type) {
    default:
      break;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onDialogEvents,
};
