import { describe, it, expect, vi } from "vitest";

// Stub the iframe pane import — index.ts pulls in structure.ts which pulls
// in sanity-plugin-iframe-pane, which we don't need at runtime.
vi.mock("sanity-plugin-iframe-pane", () => ({
  Iframe: function StubIframe() {
    return null;
  },
}));

import { definePreviewPane } from "../src/index";
import type { PreviewPaneConfig } from "../src/types";

const baseConfig: PreviewPaneConfig = {
  documentTypes: ["post"],
  buildPreviewUrl: (doc) => `https://example.com/${doc._id}`,
};

describe("definePreviewPane — config validation", () => {
  it("throws when documentTypes is missing", () => {
    expect(() =>
      definePreviewPane({
        // @ts-expect-error — explicitly testing missing field
        buildPreviewUrl: () => "x",
      })
    ).toThrow(/documentTypes.*non-empty/i);
  });

  it("throws when documentTypes is an empty array", () => {
    expect(() =>
      definePreviewPane({
        documentTypes: [],
        buildPreviewUrl: () => "x",
      })
    ).toThrow(/documentTypes.*non-empty/i);
  });

  it("throws when buildPreviewUrl is missing", () => {
    expect(() =>
      definePreviewPane({
        documentTypes: ["post"],
        // @ts-expect-error — explicitly testing missing function
        buildPreviewUrl: undefined,
      })
    ).toThrow(/buildPreviewUrl.*function/i);
  });

  it("throws when buildPreviewUrl is not a function", () => {
    expect(() =>
      definePreviewPane({
        documentTypes: ["post"],
        // @ts-expect-error — explicitly testing wrong type
        buildPreviewUrl: "https://example.com",
      })
    ).toThrow(/buildPreviewUrl.*function/i);
  });

  it("does not throw with a valid config", () => {
    expect(() => definePreviewPane(baseConfig)).not.toThrow();
  });
});

/**
 * `definePlugin({...})` from Sanity returns a `Plugin` — a callable that, when
 * invoked, returns the underlying `PluginOptions`. Resolve through that wrapper
 * so the tests can read `.name` / `.document.actions` regardless.
 */
function resolvePluginConfig(plugin: unknown): {
  name?: string;
  document?: {
    actions?: (prev: unknown[], ctx: { schemaType: string }) => unknown[];
  };
} {
  if (typeof plugin === "function") {
    // Plugin<void> — call with undefined.
    return (plugin as (opts?: unknown) => unknown)(
      undefined
    ) as ReturnType<typeof resolvePluginConfig>;
  }
  return plugin as ReturnType<typeof resolvePluginConfig>;
}

describe("definePreviewPane — return shape", () => {
  it("returns both plugin and defaultDocumentNode", () => {
    const result = definePreviewPane(baseConfig);
    expect(result.plugin).toBeTruthy();
    expect(typeof result.defaultDocumentNode).toBe("function");
  });

  it("the plugin is registered under the expected name", () => {
    const { plugin } = definePreviewPane(baseConfig);
    expect(resolvePluginConfig(plugin).name).toBe("sanity-plugin-preview-pane");
  });
});

describe("definePreviewPane — document.actions transformer", () => {
  function getActionsFn(plugin: unknown) {
    const config = resolvePluginConfig(plugin);
    const fn = config.document?.actions;
    if (typeof fn !== "function") {
      throw new Error(
        `Expected plugin config to expose document.actions as a function; got ${typeof fn}`
      );
    }
    return fn;
  }

  it("appends a single action for matching schema types", () => {
    const { plugin } = definePreviewPane(baseConfig);
    const actions = getActionsFn(plugin);
    const prev = [{ name: "publish" }, { name: "delete" }];
    const next = actions(prev, { schemaType: "post" });
    expect(next).toHaveLength(prev.length + 1);
    expect(next.slice(0, prev.length)).toEqual(prev);
  });

  it("returns prev unchanged for non-matching schema types", () => {
    const { plugin } = definePreviewPane(baseConfig);
    const actions = getActionsFn(plugin);
    const prev = [{ name: "publish" }, { name: "delete" }];
    const next = actions(prev, { schemaType: "siteSettings" });
    expect(next).toBe(prev);
  });

  it("matches against the configured documentTypes set", () => {
    const { plugin } = definePreviewPane({
      ...baseConfig,
      documentTypes: ["post", "page", "author"],
    });
    const actions = getActionsFn(plugin);

    expect(actions([], { schemaType: "post" })).toHaveLength(1);
    expect(actions([], { schemaType: "page" })).toHaveLength(1);
    expect(actions([], { schemaType: "author" })).toHaveLength(1);
    expect(actions([], { schemaType: "siteSettings" })).toHaveLength(0);
  });

  it("the appended action is callable and produces a descriptor", () => {
    const { plugin } = definePreviewPane(baseConfig);
    const actions = getActionsFn(plugin);
    const next = actions([], { schemaType: "post" });
    const Action = next[0] as (props: unknown) => unknown;
    expect(typeof Action).toBe("function");

    const descriptor = Action({
      published: { _id: "post-1", _type: "post" },
      draft: null,
      type: "post",
      onComplete: () => {},
    }) as { label: string; disabled: boolean };

    expect(descriptor.label).toBe("Open Preview");
    expect(descriptor.disabled).toBe(false);
  });
});
