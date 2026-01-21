import { Converter } from "showdown";
import { NanopubStore } from "../../../frontend/src/lib/nanopub-store";

/**
 * Module for displaying nanopublications
 */
export class NanopubDisplay {
  constructor() {
    // ztoolkit.log("NanopubDisplay: Display module created");
  }

  async saveNanopubToNote(
    item: any,
    np: NanopubStore,
    isCreated: boolean = false,
  ) {
    // Create note with the HTML formatted content
    const note = new Zotero.Item("note");
    const converter = new Converter();
    note.setNote(converter.makeHtml(np.toMarkdownString()));
    note.parentItemID = item.id;

    // Add tags
    note.addTag("nanopublication");
    note.addTag(isCreated ? "nanopub:created" : "nanopub:imported");

    // Add type-based tag if possible
    const typeTag =
      np.metadata.types?.join(", ") ??
      np.metadata.title?.toLowerCase().replace(/[^\w]+/g, "-");
    if (typeTag) {
      note.addTag(`nanopub:${typeTag}`);
    }
    await note.saveTx();
  }

  /**
   * Display a nanopublication from URI in a Zotero note attached to an existing item
   * @param item - The Zotero item to attach the note to
   * @param nanopubUri - The URI of the nanopublication
   * @param isCreated - If true, tag as 'nanopub:created', otherwise 'nanopub:imported'
   */
  async displayFromUri(
    item: any,
    nanopubUri: string,
    isCreated: boolean = false,
  ): Promise<void> {
    try {
      ztoolkit.log("Displaying nanopub from URI: " + nanopubUri);

      const np = await NanopubStore.load(nanopubUri);
      await this.saveNanopubToNote(item, np, isCreated);

      ztoolkit.log("Successfully created note for nanopub: " + nanopubUri);
    } catch (err: any) {
      ztoolkit.log("Failed to display nanopub from URI: " + nanopubUri, err);
      throw err;
    }
  }
  /**
   * Display a nanopublication from TriG content in a saved Zotero note
   */
  async displayFromContent(item: any, trigContent: string): Promise<void> {
    try {
      ztoolkit.log("Displaying nanopub from content");

      const np = await NanopubStore.loadString(trigContent);
      await this.saveNanopubToNote(item, np, true);

      ztoolkit.log("Successfully created note with nanopub content");
    } catch (err: any) {
      ztoolkit.log("Failed to display nanopub from content", err);
      throw err;
    }
  }

  /**
   * Import a nanopublication as a standalone Zotero item
   */
  async importAsStandaloneItem(
    nanopubUri: string,
    collectionID?: number,
  ): Promise<any> {
    try {
      ztoolkit.log(
        "Importing nanopub as standalone item from URI: " + nanopubUri,
      );

      const np = await NanopubStore.load(nanopubUri);

      // Create a new item (using 'document' type as closest match)
      const item = new Zotero.Item("document");

      // Set basic metadata
      item.setField("title", `Science Live: ${np.metadata.title}`);
      item.setField("url", nanopubUri);
      item.setField("accessDate", new Date().toISOString().split("T")[0]);
      const primaryCreator = np.metadata.creators?.[0];
      if (primaryCreator?.name) {
        const cleanedCreator = Zotero.Utilities.cleanAuthor(
          primaryCreator.name,
          "author",
        );
        item.setCreator(0, {
          ...cleanedCreator,
          creatorType: "author",
        });
      }
      item.setField("date", np.metadata.created!);
      // Add to collection if specified
      if (collectionID) {
        item.setCollections([collectionID]);
      }
      // Save the item first
      await item.saveTx();
      // Add tags
      item.addTag("nanopublication");
      item.addTag("nanopub:imported");
      // Add type-based tag
      const typeTag = np.metadata.title?.toLowerCase().replace(/[^\w]+/g, "-");
      item.addTag(`nanopub:${typeTag}`);
      await item.saveTx();

      // Now create a note with the full content and attach it
      const note = new Zotero.Item("note");
      const converter = new Converter();
      note.setNote(converter.makeHtml(np.toMarkdownString()));
      note.parentItemID = item.id;

      note.addTag("nanopub:content");
      await note.saveTx();

      ztoolkit.log(
        "Successfully created standalone item for nanopub: " + nanopubUri,
      );
      return item;
    } catch (err: any) {
      ztoolkit.log(
        "Failed to import nanopub as standalone item: " + nanopubUri,
        err,
      );
      throw err;
    }
  }
}
