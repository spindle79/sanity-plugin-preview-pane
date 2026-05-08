import { useState } from "react";
import { Card, Stack, Button, Text } from "@sanity/ui";
import { EyeOpenIcon, CloseIcon } from "@sanity/icons";

import type { PreviewPaneConfig, SanityDocumentLike } from "./types";

/**
 * Standalone inline preview component. Renders an iframe at the configured
 * preview URL with a "Live Preview" badge in the top-right corner.
 *
 * Useful inside custom field components when you want a preview embedded in
 * the form panel rather than as a separate Preview tab.
 */
export interface InlinePreviewProps {
  document: SanityDocumentLike;
  buildPreviewUrl: PreviewPaneConfig["buildPreviewUrl"];
  height?: number;
  badgeText?: string;
}

export function InlinePreview({
  document,
  buildPreviewUrl,
  height = 600,
  badgeText = "Live Preview",
}: InlinePreviewProps) {
  const url = buildPreviewUrl(document);
  if (!url) return null;

  return (
    <Card
      tone="default"
      padding={0}
      radius={2}
      shadow={1}
      style={{
        height: `${height}px`,
        width: "100%",
        marginTop: 20,
        marginBottom: 20,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <iframe
        src={url}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        title={badgeText}
      />
      <Card
        padding={2}
        radius={1}
        shadow={1}
        tone="primary"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          backgroundColor: "rgba(0,0,0,0.8)",
        }}
      >
        <Text size={1} style={{ color: "white" }}>
          {badgeText}
        </Text>
      </Card>
    </Card>
  );
}

/**
 * Higher-order builder for a Sanity custom field component that wraps the
 * default field render with a "Show Preview" toggle and an iframe below it.
 *
 * Usage in a schema:
 *
 *   defineField({
 *     name: 'title',
 *     type: 'string',
 *     components: {
 *       field: createPreviewField({ buildPreviewUrl: (doc) => `...` }),
 *     },
 *   })
 */
export function createPreviewField(
  config: Pick<PreviewPaneConfig, "buildPreviewUrl">
) {
  return function PreviewField(props: {
    document?: SanityDocumentLike;
    renderDefault: (props: unknown) => React.ReactNode;
  }) {
    const [showPreview, setShowPreview] = useState(false);
    const document = props.document;

    return (
      <Stack space={3}>
        {props.renderDefault(props)}

        {document && (
          <>
            <Button
              icon={showPreview ? CloseIcon : EyeOpenIcon}
              mode="ghost"
              text={showPreview ? "Hide Preview" : "Show Preview"}
              onClick={() => setShowPreview(!showPreview)}
            />

            {showPreview && (
              <InlinePreview
                document={document}
                buildPreviewUrl={config.buildPreviewUrl}
              />
            )}
          </>
        )}
      </Stack>
    );
  };
}
