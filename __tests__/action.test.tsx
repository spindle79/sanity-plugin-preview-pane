// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createPreviewAction } from "../src/action";
import type { PreviewPaneConfig } from "../src/types";

// Minimal subset of DocumentActionProps the action actually consumes.
type Props = {
  published: { _id: string; _type: string } | null;
  draft: { _id: string; _type: string } | null;
};

function callAction(
  config: PreviewPaneConfig,
  props: Partial<Props> = {}
) {
  const Action = createPreviewAction(config);
  // The action component is a regular function — we can call it directly
  // outside React to inspect the descriptor it returns.
  return Action({
    published: null,
    draft: null,
    type: "post",
    onComplete: () => {},
    ...props,
  } as unknown as Parameters<typeof Action>[0]);
}

describe("createPreviewAction — descriptor shape", () => {
  const config: PreviewPaneConfig = {
    documentTypes: ["post"],
    buildPreviewUrl: (doc) => `https://preview.example.com/${doc._id}`,
  };

  it("returns the default label and an icon", () => {
    const desc = callAction(config, {
      published: { _id: "post-1", _type: "post" },
    });
    expect(desc?.label).toBe("Open Preview");
    expect(desc?.icon).toBeTruthy();
  });

  it("respects a custom actionLabel", () => {
    const desc = callAction(
      { ...config, actionLabel: "View on site" },
      { published: { _id: "post-1", _type: "post" } }
    );
    expect(desc?.label).toBe("View on site");
  });

  it("disabled is true when both draft and published are missing", () => {
    const desc = callAction(config, { draft: null, published: null });
    expect(desc?.disabled).toBe(true);
  });

  it("disabled is false when only draft is present", () => {
    const desc = callAction(config, {
      draft: { _id: "drafts.post-1", _type: "post" },
      published: null,
    });
    expect(desc?.disabled).toBe(false);
  });

  it("disabled is false when only published is present", () => {
    const desc = callAction(config, {
      draft: null,
      published: { _id: "post-1", _type: "post" },
    });
    expect(desc?.disabled).toBe(false);
  });
});

describe("createPreviewAction — onHandle", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom's window.open is a stub that returns null and doesn't log;
    // spy on it so we can assert what URL/params we passed.
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    // jsdom's window.screen ships sane defaults (width 0/height 0 in older
    // versions, full values in newer); pin to known values for centering.
    Object.defineProperty(window.screen, "width", {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window.screen, "height", {
      configurable: true,
      value: 1080,
    });
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("opens the URL returned by buildPreviewUrl in a popup", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: (doc) =>
          `https://preview.example.com/${doc._id.replace(/^drafts\./, "")}`,
      },
      { draft: { _id: "drafts.post-1", _type: "post" } }
    );

    desc?.onHandle?.();
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toBe("https://preview.example.com/post-1");
  });

  it("uses the default popup name 'sanity-preview' when not overridden", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "https://preview.example.com/x",
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    expect(openSpy.mock.calls[0][1]).toBe("sanity-preview");
  });

  it("respects a custom popupName", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "https://preview.example.com/x",
        popupName: "my-window",
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    expect(openSpy.mock.calls[0][1]).toBe("my-window");
  });

  it("uses default popup size 1200x800 and centres on screen", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "https://preview.example.com/x",
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    const features = String(openSpy.mock.calls[0][2]);
    expect(features).toContain("width=1200");
    expect(features).toContain("height=800");
    // (1920-1200)/2 = 360, (1080-800)/2 = 140
    expect(features).toContain("left=360");
    expect(features).toContain("top=140");
  });

  it("respects custom popupSize", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "https://preview.example.com/x",
        popupSize: { width: 800, height: 600 },
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    const features = String(openSpy.mock.calls[0][2]);
    expect(features).toContain("width=800");
    expect(features).toContain("height=600");
  });

  it("clamps left/top to 0 when popup is larger than the screen", () => {
    Object.defineProperty(window.screen, "width", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window.screen, "height", {
      configurable: true,
      value: 500,
    });
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "https://preview.example.com/x",
        popupSize: { width: 1200, height: 800 },
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    const features = String(openSpy.mock.calls[0][2]);
    expect(features).toContain("left=0");
    expect(features).toContain("top=0");
  });

  it("does NOT open the window when buildPreviewUrl returns null", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => null,
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("does NOT open the window when buildPreviewUrl returns an empty string", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "",
      },
      { published: { _id: "post-1", _type: "post" } }
    );
    desc?.onHandle?.();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("does NOT open the window when both draft and published are null", () => {
    const desc = callAction(
      {
        documentTypes: ["post"],
        buildPreviewUrl: () => "https://preview.example.com/x",
      },
      { draft: null, published: null }
    );
    desc?.onHandle?.();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("prefers draft over published when both are present", () => {
    const buildPreviewUrl = vi.fn(() => "https://preview.example.com/x");
    const desc = callAction(
      { documentTypes: ["post"], buildPreviewUrl },
      {
        draft: { _id: "drafts.post-1", _type: "post" },
        published: { _id: "post-1", _type: "post" },
      }
    );
    desc?.onHandle?.();
    expect(buildPreviewUrl.mock.calls[0][0]._id).toBe("drafts.post-1");
  });
});
