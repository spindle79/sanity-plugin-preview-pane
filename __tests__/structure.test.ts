import { describe, it, expect, vi } from "vitest";

// Stub the iframe pane import — we don't want its runtime code, we just want
// a sentinel value the resolver can hand to S.view.component().
vi.mock("sanity-plugin-iframe-pane", () => ({
  Iframe: function StubIframe() {
    return null;
  },
}));

import { createDefaultDocumentNode } from "../src/structure";
import type { PreviewPaneConfig } from "../src/types";

/**
 * Minimal recording stub of Sanity's structure builder. Each builder method
 * returns a chainable proxy that records the calls so tests can inspect what
 * the resolver constructed.
 */
function makeStructureBuilder() {
  type Recorder = {
    calls: Array<{ method: string; args: unknown[] }>;
    children: Recorder[];
  };

  function recorder(): Recorder & Record<string, unknown> {
    const rec: Recorder = { calls: [], children: [] };
    const proxy: Record<string, unknown> = {
      _rec: rec,
    };
    // Each chained method records the call and returns a new recorder.
    ["views", "options", "title", "id"].forEach((method) => {
      proxy[method] = (...args: unknown[]) => {
        const child = recorder();
        rec.calls.push({ method, args });
        rec.children.push(child._rec as Recorder);
        return child;
      };
    });
    return proxy as Recorder & Record<string, unknown>;
  }

  const view = {
    form: vi.fn(() => ({ kind: "form" })),
    component: vi.fn((_component: unknown) => recorder()),
  };

  const document = vi.fn(() => recorder());

  return {
    document,
    view,
  };
}

describe("createDefaultDocumentNode — non-matching schema types", () => {
  it("renders only the form view for types not in documentTypes", () => {
    const config: PreviewPaneConfig = {
      documentTypes: ["post"],
      buildPreviewUrl: () => "https://example.com",
    };
    const resolve = createDefaultDocumentNode(config);
    const S = makeStructureBuilder();

    resolve(
      S as unknown as Parameters<typeof resolve>[0],
      { schemaType: "siteSettings" } as Parameters<typeof resolve>[1]
    );

    expect(S.document).toHaveBeenCalledTimes(1);
    expect(S.view.form).toHaveBeenCalledTimes(1);
    // No iframe component when the type doesn't match.
    expect(S.view.component).not.toHaveBeenCalled();
  });
});

