import type { DocumentActionComponent, DocumentActionProps } from "sanity";
import { EyeOpenIcon } from "@sanity/icons";

import type { PreviewPaneConfig } from "./types";

const DEFAULT_POPUP = { width: 1200, height: 800 };

/**
 * Creates a Sanity DocumentAction that opens the document's preview URL in a
 * popup window. The popup is given a stable name so subsequent clicks reuse
 * the same window instead of stacking.
 */
export function createPreviewAction(
  config: PreviewPaneConfig
): DocumentActionComponent {
  const popupSize = config.popupSize ?? DEFAULT_POPUP;
  const popupName = config.popupName ?? "sanity-preview";
  const label = config.actionLabel ?? "Open Preview";

  const action: DocumentActionComponent = (props: DocumentActionProps) => {
    const { published, draft } = props;
    const doc = (draft ?? published) as
      | { _id: string; _type: string; [key: string]: unknown }
      | null;

    return {
      label,
      icon: EyeOpenIcon,
      onHandle: () => {
        if (!doc?._id) return;
        const url = config.buildPreviewUrl(doc);
        if (!url) return;

        const { width, height } = popupSize;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);

        window.open(
          url,
          popupName,
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );
      },
      disabled: !draft && !published,
    };
  };

  return action;
}
