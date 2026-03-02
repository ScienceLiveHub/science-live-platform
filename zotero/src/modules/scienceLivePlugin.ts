import { getLocaleID, getString } from "../utils/locale";
import {
  TEMPLATE_METADATA,
  TEMPLATE_URI,
} from "../../../frontend/src/pages/np/create/components/templates/registry-metadata";
import { extractDoisFromText } from "../../../frontend/src/lib/uri";

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

function isDarkMode(win?: _ZoteroTypes.MainWindow) {
  // TODO: To handle changes in darkmode, use something like this:
  // const mediaQuery = win.matchMedia("(prefers-color-scheme: dark)");
  // mediaQuery.addEventListener("change", (e) => {
  //   const newIsDarkMode = e.matches;
  //   // Handle theme change
  // });
  win = win ?? Zotero.getMainWindow();
  return !!win.matchMedia("(prefers-color-scheme: dark)")?.matches;
}

type PublishResult = {
  uri: string;
  signedRdf: string;
};

/**
 * Open a dialog window for creating a new nanopub, using a given template
 * and optional prefilled form data.
 */
function openNanopubCreationDialog(
  templateUri: string,
  prefilledData: any,
  onPublished?: (result: PublishResult) => void | Promise<void>,
) {
  // Open the form with pre-filled data
  const win = Zotero.getMainWindow();
  const dark = isDarkMode(win);

  // Open an independent window (dialog=no) so it's resizable and non-modal.
  const dialog = win.openDialog(
    `chrome://${addon.data.config.addonRef}/content/createNanopub.xhtml`,
    "",
    "chrome,dialog=no,modal=no,centerscreen,resizable,width=900,height=700",
    templateUri,
    prefilledData,
    __api__,
    dark,
  );

  // Register a callback on the dialog window to relay results back to the parent
  // opener (chrome) context.
  if (dialog && onPublished) {
    (dialog as any).nanopubPublishedCallback = (result: PublishResult) => {
      onPublished?.(result);
    };
  }
}

/**
 * Get the annotation item based on key
 */
async function getAnnotationItem(reader: any, annotationKey: string) {
  let annotationItem: Zotero.Item | false | undefined = undefined;

  // First try as an ID (number)
  if (!isNaN(Number(annotationKey))) {
    annotationItem = await Zotero.Items.getAsync(Number(annotationKey));
    ztoolkit.log(`ReaderIntegration: Tried as ID, found: ${!!annotationItem}`);
  }

  // If not found, try to find it via the reader's PDF item using the key
  if (!annotationItem && reader.itemID) {
    ztoolkit.log(
      `ReaderIntegration: Trying via reader.itemID: ${reader.itemID}`,
    );
    const pdfItem = await Zotero.Items.getAsync(reader.itemID);
    if (pdfItem) {
      const annotations = pdfItem.getAnnotations();
      ztoolkit.log(
        `ReaderIntegration: PDF has ${annotations.length} annotations`,
      );
      annotationItem = annotations.find(
        (a: any) => a.key === annotationKey || a.id == annotationKey,
      );
      ztoolkit.log(
        `ReaderIntegration: Found via key match: ${!!annotationItem}`,
      );
    }
  }

  // Try one more approach - get by key directly
  if (!annotationItem) {
    try {
      const libraryID = Zotero.Libraries.userLibraryID;
      annotationItem = await Zotero.Items.getByLibraryAndKeyAsync(
        libraryID,
        annotationKey,
      );
      ztoolkit.log(
        `ReaderIntegration: Tried getByLibraryAndKeyAsync, found: ${!!annotationItem}`,
      );
    } catch (e) {
      ztoolkit.log(`ReaderIntegration: getByLibraryAndKeyAsync failed: ${e}`);
    }
  }

  if (!annotationItem) {
    ztoolkit.log(
      "ReaderIntegration: Annotation not found for key: " + annotationKey,
    );
    alert("Error", "Annotation not found. Please try again.");
    return undefined;
  }

  return annotationItem;
}

/**
 * Process quote text - split if > 500 characters
 */
function splitIfTooLong(text: string): {
  quoteStart: string;
  quoteEnd?: string;
} {
  if (!text || text.length <= 500) {
    return { quoteStart: text };
  }

  const firstPart = text.substring(0, 500);
  const lastSentenceEnd = Math.max(
    firstPart.lastIndexOf(". "),
    firstPart.lastIndexOf("! "),
    firstPart.lastIndexOf("? "),
  );

  let quoteStart: string;
  let remainingText: string;

  if (lastSentenceEnd > 200) {
    quoteStart = text.substring(0, lastSentenceEnd + 1).trim();
    remainingText = text.substring(lastSentenceEnd + 1).trim();
  } else {
    quoteStart = firstPart.trim();
    remainingText = text.substring(500).trim();
  }

  const sentences = remainingText.split(/(?<=[.!?])\s+/);
  const quoteEnd =
    sentences.length > 0 ? sentences[sentences.length - 1].trim() : undefined;

  return { quoteStart, quoteEnd };
}

