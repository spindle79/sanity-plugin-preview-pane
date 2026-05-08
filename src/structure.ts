import type { DefaultDocumentNodeResolver } from "sanity/structure";
import { Iframe } from "sanity-plugin-iframe-pane";

import type { PreviewPaneConfig, SanityDocumentLike } from "./types";

/**
 * Builds a `defaultDocumentNode` resolver that adds an inline iframe Preview
 * tab next to the document form for matching types.
 *
 * Pass the result to `structureTool({ defaultDocumentNode })`.
 *
 * Documents whose `_type` is not in `config.documentTypes` get the standard
 * single-form view, so this is safe to use as the global default resolver.
 */
export function createDefaultDocumentNode(
  config: PreviewPaneConfig
): DefaultDocumentNodeResolver {
  const paneTitle = config.paneTitle ?? "Preview";
  const iframeOptions = config.iframeOptions ?? {};
  const defaultSize = iframeOptions.defaultSize ?? "desktop";
  const reload = iframeOptions.reload ?? { button: true };

  return (S, ctx) => {
    if (!config.documentTypes.includes(ctx.schemaType)) {
      return S.document().views([S.view.form()]);
    }

    return S.document().views([
      S.view.form(),
      S.view
        .component(Iframe)
        .options({
          url: (doc: SanityDocumentLike) => config.buildPreviewUrl(doc) ?? "",
          reload,
          defaultSize,
        })
        .title(paneTitle),
    ]);
  };
}
