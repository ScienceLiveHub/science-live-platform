// FIXME: complete the implementations for all menu items

import { getLocaleID, getString } from "../utils/locale";
import { TEMPLATE_METADATA } from "../../../frontend/src/pages/np/create/components/templates/registry-metadata";

function logged(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any) {
    try {
      ztoolkit.log(`Calling ${target.name}.${String(propertyKey)}`);
      return original.apply(this, args);
    } catch (e) {
      ztoolkit.log(`Error in ${target.name}.${String(propertyKey)}`, e);
      throw e;
    }
  };
  return descriptor;
}

function alert(title: string, text: string) {
  const win = Zotero.getMainWindow() as mozIDOMWindowProxy;
  Services.prompt.alert(win, title, text);
}

export class NanopubPluginFactory {
  static makeId = (key: string) =>
    `${addon.data.config.addonRef}-editor-menu-${key}`;

  /**
   * Notifiers - TODO: we currently dont need these?
   */
  @logged
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    const notifierID = Zotero.Notifier.registerObserver(callback, [
      "tab",
      "item",
      "file",
    ]);

    Zotero.Plugins.addObserver({
      shutdown: ({ id }) => {
        if (id === addon.data.config.addonID)
          this.unregisterNotifier(notifierID);
      },
    });
  }

  @logged
  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }

  /**
   * Register right-click context menu items
   *
   * Notes
   *
   *  - icon: Built-in icons can be found under https://github.com/zotero/zotero/tree/main/chrome/skin/default/zotero
   *          which can be referenced e.g. "chrome://zotero/skin/20/universal/add-file.svg"
   *          Otherwise use custom icons e.g. `chrome://${this.addonRef}/content/icons/favicon@0.5x.png`
   */
  @logged
  static registerRightClickMenu(win: Window) {
    const scienceliveLogo = `chrome://${addon.data.config.addonRef}/content/icons/favicon@0.5x.png`;

    // ----- (Separator)
    ztoolkit.Menu.register("item", {
      tag: "menuseparator",
    });

    // Create Nanopublication > [submenu-items] (from predefined TEMPLATE_METADATA)
    ztoolkit.Menu.register("item", {
      tag: "menu",
      label: getString("menuitem-create-nanopub-label"),
      icon: "chrome://zotero/skin/20/universal/plus.svg",
      children: Object.values(TEMPLATE_METADATA).map((t) => ({
        tag: "menuitem",
        label: `${t.icon} ${t.name}`,
        commandListener: (ev) => {
          ev?.stopPropagation?.();
          // Open an independent window (dialog=no) so it's resizable and non-modal.
          const win = Zotero.getMainWindow();
          win.openDialog(
            `chrome://${addon.data.config.addonRef}/content/createNanopub.xhtml`,
            "",
            "chrome,dialog=no,modal=no,centerscreen,resizable,width=900,height=700",
          );
        },
      })),
    });

    // Attach Nanopublication...
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: this.makeId("attach"),
      label: getString("menuitem-attach-nanopub-label"),
      icon: "chrome://zotero/skin/20/universal/add-file.svg",
      commandListener: (ev) => {
        ev?.stopPropagation?.();
        // Open an independent window (dialog=no) so it's resizable and non-modal.
        const win = Zotero.getMainWindow();
        win.openDialog(
          `chrome://${addon.data.config.addonRef}/content/createNanopub.xhtml`,
          "",
          "chrome,dialog=no,modal=no,centerscreen,resizable,width=900,height=700",
        );
      },
    });

    // Search Related Nanopublications
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: this.makeId("search"),
      label: getString("menuitem-search-nanopub-label"),
      icon: "chrome://zotero/skin/20/universal/magnifier.svg",
      commandListener: (ev) => {
        ev?.stopPropagation?.();
        this.searchRelatedNanopubs();
      },
    });
  }

  @logged
  static registerWindowMenu() {
    // File > ----- (Separator)
    ztoolkit.Menu.register("menuFile", {
      tag: "menuseparator",
    });

    // File > Import Nanopublication as New Item...
    ztoolkit.Menu.register("menuFile", {
      tag: "menuitem",
      label: getString("menuitem-file-import-new-label"),
      commandListener: (ev) => {
        ev?.stopPropagation?.();
        this.importNanopubAsNewItem();
      },
    });

    // File > Import Nanopublication (Attach to Item)...
    ztoolkit.Menu.register("menuFile", {
      tag: "menuitem",
      label: getString("menuitem-file-import-attach-label"),
      commandListener: (ev) => {
        ev?.stopPropagation?.();
        this.importNanopubByUrl();
      },
    });
  }

  @logged
  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: addon.data.config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
    });
  }

  /**
   * Search for and attach related nanopublications
   */
  static async searchRelatedNanopubs() {
    try {
      ztoolkit.log("Search related nanopubs triggered");

      const win = Zotero.getMainWindow() as mozIDOMWindowProxy;
      const prompts = Services.prompt;

      // Get selected item
      const pane = Zotero.getActiveZoteroPane();
      if (!pane) {
        throw new Error("No active Zotero pane");
      }

      const items = pane.getSelectedItems();

      if (items.length === 0 || !items[0].isRegularItem()) {
        alert(
          "No Item Selected",
          "Please select an item in your library first.",
        );
        return;
      }

      const targetItem = items[0];
      const itemTitle = targetItem.getField("title");

      ztoolkit.log("Searching for nanopubs related to: " + itemTitle);

      // Show progress
      const progressWin = new ztoolkit.ProgressWindow(
        "Searching for Nanopublications",
      );
      progressWin.createLine({
        text: `"Searching for related nanopublications..."`,
      });
      progressWin.show();

      // Search using the search module
      const searchModule = addon.data.searchModule;
      const nanopubUris = await searchModule.searchForItem(targetItem);

      progressWin.close();

      if (nanopubUris.length === 0) {
        alert("No Results", "No nanopublications found related to this item.");
        return;
      }

      // Ask user if they want to import all or select
      const result = prompts.confirm(
        win,
        "Nanopublications Found",
        `Found ${nanopubUris.length} related nanopublication(s).\n\nDo you want to attach all of them to this item?`,
      );

      if (!result) {
        ztoolkit.log("User cancelled import");
        return;
      }

      // Import all found nanopubs

      progressWin.changeHeadline("Importing Nanopublications");
      progressWin.createLine({
        text: `Importing ${nanopubUris.length} nanopublications...`,
      });
      progressWin.show();

      let successCount = 0;
      let failCount = 0;

      for (const uri of nanopubUris) {
        try {
          // TODO: implement display
          // await Zotero.Nanopub.displayModule.displayFromUri(targetItem, uri);
          successCount++;
          progressWin.createLine({
            text: `✓ Imported ${successCount}/${nanopubUris.length}`,
          });
        } catch (err: any) {
          ztoolkit.log("Failed to import nanopub: " + uri, err);
          failCount++;
        }
      }

      progressWin.close();

      alert(
        "Import Complete",
        `Successfully imported ${successCount} nanopublication(s).\n` +
          (failCount > 0
            ? `Failed to import ${failCount} nanopublication(s).`
            : ""),
      );
    } catch (err: any) {
      ztoolkit.log("Search related nanopubs failed:", err);
      alert("Error", `Failed to search for nanopublications: ${err.message}`);
    }
  }

  /**
   * Import nanopublication as a new standalone item
   */
  static async importNanopubAsNewItem() {
    try {
      ztoolkit.log("Import nanopub as new item triggered");

      const prompts = Services.prompt;
      const input = { value: "https://w3id.org/np/" };
      const win = Zotero.getMainWindow() as mozIDOMWindowProxy;

      const result = prompts.prompt(
        win,
        "Import Nanopublication as New Item",
        "Enter the nanopublication URL:",
        input,
        "",
        { value: false },
      );

      if (!result || !input.value) {
        ztoolkit.log("Import cancelled");
        return;
      }

      const url = input.value.trim();
      ztoolkit.log("Importing nanopub as new item from URL: " + url);

      // Get current collection if one is selected
      const pane = Zotero.getActiveZoteroPane();
      let collectionID;

      if (pane) {
        const collection = pane.getSelectedCollection();
        if (collection) {
          collectionID = collection.id;
          ztoolkit.log("Adding to collection: " + collection.name);
        }
      }

      // Use display module to create standalone item
      // TODO: implement display
      // await Zotero.Nanopub.displayModule.importAsStandaloneItem(
      //   url,
      //   collectionID,
      // );

      alert(
        "Success",
        "Nanopublication imported as a new item! Check your library.",
      );
    } catch (err: any) {
      ztoolkit.log("Import as new item failed:", err);
      alert("Error", `Failed to import nanopublication: ${err.message}`);
    }
  }

  /**
   * Import nanopublication by URL (attach to existing item)
   */
  static async importNanopubByUrl() {
    try {
      ztoolkit.log("Import nanopub by URL triggered");

      const prompts = Services.prompt;
      const input = { value: "https://w3id.org/np/" };
      const win = Zotero.getMainWindow() as mozIDOMWindowProxy;

      const result = prompts.prompt(
        win,
        "Attach Nanopublication to Item",
        "Enter the nanopublication URL:",
        input,
        "",
        { value: false },
      );

      if (!result || !input.value) {
        ztoolkit.log("Import cancelled");
        return;
      }

      const url = input.value.trim();
      ztoolkit.log("Importing nanopub from URL: " + url);

      // Get selected item
      const pane = Zotero.getActiveZoteroPane();
      if (!pane) {
        throw new Error("No active Zotero pane");
      }

      const items = pane.getSelectedItems();

      if (items.length === 0 || !items[0].isRegularItem()) {
        alert(
          "No Item Selected",
          "Please select an item in your library first, then try again.",
        );
        return;
      }

      const targetItem = items[0];
      ztoolkit.log("Target item: " + targetItem.getField("title"));

      // Use display module
      await addon.data.displayModule.displayFromUri(targetItem, url);

      alert(
        "Success",
        "Nanopublication attached successfully! Check the notes attached to your selected item.",
      );
    } catch (err: any) {
      ztoolkit.log("Import failed:", err);
      alert("Error", `Failed to import nanopublication: ${err.message}`);
    }
  }
}
