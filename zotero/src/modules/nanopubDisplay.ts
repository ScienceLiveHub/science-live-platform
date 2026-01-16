// FIXME: This file is mainly a paste of the old plugin and needs fixing

import { NanopubStore } from "../../../frontend/src/lib/nanopub-store";

/**
 * Module for displaying nanopublications
 */
export class NanopubDisplay {
  constructor() {
    // ztoolkit.log("NanopubDisplay: Display module created");
  }

  /**
   * Display a nanopublication from URI in a Zotero note attached to an item
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

      // Create a temporary container
      const doc = Zotero.getMainWindow().document;

      // Render the nanopub
      const htmlContent = "";

      const np = await NanopubStore.load(nanopubUri);

      // Extract label/type from parsed data or rendered HTML
      const nanopubLabel = np.metadata.title;

      // Create note with the cleaned content
      const note = new Zotero.Item("note");

      // Include CSS and content with a direct link
      const noteContent = `
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid currentColor;">
          Science Live: ${nanopubLabel}
        </div>
        <link rel="stylesheet" href="chrome://nanopub-plugin/content/styles/nanopub-viewer.css">
        <style>
          button, .action-bar, .actions, .nanopub-actions, 
          [class*="action"], [class*="button"], .copy-button, 
          .download-buttons, .format-buttons {
            display: none !important;
          }
        </style>
        <div class="nanopub-container">
          ${htmlContent}
        </div>
        <div style="margin-top: 20px; padding: 15px; border: 2px solid currentColor; border-radius: 6px; opacity: 0.8;">
          <div style="font-size: 13px; margin-bottom: 8px;">
            <strong>📎 Nanopublication Source:</strong>
          </div>
          <div style="font-size: 12px; margin-bottom: 10px; word-break: break-all;">
            <a href="${nanopubUri}" target="_blank" style="color: inherit; text-decoration: underline;">${nanopubUri}</a>
          </div>
          <div style="font-size: 11px;">
            <a href="https://platform.sciencelive4all.org/np/?uri=${encodeURIComponent(nanopubUri)}" target="_blank" style="color: inherit; text-decoration: underline;">🔍 Explore on Science Live</a>
          </div>
        </div>
      `;
      note.setNote(noteContent);
      note.parentItemID = item.id;

      // Add tags
      note.addTag("nanopublication");
      note.addTag(isCreated ? "nanopub:created" : "nanopub:imported");

      // Add type-based tag
      const typeTag =
        np.metadata.types?.join(", ") ??
        nanopubLabel?.toLowerCase().replace(/[^\w]+/g, "-");
      note.addTag(`nanopub:${typeTag}`);

      await note.saveTx();

      ztoolkit.log("Successfully created note for nanopub: " + nanopubUri);
    } catch (err: any) {
      ztoolkit.log("Failed to display nanopub from URI: " + nanopubUri, err);
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
    // try {
    //   ztoolkit.log(
    //     "Importing nanopub as standalone item from URI: " + nanopubUri,
    //   );
    //   // Create viewer instance
    //   const viewer = new NanopubViewer({
    //     theme: "default",
    //     showMetadata: true,
    //   });
    //   // Create a temporary container
    //   const doc = Zotero.getMainWindow().document;
    //   const tempDiv = doc.createElement("div");
    //   // Render the nanopub
    //   const parsedData = await viewer.renderFromUri(tempDiv, nanopubUri);
    //   // Extract label/type from parsed data or rendered HTML
    //   const nanopubLabel = this.extractLabelFromParsedData(parsedData, tempDiv);
    //   ztoolkit.log("Extracted nanopub label: " + nanopubLabel);
    //   // Get the HTML content
    //   let htmlContent = tempDiv.innerHTML;
    //   // Remove interactive elements and text labels
    //   htmlContent = this.cleanHtmlForNote(htmlContent.toString());
    //   // Create a new item (using 'document' type as closest match)
    //   const item = new Zotero.Item("document");
    //   // Set basic metadata
    //   item.setField("title", `Science Live: ${nanopubLabel}`);
    //   item.setField("url", nanopubUri);
    //   item.setField("accessDate", new Date().toISOString().split("T")[0]);
    //   // Try to extract author/date from parsed data if available
    //   if (parsedData) {
    //     if (parsedData.creator || parsedData.author) {
    //       const creatorName = parsedData.creator || parsedData.author;
    //       item.setCreator(
    //         0,
    //         Zotero.Utilities.cleanAuthor(creatorName, "author"),
    //       );
    //     }
    //     if (parsedData.date || parsedData.created) {
    //       const date = parsedData.date || parsedData.created;
    //       item.setField("date", date);
    //     }
    //   }
    //   // Add to collection if specified
    //   if (collectionID) {
    //     item.setCollections([collectionID]);
    //   }
    //   // Save the item first
    //   await item.saveTx();
    //   // Add tags
    //   item.addTag("nanopublication");
    //   item.addTag("nanopub:imported");
    //   // Add type-based tag
    //   const typeTag = nanopubLabel.toLowerCase().replace(/[^\w]+/g, "-");
    //   item.addTag(`nanopub:${typeTag}`);
    //   await item.saveTx();
    //   // Now create a note with the full content and attach it
    //   const note = new Zotero.Item("note");
    //   const noteContent = `
    //     <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid currentColor;">
    //       Nanopublication Content
    //     </div>
    //     <link rel="stylesheet" href="chrome://nanopub-plugin/content/styles/nanopub-viewer.css">
    //     <style>
    //       button, .action-bar, .actions, .nanopub-actions,
    //       [class*="action"], [class*="button"], .copy-button,
    //       .download-buttons, .format-buttons {
    //         display: none !important;
    //       }
    //     </style>
    //     <div class="nanopub-container">
    //       ${htmlContent}
    //     </div>
    //     <div style="margin-top: 20px; padding: 15px; border: 2px solid currentColor; border-radius: 6px; opacity: 0.8;">
    //       <div style="font-size: 13px; margin-bottom: 8px;">
    //         <strong>📎 Nanopublication Source:</strong>
    //       </div>
    //       <div style="font-size: 12px; margin-bottom: 10px; word-break: break-all;">
    //         <a href="${nanopubUri}" target="_blank" style="color: inherit; text-decoration: underline;">${nanopubUri}</a>
    //       </div>
    //       <div style="font-size: 11px;">
    //         <a href="https://nanodash.knowledgepixels.com/explore?id=${encodeURIComponent(nanopubUri)}" target="_blank" style="color: inherit; text-decoration: underline;">🔍 Explore this nanopublication</a>
    //       </div>
    //     </div>
    //   `;
    //   note.setNote(noteContent);
    //   note.parentItemID = item.id;
    //   note.addTag("nanopub:content");
    //   await note.saveTx();
    //   ztoolkit.log(
    //     "Successfully created standalone item for nanopub: " + nanopubUri,
    //   );
    //   return item;
    // } catch (err: any) {
    //   ztoolkit.log(
    //     "Failed to import nanopub as standalone item: " + nanopubUri,
    //     err,
    //   );
    //   throw err;
    // }
  }
  /**
   * Display a nanopublication from TriG content in a Zotero note
   */
  async displayFromContent(item: any, trigContent: string): Promise<void> {
    // try {
    //   ztoolkit.log("Displaying nanopub from content");
    //   // Create viewer instance
    //   const viewer = new NanopubViewer({
    //     theme: "default",
    //     showMetadata: true,
    //   });
    //   // Create a temporary container
    //   const doc = Zotero.getMainWindow().document;
    //   const tempDiv = doc.createElement("div");
    //   // Render the nanopub
    //   const parsedData = await viewer.render(tempDiv, trigContent);
    //   // Extract label from parsed data
    //   const nanopubLabel = this.extractLabelFromParsedData(parsedData, tempDiv);
    //   ztoolkit.log("Extracted nanopub label: " + nanopubLabel);
    //   // Get and clean HTML
    //   let htmlContent = tempDiv.innerHTML;
    //   htmlContent = this.cleanHtmlForNote(htmlContent.toString());
    //   // Create note with the rendered content
    //   const note = new Zotero.Item("note");
    //   const noteContent = `
    //     <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid currentColor;">
    //       Science Live: ${nanopubLabel}
    //     </div>
    //     <link rel="stylesheet" href="chrome://nanopub-plugin/content/styles/nanopub-viewer.css">
    //     <style>
    //       button, .action-bar, .actions, .nanopub-actions,
    //       [class*="action"], [class*="button"], .copy-button,
    //       .download-buttons, .format-buttons {
    //         display: none !important;
    //       }
    //     </style>
    //     <div class="nanopub-container">
    //       ${htmlContent}
    //     </div>
    //   `;
    //   note.setNote(noteContent);
    //   note.parentItemID = item.id;
    //   // Add tags
    //   note.addTag("nanopublication");
    //   note.addTag("nanopub:created");
    //   const typeTag = nanopubLabel.toLowerCase().replace(/[^\w]+/g, "-");
    //   note.addTag(`nanopub:${typeTag}`);
    //   await note.saveTx();
    //   ztoolkit.log("Successfully created note with nanopub content");
    // } catch (err: any) {
    //   ztoolkit.log("Failed to display nanopub from content", err);
    //   throw err;
    // }
  }
}
