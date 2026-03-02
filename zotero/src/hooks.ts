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
  const currentApiKey = getPref("apiKey");

  if (currentApiKey) return;

  const win = Zotero.getMainWindow() as mozIDOMWindowProxy;
  const prompts = Services.prompt as any;

  if (!currentApiKey) {
    const apiKeyInput = { value: "" };
    const result = prompts.promptPassword(
      win,
      "Connect Science Live Account",
      "If you would like to create Nanopublications, use your verified Science Live account (linked to ORCID) to create an API key using the link below, and paste it here to connect.  You can also set this later in the Zotero settings.\n\nhttps://platform.sciencelive4all.org/settings/api-keys\n\n",
      apiKeyInput,
      "",
      { value: false },
    );

    // If cancelled, return
    if (!result) return;

    const newApiKey = apiKeyInput.value.trim();

    if (newApiKey) {
      setPref("apiKey", newApiKey);
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
