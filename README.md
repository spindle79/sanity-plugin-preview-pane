# sanity-plugin-preview-pane

> Three preview entry points for Sanity Studio editors — all driven by one config.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **At a glance** — A small Sanity plugin that wires up the three places editors expect to find a preview:
>
> 1. An **"Open Preview"** entry in the document action menu, which pops the URL in a new window
> 2. An **inline iframe Preview tab** next to the document form (via [`sanity-plugin-iframe-pane`](https://github.com/sanity-io/sanity-plugin-iframe-pane))
> 3. An optional **embeddable preview component** for custom field renders that need the iframe inside the form
>
> All three are driven by **one** `buildPreviewUrl(doc)` callback and a list of `documentTypes`. No `studioConfig` indirection, no env-var reading, no required i18n field convention — the plugin just hands you the document and asks where to point the iframe.

## Install

```bash
npm install sanity-plugin-preview-pane sanity-plugin-iframe-pane
# or
pnpm add sanity-plugin-preview-pane sanity-plugin-iframe-pane
```

> `sanity-plugin-iframe-pane` is a transitive dependency, but Sanity plugin resolution is happiest when both are present in the host's `package.json`.

## Quickstart

```ts
// sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { definePreviewPane } from "sanity-plugin-preview-pane";

const preview = definePreviewPane({
  buildPreviewUrl: (doc) => {
    const id = doc._id.replace(/^drafts\./, "");
    return `https://example.com/preview/${id}`;
  },
  documentTypes: ["page", "post"],
});

export default defineConfig({
  plugins: [
    preview.plugin,
    structureTool({ defaultDocumentNode: preview.defaultDocumentNode }),
  ],
  // ...
});
```

That's it. Every `page` and `post` document now has:

- An **Open Preview** entry in the document action menu (popup window)
- A **Preview** tab next to the form (inline iframe)

## API

### `definePreviewPane(config)`

Returns `{ plugin, defaultDocumentNode }` from a single config object. Pass `plugin` to `defineConfig({ plugins })` and `defaultDocumentNode` to `structureTool({ defaultDocumentNode })`.

### `PreviewPaneConfig`

| Field | Type | Default | Required | Description |
|---|---|---|---|---|
| `buildPreviewUrl` | `(doc) => string \| null` | — | Yes | Returns the preview URL for a document. Receives the published or draft document with the `_id` unchanged (still includes any `drafts.` prefix). Return `null` or `""` to disable preview for a specific document. |
| `documentTypes` | `string[]` | — | Yes | Document types that get the Preview tab and Open Preview action. Other types see no plugin behavior. |
| `iframeOptions.defaultSize` | `"desktop" \| "mobile"` | `"desktop"` | No | Forwarded to `sanity-plugin-iframe-pane`. |
| `iframeOptions.reload.button` | `boolean` | `true` | No | Show the reload button on the iframe pane. |
| `popupSize.width` | `number` | `1200` | No | Width of the popup window opened by the document action. |
| `popupSize.height` | `number` | `800` | No | Height of the popup window. |
| `popupName` | `string` | `"sanity-preview"` | No | `window.open` name. Reusing the same name causes subsequent clicks to reuse the same window. |
| `actionLabel` | `string` | `"Open Preview"` | No | Override the document action label. |
| `paneTitle` | `string` | `"Preview"` | No | Override the inline tab title. |

### `InlinePreview` and `createPreviewField`

For when you want the preview iframe rendered **inside the form** (in a custom field component) rather than as a separate tab:

```tsx
import { defineField } from "sanity";
import { createPreviewField } from "sanity-plugin-preview-pane";

const PreviewField = createPreviewField({
  buildPreviewUrl: (doc) => `https://example.com/preview/${doc.slug?.current}`,
});

defineField({
  name: "title",
  type: "string",
  components: { field: PreviewField },
});
```

Or use the raw `<InlinePreview document={...} buildPreviewUrl={...} />` component if you're rendering it from your own custom UI.

## Common `buildPreviewUrl` patterns

**Slug-based:**

```ts
buildPreviewUrl: (doc) => {
  const slug = (doc.slug as { current?: string } | undefined)?.current;
  return slug ? `${BASE_URL}/preview/${slug}` : null;
};
```

**Id-based (works without a slug):**

```ts
buildPreviewUrl: (doc) => {
  const id = doc._id.replace(/^drafts\./, "");
  return `${BASE_URL}/preview/${id}`;
};
```

**With locale (compatible with `@sanity/document-internationalization`):**

```ts
buildPreviewUrl: (doc) => {
  const id = doc._id.replace(/^drafts\./, "");
  const locale = (doc.__i18n_lang as string | undefined) ?? "en";
  return `${BASE_URL}/preview/${locale}/${id}`;
};
```

**Drafts vs published on different routes:**

```ts
buildPreviewUrl: (doc) => {
  const isDraft = doc._id.startsWith("drafts.");
  const id = doc._id.replace(/^drafts\./, "");
  return isDraft
    ? `${BASE_URL}/preview/${id}`
    : `${BASE_URL}/${doc.slug?.current}`;
};
```

## Why the three modes?

Different editor workflows benefit from different preview affordances:

- **Open Preview action** — best for quick "let me look at this in a real browser tab" checks. The popup window has its own browser chrome and lets you copy the URL out.
- **Preview tab** — best for tight iteration. Edit a field, hit reload on the iframe, see the change without leaving the document.
- **Inline preview field** — best for content with a strong "header / hero / featured-image" element where editors want to see the change in context as they type.

This plugin doesn't force you to pick — wire any combination.

## Environment variable convention

For production deploys where the preview base URL changes per environment, the conventional pattern is:

```ts
const baseUrl =
  process.env.SANITY_STUDIO_PREVIEW_URL ?? "http://localhost:3000";

definePreviewPane({
  buildPreviewUrl: (doc) => `${baseUrl}/preview/${doc.slug?.current}`,
  // ...
});
```

`SANITY_STUDIO_*` env vars are baked into the bundle at `sanity build` time, so changing the value after a deploy requires a rebuild + redeploy.

## Origin

This plugin was extracted from a private Sanity Studio implementation that combined three preview entry points (action button, iframe pane, inline field) under one shared config. The standalone version drops the project-specific defaults and exposes the URL builder as a callback so it works for any preview route shape.

## License

[MIT](LICENSE) © Adam Harris
