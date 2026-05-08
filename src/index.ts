import type { Plugin } from "sanity";
import type { DefaultDocumentNodeResolver } from "sanity/structure";
import { definePlugin } from "sanity";

import { createPreviewAction } from "./action";
import { createDefaultDocumentNode } from "./structure";
import type { PreviewPaneConfig } from "./types";

export type { PreviewPaneConfig, SanityDocumentLike } from "./types";
export { InlinePreview, createPreviewField } from "./inline-preview";
export type { InlinePreviewProps } from "./inline-preview";

export interface PreviewPane {
  /**
   * The plugin to register in `defineConfig({ plugins: [...] })`.
   * Adds the "Open Preview" document action for matching document types.
   */
  plugin: Plugin;

  /**
   * Pass to `structureTool({ defaultDocumentNode })` to render the inline
   * iframe Preview tab next to the document form.
   */
  defaultDocumentNode: DefaultDocumentNodeResolver;
}

/**
 * Configure the preview pane plugin. Returns matched halves for the two
 * places Sanity expects them: `plugin` for the top-level plugins list, and
 * `defaultDocumentNode` for `structureTool`. Both share the same config so
 * you only describe the preview once.
 *
 * Example:
 *
 *   import { defineConfig } from 'sanity'
 *   import { structureTool } from 'sanity/structure'
 *   import { definePreviewPane } from 'sanity-plugin-preview-pane'
 *
 *   const preview = definePreviewPane({
 *     buildPreviewUrl: (doc) => {
 *       const id = doc._id.replace(/^drafts\./, '')
 *       return `https://example.com/preview/${id}`
 *     },
 *     documentTypes: ['page', 'post'],
 *   })
 *
 *   export default defineConfig({
 *     plugins: [
 *       preview.plugin,
 *       structureTool({ defaultDocumentNode: preview.defaultDocumentNode }),
 *     ],
 *   })
 */
export function definePreviewPane(config: PreviewPaneConfig): PreviewPane {
  if (!config.documentTypes?.length) {
    throw new Error(
      "[sanity-plugin-preview-pane] `documentTypes` must be a non-empty array."
    );
  }
  if (typeof config.buildPreviewUrl !== "function") {
    throw new Error(
      "[sanity-plugin-preview-pane] `buildPreviewUrl` must be a function returning the preview URL for a document."
    );
  }

  const previewAction = createPreviewAction(config);
  const documentTypes = new Set(config.documentTypes);

  const plugin = definePlugin({
    name: "sanity-plugin-preview-pane",
    document: {
      actions: (prev, ctx) =>
        documentTypes.has(ctx.schemaType) ? [...prev, previewAction] : prev,
    },
  });

  const defaultDocumentNode = createDefaultDocumentNode(config);

  return { plugin, defaultDocumentNode };
}
