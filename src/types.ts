/**
 * Minimal shape required from a Sanity document so the plugin can stay loosely
 * typed — full document types are user-supplied.
 */
export interface SanityDocumentLike {
  _id: string;
  _type: string;
  [key: string]: unknown;
}

export interface PreviewPaneConfig {
  /**
   * Returns the preview URL for a given document.
   *
   * Receives the published or draft document. The `_id` is passed through
   * unchanged (still includes any `drafts.` prefix); strip it yourself if your
   * preview route expects a clean id.
   *
   * Return an empty string or `null` to disable the preview for a specific
   * document at runtime (e.g. unpublished drafts that have no preview route yet).
   */
  buildPreviewUrl: (doc: SanityDocumentLike) => string | null | undefined;

  /**
   * Document types that get the preview pane and the "Open Preview" action.
   * Schema types not in this list see no plugin behavior.
   */
  documentTypes: string[];

  /**
   * Options forwarded to `sanity-plugin-iframe-pane`.
   * Defaults to a desktop-sized iframe with a reload button.
   */
  iframeOptions?: {
    defaultSize?: "desktop" | "mobile";
    reload?: { button: boolean };
  };

  /**
   * Size of the popup window opened by the "Open Preview" document action.
   * Defaults to `{ width: 1200, height: 800 }`.
   */
  popupSize?: {
    width: number;
    height: number;
  };

  /**
   * Window name for the popup. Reusing the same name causes subsequent clicks
   * to reuse the existing window. Defaults to `"sanity-preview"`.
   */
  popupName?: string;

  /**
   * Override the label for the document action. Defaults to "Open Preview".
   */
  actionLabel?: string;

  /**
   * Override the title for the inline preview pane tab. Defaults to "Preview".
   */
  paneTitle?: string;
}
