import { describe, expect, it } from "vite-plus/test";
import {
  calculateZoomAnchorPosition,
  clampZoomScale,
  DEFAULT_ZOOM_SCALE,
  DOUBLE_CLICK_ZOOM_SCALE,
  getNextRotation,
  getNextZoomInScale,
  getNextZoomOutScale,
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
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
