/**
 * Example wiring for sanity-plugin-preview-pane.
 *
 * Copy the relevant pieces into your project's `sanity.config.ts`. This file
 * is reference-only and not bundled into the published plugin.
 */
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { definePreviewPane } from "sanity-plugin-preview-pane";

// Configure once. The result has `.plugin` and `.defaultDocumentNode` that
// share the same options under the hood.
const preview = definePreviewPane({
  // Build the URL however you want — the doc has full access to slug, locale,
  // _type, and any other field. Strip the "drafts." prefix yourself if your
  // preview route doesn't accept it.
  buildPreviewUrl: (doc) => {
    const id = doc._id.replace(/^drafts\./, "");
    const baseUrl =
      process.env.SANITY_STUDIO_PREVIEW_URL ?? "http://localhost:3000";

    // Slug-based:
    // const slug = (doc.slug as { current?: string } | undefined)?.current
    // return slug ? `${baseUrl}/preview/${slug}` : null

    // Id-based (good when slugs aren't required):
    return `${baseUrl}/preview/${id}`;
  },

  // Document types that get the inline Preview tab + Open Preview action.
  documentTypes: ["page", "post"],

  // Optional — see PreviewPaneConfig in src/types.ts for the full shape.
  iframeOptions: {
    defaultSize: "desktop",
    reload: { button: true },
  },
  popupSize: { width: 1280, height: 900 },
});

export default defineConfig({
  name: "default",
  title: "My Studio",
  projectId: "your-project-id",
  dataset: "production",

  plugins: [
    preview.plugin,
    structureTool({ defaultDocumentNode: preview.defaultDocumentNode }),
  ],

  schema: {
    types: [
      // Your schema types …
    ],
  },
});