export class ScienceLivePlugin {
  // Create Nanopublication menu and dynamically generated submenus(from predefined TEMPLATE_METADATA)
  static createNanopubMenu = () =>
    ({
      menuType: "submenu",
      l10nID: getLocaleID("menuitem-create-nanopub-submenu"),
      icon: "chrome://zotero/skin/20/universal/plus.svg",
      menus: Object.entries(TEMPLATE_METADATA).map(([k, v]) => ({
        menuType: "menuitem",
        l10nID: getLocaleID("menuitem-custom-label"),
        l10nArgs: { npLabel: `${v.icon} ${v.name}` },
        onCommand: (event: any) => {
          event?.stopPropagation?.();
          openNanopubCreationDialog(k, null);
        },
      })),
    }) as _ZoteroTypes.MenuManager.MenuData<_ZoteroTypes.MenuManager.BaseMenuContext>;

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

    Zotero.MenuManager.registerMenu({
      menuID: "science-live-item-context-menu",
      pluginID: addon.data.config.addonID,
      target: "main/library/item",
      menus: [
        // Create Nanopublication > [submenu-items]
        ScienceLivePlugin.createNanopubMenu(),
        // Attach Nanopublication...
        {
          menuType: "menuitem",
          l10nID: getLocaleID("menuitem-attach-nanopub-label"),
          icon: "chrome://zotero/skin/20/universal/add-file.svg",
          onCommand: (event) => {
            event?.stopPropagation?.();
            this.importNanopubByUrl();
          },
        },
        // Search Related Nanopublications
        {
          menuType: "menuitem",

          l10nID: getLocaleID("menuitem-search-nanopub-label"),
          icon: "chrome://zotero/skin/20/universal/magnifier.svg",
          onCommand: (event) => {
            event?.stopPropagation?.();
            this.searchRelatedNanopubs();
          },
        },
      ],
    });
  }

  /**
   * Register File menu items
   */
  @logged
  static registerWindowMenu() {
    Zotero.MenuManager.registerMenu({
      menuID: "science-live-file-menu",
      pluginID: addon.data.config.addonID,
      target: "main/menubar/file",
      menus: [
        { menuType: "separator" },
        // File > Import Nanopublication as New Item...
        {
          menuType: "menuitem",
          l10nID: getLocaleID("menuitem-file-import-new-label"),
          onCommand: (event) => {
            event?.stopPropagation?.();
            this.importNanopubAsNewItem();
          },
        },
        // File > Import Nanopublication (Attach to Item)...
        {
          menuType: "menuitem",
          l10nID: getLocaleID("menuitem-file-import-attach-label"),
          onCommand: (event) => {
            event?.stopPropagation?.();
            this.importNanopubByUrl();
          },
        },
        // Create Nanopublication > [submenu-items]
        ScienceLivePlugin.createNanopubMenu(),
      ],
    });
  }

  /**
   * Register Reader/annotation menu items
   */
  @logged
  static registerReaderMenu() {
    ztoolkit.log("ReaderIntegration: Registering PDF reader integration...");

    if (!Zotero.Reader) {
      ztoolkit.log("ReaderIntegration: Zotero.Reader not available");
      return;
    }

    if (!Zotero.Reader.registerEventListener) {
      ztoolkit.log(
        "ReaderIntegration: Zotero.Reader.registerEventListener not available",
      );
      return;
    }

    // ztoolkit doesnt seem to include Reader event listener, so use Zotero
    // object, and remember to unregister it eventually as well.

    // Dynamically adds "Create Nanopublication" to annotation context menu
    // (each time it is right-clicked)
    Zotero.Reader.registerEventListener(
      "createAnnotationContextMenu",
      this.handleAnnotationContextMenu.bind(this),
      addon.data.config.addonID,
    );
  }

  /**
   * Register Preferences panel in Settings
   */
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
   * Reader Annotation menu handler
   *
   * This runs each time an Annotation is right-clicked, and dynamically appends
   * the plugin-specific menu items
   */
  static handleAnnotationContextMenu(
    event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
  ) {
    try {
      ztoolkit.log("ReaderIntegration: Annotation context menu triggered");

      const { reader, params, append } = event;

      const annotationIds = params.ids || [];
      ztoolkit.log(
        `ReaderIntegration: Annotation IDs: ${JSON.stringify(annotationIds)}`,
      );

      if (annotationIds.length === 0) {
        ztoolkit.log("ReaderIntegration: No annotations selected");
        return;
      }

      append({
        label: "✨ Create Nanopublication from Annotation",
        onCommand: async () => {
          await this.createNanopubFromAnnotation(reader, annotationIds[0]);
        },
      });

      append({
        label: "📚 Create Citation Nanopublication",
        onCommand: async () => {
          await this.createCitationNanopubFromAnnotation(
            reader,
            annotationIds[0],
          );
        },
      });

      ztoolkit.log("ReaderIntegration: Menu item added");
    } catch (err: any) {
      ztoolkit.log("ReaderIntegration: Error in context menu handler:", err);
    }
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
          await addon.data.displayModule.displayFromUri(targetItem, uri);
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
      await addon.data.displayModule.importAsStandaloneItem(url, collectionID);

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

  /**
   * Create nanopublication from an annotation
   */
  private static async createNanopubFromAnnotation(
    reader: any,
    annotationKey: string,
  ) {
    try {
      ztoolkit.log(
        `ReaderIntegration: Creating nanopub from annotation key: ${annotationKey}`,
      );

      const annotationItem = await getAnnotationItem(reader, annotationKey);
      if (!annotationItem) {
        return;
      }

      // Get annotation data
      const annotationText = annotationItem.annotationText || "";
      const annotationComment = annotationItem.annotationComment || "";
      const pageLabel = annotationItem.annotationPageLabel || "";

      // Get the PDF item and parent item
      const pdfItem = annotationItem.parentItem;
      if (!pdfItem) {
        ztoolkit.log("ReaderIntegration: PDF item not found");
        alert("Error", "PDF item not found");
        return;
      }

      const parentItem = pdfItem.parentItem;
      if (!parentItem) {
        ztoolkit.log("ReaderIntegration: Parent item not found");
        alert("Error", "Parent item not found");
        return;
      }

      // Process the quote text
      const { quoteStart, quoteEnd } = splitIfTooLong(annotationText);

      // Prepare annotation data for the form
      const annotationData = {
        quotation: quoteStart,
        "quotation-end": quoteEnd,
        comment: annotationComment,
        paper: parentItem.getField("DOI"),
        quoteType: quoteEnd && quoteEnd.length > 0 ? "ends" : "whole",
      };

      openNanopubCreationDialog(
        TEMPLATE_URI.ANNOTATE_QUOTATION,
        annotationData,
        async ({ signedRdf }) =>
          await addon.data.displayModule.displayFromContent(
            parentItem,
            signedRdf,
          ),
      );
    } catch (err: any) {
      ztoolkit.log(
        "ReaderIntegration: Failed to create nanopub from annotation:",
        err,
      );
      alert("Error", `Failed to create nanopublication:\n${err.message}`);
    }
  }

  /**
   * Create Citation nanopublication from an annotation
   */
  private static async createCitationNanopubFromAnnotation(
    reader: any,
    annotationKey: string,
  ) {
    try {
      ztoolkit.log(
        `ReaderIntegration: Creating Citation nanopub from annotation key: ${annotationKey}`,
      );
      const annotationItem = await getAnnotationItem(reader, annotationKey);
      if (!annotationItem) {
        return;
      }

      // Get annotation data
      const annotationText = annotationItem.annotationText || "";

      // Get the PDF item and parent item
      const pdfItem = annotationItem.parentItem;
      if (!pdfItem) {
        ztoolkit.log("ReaderIntegration: PDF item not found");
        alert("Error", "PDF item not found");
        return;
      }

      const parentItem = pdfItem.parentItem;
      if (!parentItem) {
        ztoolkit.log("ReaderIntegration: Parent item not found");
        alert("Error", "Parent item not found");
        return;
      }
      const doi = parentItem.getField("DOI");

      // TODO: should URL or DOI be preferred?
      const article = doi
        ? `https://doi.org/${doi}`
        : parentItem.getField("URL") || undefined;
      const cited = extractDoisFromText(annotationText);
      const st02 = [];
      for (const c of cited) {
        st02.push({ cited: `https://doi.org/${c}` });
      }

      // Prepare data for the form
      const annotationData = {
        article, // Must be a URL, either DOI url or other URL from Zotero Item
        st02,
      };

      openNanopubCreationDialog(
        TEMPLATE_URI.CITATION_CITO,
        annotationData,
        async ({ signedRdf }) =>
          await addon.data.displayModule.displayFromContent(
            parentItem,
            signedRdf,
          ),
      );
    } catch (err: any) {
      ztoolkit.log(
        "ReaderIntegration: Failed to create nanopub from annotation:",
        err,
      );
      alert("Error", `Failed to create nanopublication:\n${err.message}`);
    }
  }

  /**
   * Additional cleanup on shutdown.
   *
   * Note: Anything registered anywhere through a ztoolkit Manager (e.g. ztoolkit.Menu.register)
   * will already be cleaned up by ztoolkit.unregisterAll(), so only include cleanup of other
   * items (e.g. Zotero.Reader.register) which dont explicitly state they are called automatically
   * (e.g. Zotero.PreferencePanes.unregister states that it is already called automatically)
   */
  static unregister() {
    try {
      Zotero.Reader.unregisterEventListener(
        "createAnnotationContextMenu",
        this.handleAnnotationContextMenu.bind(this),
      );
    } catch (err: any) {
      ztoolkit.log("ReaderIntegration: Failed to unregister:", err);
    }
    try {
      Zotero.MenuManager.unregisterMenu("science-live-file-menu");
      Zotero.MenuManager.unregisterMenu("science-live-item-context-menu");
    } catch (err: any) {
      ztoolkit.log("Menus: Failed to unregister:", err);
    }
  }
}
