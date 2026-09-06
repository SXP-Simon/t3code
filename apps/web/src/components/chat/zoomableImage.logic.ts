export const MIN_ZOOM_SCALE = 0.2;
export const MAX_ZOOM_SCALE = 5.0;
export const DEFAULT_ZOOM_SCALE = 1.0;
export const ZOOM_STEP_FACTOR = 1.25;
export const DOUBLE_CLICK_ZOOM_SCALE = 2.5;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Clamps scale between allowed minimum and maximum boundaries.
 */
export function clampZoomScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_ZOOM_SCALE), MAX_ZOOM_SCALE);
}

/**
 * Calculates new position to keep the cursor focal point anchored during zoom.
 */
export function calculateZoomAnchorPosition(
  currentScale: number,
  newScale: number,
  currentPosition: Point,
  focalPoint: Point,
): Point {
  if (currentScale <= 0) return { x: 0, y: 0 };
  const ratio = newScale / currentScale;
  return {
    x: focalPoint.x - (focalPoint.x - currentPosition.x) * ratio,
    y: focalPoint.y - (focalPoint.y - currentPosition.y) * ratio,
  };
}

/**
 * Computes next scale when zooming in.
 */
export function getNextZoomInScale(currentScale: number): number {
  return clampZoomScale(currentScale * ZOOM_STEP_FACTOR);
}

/**
 * Computes next scale when zooming out.
 */
export function getNextZoomOutScale(currentScale: number): number {
  return clampZoomScale(currentScale / ZOOM_STEP_FACTOR);
}

/**
 * Calculates rotated angle in 90-degree steps within [0, 360).
 */
export function getNextRotation(currentRotation: number): number {
  return (currentRotation + 90) % 360;
}

/**
 * Checks if keyboard event targets an editable element.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
