import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ZoomableImageViewer } from "./ZoomableImageViewer";
import { useZoomableImage } from "./useZoomableImage";

let listeners: Array<(e: KeyboardEvent) => void> = [];

async function dispatchKeyEvent(eventInit: Partial<KeyboardEvent> & { key: string }) {
  let defaultPrevented = false;
  let propagationStopped = false;
  const event = {
    bubbles: true,
    cancelable: true,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: null,
    get defaultPrevented() {
      return defaultPrevented;
    },
    ...eventInit,
    preventDefault: () => {
      defaultPrevented = true;
    },
    stopPropagation: () => {
      propagationStopped = true;
    },
  } as unknown as KeyboardEvent;

  await act(async () => {
    for (const listener of [...listeners]) {
      listener(event);
    }
  });

  return { defaultPrevented, propagationStopped };
}

let activeRenderers: ReactTestRenderer[] = [];

beforeEach(() => {
  listeners = [];
  activeRenderers = [];
  vi.stubGlobal("window", {
    addEventListener: vi.fn((type: string, listener: (e: KeyboardEvent) => void) => {
      if (type === "keydown") listeners.push(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: (e: KeyboardEvent) => void) => {
      if (type === "keydown") {
        listeners = listeners.filter((l) => l !== listener);
      }
    }),
  });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(async () => {
  for (const renderer of activeRenderers) {
    await act(() => renderer.unmount());
  }
  listeners = [];
  activeRenderers = [];
  vi.unstubAllGlobals();
});

function ProbeViewer({
  src,
  layout,
  onState,
}: {
  src: string;
  layout?: "dialog" | "panel" | undefined;
  onState?: (state: ReturnType<typeof useZoomableImage>) => void;
}) {
  const state = useZoomableImage(src, { layout });
  onState?.(state);
  return null;
}

describe("useZoomableImage keyboard shortcuts & scoping", () => {
  it("ignores zoom shortcuts when Ctrl or Meta keys are pressed", async () => {
    let viewerState!: ReturnType<typeof useZoomableImage>;
    let renderer: ReactTestRenderer | undefined;

    await act(() => {
      renderer = create(
        <ProbeViewer src="https://example.com/test.png" onState={(s) => (viewerState = s)} />,
      );
      activeRenderers.push(renderer);
    });

    const initialScale = viewerState.scale;

    // Dispatch Ctrl+=
    const ctrlResult = await dispatchKeyEvent({ key: "+", ctrlKey: true });
    expect(ctrlResult.defaultPrevented).toBe(false);
    expect(viewerState.scale).toBe(initialScale);

    // Dispatch Meta+=
    const metaResult = await dispatchKeyEvent({ key: "+", metaKey: true });
    expect(metaResult.defaultPrevented).toBe(false);
    expect(viewerState.scale).toBe(initialScale);

    // Dispatch regular +
    const regularResult = await dispatchKeyEvent({ key: "+" });
    expect(regularResult.defaultPrevented).toBe(true);
    expect(viewerState.scale).toBeGreaterThan(initialScale);
  });

  it("prioritizes dialog shortcuts over obscured panel when both are mounted", async () => {
    let panelState!: ReturnType<typeof useZoomableImage>;
    let dialogState!: ReturnType<typeof useZoomableImage>;
    let renderer: ReactTestRenderer | undefined;

    function MultiViewer() {
      return (
        <>
          <ProbeViewer
            src="https://example.com/panel.png"
            layout="panel"
            onState={(s) => (panelState = s)}
          />
          <ProbeViewer
            src="https://example.com/dialog.png"
            layout="dialog"
            onState={(s) => (dialogState = s)}
          />
        </>
      );
    }

    await act(() => {
      renderer = create(<MultiViewer />);
      activeRenderers.push(renderer);
    });

    const initialPanelScale = panelState.scale;
    const initialDialogScale = dialogState.scale;

    // Press '+' to zoom
    const zoomResult = await dispatchKeyEvent({ key: "+" });
    expect(zoomResult.defaultPrevented).toBe(true);

    // Dialog should receive zoom, panel should remain untouched
    expect(dialogState.scale).toBeGreaterThan(initialDialogScale);
    expect(panelState.scale).toBe(initialPanelScale);

    // Press 'r' to rotate
    await dispatchKeyEvent({ key: "r" });
    expect(dialogState.rotation).toBe(90);
    expect(panelState.rotation).toBe(0);
  });
});

describe("ZoomableImageViewer ref and DOM props forwarding", () => {
  it("forwards ref and spreads DOM props to outer div", async () => {
    const onContextMenu = vi.fn();
    let renderer: ReactTestRenderer | undefined;

    await act(() => {
      renderer = create(
        <ZoomableImageViewer
          src="https://example.com/img.png"
          alt="Test Image"
          layout="panel"
          tabIndex={0}
          data-testid="zoomable-image-viewer"
          onContextMenu={onContextMenu}
        />,
      );
      activeRenderers.push(renderer);
    });

    const divs = renderer!.root.findAllByType("div");
    const outerDiv = divs[0];
    expect(outerDiv).toBeDefined();
    if (!outerDiv) return;
    expect(outerDiv.props.tabIndex).toBe(0);
    expect(outerDiv.props["data-testid"]).toBe("zoomable-image-viewer");
    expect(outerDiv.props.onContextMenu).toBe(onContextMenu);
    expect(outerDiv.props.className).toContain("overflow-hidden");
  });
});
