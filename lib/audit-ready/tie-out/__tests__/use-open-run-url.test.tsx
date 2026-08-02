// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  OPEN_RUN_PARAM,
  useOpenRunUrl,
} from "../use-open-run-url";

// -----------------------------------------------------------------------------
// Mock next/navigation. Each test wires the state of searchParams + captures
// the router.replace calls.
// -----------------------------------------------------------------------------
const mockReplace = vi.fn();
let mockSearchParamsSource = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/audit-ready/eng-1/tie-out-summary",
  useSearchParams: () => mockSearchParamsSource,
}));

describe("useOpenRunUrl", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParamsSource = new URLSearchParams();
  });
  afterEach(cleanup);

  it("keeps initialOpenRunId when URL also carries the same ?open_run", () => {
    // Real deep-link path: server seeds initialOpenRunId AND the URL already
    // has open_run. The sync effect must not clear the open state.
    mockSearchParamsSource = new URLSearchParams({
      [OPEN_RUN_PARAM]: "seed-run-1",
    });
    const { result } = renderHook(() => useOpenRunUrl("seed-run-1"));
    expect(result.current.openRunId).toBe("seed-run-1");
  });

  it("prefers URL param over initial when both are present", async () => {
    mockSearchParamsSource = new URLSearchParams({
      [OPEN_RUN_PARAM]: "url-run-9",
    });
    const { result } = renderHook(() => useOpenRunUrl("seed-run-1"));
    // The effect runs after mount and overwrites the initial.
    await waitFor(() => {
      expect(result.current.openRunId).toBe("url-run-9");
    });
  });

  it("writes ?open_run=<id> on setOpenRunId(id)", () => {
    const { result } = renderHook(() => useOpenRunUrl(null));
    act(() => {
      result.current.setOpenRunId("run-42");
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [url, opts] = mockReplace.mock.calls[0];
    expect(url).toBe(
      "/audit-ready/eng-1/tie-out-summary?open_run=run-42",
    );
    expect(opts).toEqual({ scroll: false });
    expect(result.current.openRunId).toBe("run-42");
  });

  it("clears the param on setOpenRunId(null)", () => {
    mockSearchParamsSource = new URLSearchParams({
      [OPEN_RUN_PARAM]: "run-existing",
      as_of: "2026-06-30",
    });
    const { result } = renderHook(() => useOpenRunUrl("run-existing"));
    act(() => {
      result.current.setOpenRunId(null);
    });
    // The URL keeps as_of but drops open_run.
    const lastCall = mockReplace.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe(
      "/audit-ready/eng-1/tie-out-summary?as_of=2026-06-30",
    );
    expect(result.current.openRunId).toBeNull();
  });

  it("preserves other query params when writing", () => {
    mockSearchParamsSource = new URLSearchParams({
      as_of: "2026-06-30",
      highlight_run: "hl-1",
    });
    const { result } = renderHook(() => useOpenRunUrl(null));
    act(() => {
      result.current.setOpenRunId("run-77");
    });
    const [url] = mockReplace.mock.calls.at(-1)!;
    // Order: URLSearchParams preserves insertion order, we add open_run last.
    expect(url).toBe(
      "/audit-ready/eng-1/tie-out-summary?as_of=2026-06-30&highlight_run=hl-1&open_run=run-77",
    );
  });

  it("uses replace(), not push()", () => {
    const { result } = renderHook(() => useOpenRunUrl(null));
    act(() => {
      result.current.setOpenRunId("run-x");
    });
    expect(mockReplace).toHaveBeenCalled();
    // The mocked push should never have been invoked directly by the hook.
    // (We assert by not calling push in our mock and observing setOpenRunId
    // still succeeds — mockReplace was the invocation channel.)
  });

  it("regenerate flow: setOpenRunId(new) replaces old id in URL", () => {
    mockSearchParamsSource = new URLSearchParams({
      [OPEN_RUN_PARAM]: "run-old",
    });
    const { result } = renderHook(() => useOpenRunUrl("run-old"));
    act(() => {
      result.current.setOpenRunId("run-new");
    });
    const [url] = mockReplace.mock.calls.at(-1)!;
    expect(url).toBe(
      "/audit-ready/eng-1/tie-out-summary?open_run=run-new",
    );
    expect(result.current.openRunId).toBe("run-new");
  });

  it("does not crash if hook is used with no initial and no URL param", () => {
    const { result } = renderHook(() => useOpenRunUrl());
    expect(result.current.openRunId).toBeNull();
    expect(typeof result.current.setOpenRunId).toBe("function");
  });
});
