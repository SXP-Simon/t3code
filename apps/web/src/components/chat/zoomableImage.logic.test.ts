import { describe, expect, it } from "vite-plus/test";
import {
  calculateZoomAnchorPosition,
  clampZoomScale,
  DEFAULT_ZOOM_SCALE,
  DOUBLE_CLICK_ZOOM_SCALE,
  getNextRotation,
  getNextZoomInScale,
  getNextZoomOutScale,
  isEditableElement,
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  selectActiveViewer,
  ZOOM_STEP_FACTOR,
} from "./zoomableImage.logic";

describe("zoomableImage.logic", () => {
  describe("clampZoomScale", () => {
    it("preserves zoom levels within bounds", () => {
      expect(clampZoomScale(1.0)).toBe(1.0);
      expect(clampZoomScale(2.5)).toBe(2.5);
      expect(clampZoomScale(0.5)).toBe(0.5);
    });

    it("clamps values below MIN_ZOOM_SCALE", () => {
      expect(clampZoomScale(0.1)).toBe(MIN_ZOOM_SCALE);
      expect(clampZoomScale(-1)).toBe(MIN_ZOOM_SCALE);
    });

    it("clamps values above MAX_ZOOM_SCALE", () => {
      expect(clampZoomScale(6.0)).toBe(MAX_ZOOM_SCALE);
      expect(clampZoomScale(100)).toBe(MAX_ZOOM_SCALE);
    });
  });

  describe("calculateZoomAnchorPosition", () => {
    it("keeps focal point fixed when zooming centered at (0, 0)", () => {
      const currentScale = 1.0;
      const newScale = 2.0;
      const currentPos = { x: 0, y: 0 };
      const focalPoint = { x: 0, y: 0 };

      const nextPos = calculateZoomAnchorPosition(currentScale, newScale, currentPos, focalPoint);

      expect(nextPos).toEqual({ x: 0, y: 0 });
    });

    it("shifts offset correctly when zooming into an off-center focal point", () => {
      const currentScale = 1.0;
      const newScale = 2.0;
      const currentPos = { x: 0, y: 0 };
      const focalPoint = { x: 100, y: 50 };

      const nextPos = calculateZoomAnchorPosition(currentScale, newScale, currentPos, focalPoint);

      // focalPoint.x - (focalPoint.x - currentPos.x) * (newScale / currentScale)
      // 100 - (100 - 0) * (2 / 1) = 100 - 200 = -100
      expect(nextPos.x).toBe(-100);
      // 50 - (50 - 0) * 2 = -50
      expect(nextPos.y).toBe(-50);
    });

    it("returns (0, 0) when current scale is non-positive", () => {
      expect(calculateZoomAnchorPosition(0, 2.0, { x: 10, y: 10 }, { x: 20, y: 20 })).toEqual({
        x: 0,
        y: 0,
      });
    });
  });

  describe("getNextZoomInScale & getNextZoomOutScale", () => {
    it("scales up by ZOOM_STEP_FACTOR up to MAX_ZOOM_SCALE", () => {
      expect(getNextZoomInScale(1.0)).toBe(1.25);
      expect(getNextZoomInScale(4.5)).toBe(MAX_ZOOM_SCALE);
    });

    it("scales down by ZOOM_STEP_FACTOR down to MIN_ZOOM_SCALE", () => {
      expect(getNextZoomOutScale(1.25)).toBe(1.0);
      expect(getNextZoomOutScale(0.22)).toBe(MIN_ZOOM_SCALE);
    });
  });

  describe("getNextRotation", () => {
    it("cycles in 90 degree increments modulo 360", () => {
      expect(getNextRotation(0)).toBe(90);
      expect(getNextRotation(90)).toBe(180);
      expect(getNextRotation(180)).toBe(270);
      expect(getNextRotation(270)).toBe(0);
    });
  });

  describe("isEditableElement", () => {
    it("handles null/undefined gracefully", () => {
      expect(isEditableElement(null)).toBe(false);
    });

    it("identifies elements with isContentEditable as editable", () => {
      class MockHTMLElement {}
      (globalThis as unknown as { HTMLElement: typeof MockHTMLElement }).HTMLElement =
        MockHTMLElement;

      const editableEl = Object.assign(new MockHTMLElement(), { isContentEditable: true });
      expect(isEditableElement(editableEl as unknown as EventTarget)).toBe(true);

      const nonEditableEl = Object.assign(new MockHTMLElement(), { isContentEditable: false });
      expect(isEditableElement(nonEditableEl as unknown as EventTarget)).toBe(false);
    });

    it("identifies input, textarea, and select elements as editable", () => {
      class MockHTMLInputElement {}
      class MockHTMLTextAreaElement {}
      class MockHTMLSelectElement {}

      (
        globalThis as unknown as { HTMLInputElement: typeof MockHTMLInputElement }
      ).HTMLInputElement = MockHTMLInputElement;
      (
        globalThis as unknown as { HTMLTextAreaElement: typeof MockHTMLTextAreaElement }
      ).HTMLTextAreaElement = MockHTMLTextAreaElement;
      (
        globalThis as unknown as { HTMLSelectElement: typeof MockHTMLSelectElement }
      ).HTMLSelectElement = MockHTMLSelectElement;

      expect(isEditableElement(new MockHTMLInputElement() as unknown as EventTarget)).toBe(true);
      expect(isEditableElement(new MockHTMLTextAreaElement() as unknown as EventTarget)).toBe(true);
      expect(isEditableElement(new MockHTMLSelectElement() as unknown as EventTarget)).toBe(true);
    });
  });

  describe("selectActiveViewer", () => {
    it("returns undefined when no viewers are registered", () => {
      expect(selectActiveViewer([])).toBeUndefined();
    });

    it("returns the single mounted viewer", () => {
      const viewer = { layout: "panel" as const };
      expect(selectActiveViewer([viewer])).toBe(viewer);
    });

    it("prioritizes dialog viewers over panel viewers", () => {
      const panel = { id: 1, layout: "panel" as const };
      const dialog = { id: 2, layout: "dialog" as const };

      // Even if panel is registered before or after, dialog wins
      expect(selectActiveViewer([panel, dialog])).toBe(dialog);
      expect(selectActiveViewer([dialog, panel])).toBe(dialog);
    });

    it("returns the topmost (most recent) dialog if multiple exist", () => {
      const dialog1 = { id: 1, layout: "dialog" as const };
      const dialog2 = { id: 2, layout: "dialog" as const };

      expect(selectActiveViewer([dialog1, dialog2])).toBe(dialog2);
    });

    it("prioritizes a focused panel viewer when only panels exist", () => {
      const focusedTarget = { id: "button" } as unknown as Node;
      const container1 = {
        contains: (target: Node | null) => target === focusedTarget,
      };
      const container2 = {
        contains: () => false,
      };

      const panel1 = { id: 1, layout: "panel" as const, container: container1 };
      const panel2 = { id: 2, layout: "panel" as const, container: container2 };

      expect(selectActiveViewer([panel1, panel2], focusedTarget)).toBe(panel1);
    });

    it("falls back to the most recently registered viewer", () => {
      const panel1 = { id: 1, layout: "panel" as const };
      const panel2 = { id: 2, layout: "panel" as const };

      expect(selectActiveViewer([panel1, panel2], null)).toBe(panel2);
    });
  });

  describe("constants", () => {
    it("has expected constants configuration", () => {
      expect(DEFAULT_ZOOM_SCALE).toBe(1.0);
      expect(MIN_ZOOM_SCALE).toBeLessThan(DEFAULT_ZOOM_SCALE);
      expect(MAX_ZOOM_SCALE).toBeGreaterThan(DEFAULT_ZOOM_SCALE);
      expect(ZOOM_STEP_FACTOR).toBeGreaterThan(1.0);
      expect(DOUBLE_CLICK_ZOOM_SCALE).toBe(2.5);
    });
  });
});