describe("createDefaultDocumentNode — matching schema types", () => {
  it("renders form + iframe component view", () => {
    const config: PreviewPaneConfig = {
      documentTypes: ["post", "page"],
      buildPreviewUrl: (doc) => `https://example.com/${doc._id}`,
    };
    const resolve = createDefaultDocumentNode(config);
    const S = makeStructureBuilder();

    resolve(
      S as unknown as Parameters<typeof resolve>[0],
      { schemaType: "post" } as Parameters<typeof resolve>[1]
    );

    expect(S.view.form).toHaveBeenCalledTimes(1);
    expect(S.view.component).toHaveBeenCalledTimes(1);
  });

  it("forwards default iframeOptions (defaultSize=desktop, reload button)", () => {
    const config: PreviewPaneConfig = {
      documentTypes: ["post"],
      buildPreviewUrl: () => "https://example.com",
    };
    const resolve = createDefaultDocumentNode(config);
    const S = makeStructureBuilder();

    const result = resolve(
      S as unknown as Parameters<typeof resolve>[0],
      { schemaType: "post" } as Parameters<typeof resolve>[1]
    );

    void result;
    // The iframe view chain is: component(Iframe).options({...}).title('Preview')
    const componentRec = (S.view.component as ReturnType<typeof vi.fn>).mock
      .results[0].value as { _rec: { calls: Array<{ method: string; args: unknown[] }> } };
    const optionsCall = componentRec._rec.calls.find((c) => c.method === "options");
    const opts = optionsCall?.args[0] as {
      reload: { button: boolean };
      defaultSize: string;
      url: (doc: { _id: string }) => string;
    };
    expect(opts.defaultSize).toBe("desktop");
    expect(opts.reload).toEqual({ button: true });
  });

  it("respects iframeOptions overrides", () => {
    const config: PreviewPaneConfig = {
      documentTypes: ["post"],
      buildPreviewUrl: () => "https://example.com",
      iframeOptions: {
        defaultSize: "mobile",
        reload: { button: false },
      },
    };
    const resolve = createDefaultDocumentNode(config);
    const S = makeStructureBuilder();
    resolve(
      S as unknown as Parameters<typeof resolve>[0],
      { schemaType: "post" } as Parameters<typeof resolve>[1]
    );

    const componentRec = (S.view.component as ReturnType<typeof vi.fn>).mock
      .results[0].value as { _rec: { calls: Array<{ method: string; args: unknown[] }> } };
    const optsCall = componentRec._rec.calls.find((c) => c.method === "options");
    const opts = optsCall?.args[0] as {
      reload: { button: boolean };
      defaultSize: string;
    };
    expect(opts.defaultSize).toBe("mobile");
    expect(opts.reload).toEqual({ button: false });
  });

  it("uses default paneTitle 'Preview' and respects custom paneTitle", () => {
    const defaultResolve = createDefaultDocumentNode({
      documentTypes: ["post"],
      buildPreviewUrl: () => "https://example.com",
    });
    const customResolve = createDefaultDocumentNode({
      documentTypes: ["post"],
      buildPreviewUrl: () => "https://example.com",
      paneTitle: "Live",
    });

    for (const [resolve, expected] of [
      [defaultResolve, "Preview"],
      [customResolve, "Live"],
    ] as const) {
      const S = makeStructureBuilder();
      resolve(
        S as unknown as Parameters<typeof resolve>[0],
        { schemaType: "post" } as Parameters<typeof resolve>[1]
      );
      const componentRec = (S.view.component as ReturnType<typeof vi.fn>).mock
        .results[0].value as { _rec: { calls: Array<{ method: string; args: unknown[] }>; children: Array<{ calls: Array<{ method: string; args: unknown[] }> }> } };
      // .options() returns a new chain; .title() is called on that child.
      const optionsIdx = componentRec._rec.calls.findIndex(
        (c) => c.method === "options"
      );
      const titleCall = componentRec._rec.children[optionsIdx].calls.find(
        (c) => c.method === "title"
      );
      expect(titleCall?.args[0]).toBe(expected);
    }
  });

  it("the iframe url callback delegates to buildPreviewUrl", () => {
    const buildPreviewUrl = vi.fn((doc: { _id: string }) =>
      `https://example.com/${doc._id}`
    );
    const config: PreviewPaneConfig = {
      documentTypes: ["post"],
      buildPreviewUrl,
    };
    const resolve = createDefaultDocumentNode(config);
    const S = makeStructureBuilder();
    resolve(
      S as unknown as Parameters<typeof resolve>[0],
      { schemaType: "post" } as Parameters<typeof resolve>[1]
    );
    const componentRec = (S.view.component as ReturnType<typeof vi.fn>).mock
      .results[0].value as { _rec: { calls: Array<{ method: string; args: unknown[] }> } };
    const opts = componentRec._rec.calls.find((c) => c.method === "options")!
      .args[0] as { url: (doc: { _id: string; _type: string }) => string };

    expect(opts.url({ _id: "abc", _type: "post" })).toBe(
      "https://example.com/abc"
    );
    expect(buildPreviewUrl).toHaveBeenCalledTimes(1);
  });

  it("the iframe url callback returns an empty string when buildPreviewUrl returns null", () => {
    const config: PreviewPaneConfig = {
      documentTypes: ["post"],
      buildPreviewUrl: () => null,
    };
    const resolve = createDefaultDocumentNode(config);
    const S = makeStructureBuilder();
    resolve(
      S as unknown as Parameters<typeof resolve>[0],
      { schemaType: "post" } as Parameters<typeof resolve>[1]
    );
    const componentRec = (S.view.component as ReturnType<typeof vi.fn>).mock
      .results[0].value as { _rec: { calls: Array<{ method: string; args: unknown[] }> } };
    const opts = componentRec._rec.calls.find((c) => c.method === "options")!
      .args[0] as { url: (doc: { _id: string; _type: string }) => string };

    expect(opts.url({ _id: "abc", _type: "post" })).toBe("");
  });
});
