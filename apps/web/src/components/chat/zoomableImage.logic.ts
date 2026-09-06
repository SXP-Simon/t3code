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
 * Returns true if the rotation is 90° or 270° (orthogonal/perpendicular to natural orientation).
 */
export function isOrthogonalRotation(rotation: number): boolean {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized === 90 || normalized === 270;
}

/**
 * Checks if keyboard event targets an editable element.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target) return false;
  return (
    (typeof HTMLInputElement !== "undefined" && target instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== "undefined" && target instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== "undefined" && target instanceof HTMLSelectElement) ||
    (typeof HTMLElement !== "undefined" &&
      target instanceof HTMLElement &&
      Boolean(target.isContentEditable))
  );
}

export interface ZoomableViewerTarget {
  readonly layout: "dialog" | "panel";
  readonly container?: { contains?: (other: Node | null) => boolean } | null;
}

/**
 * Selects the active viewer that should receive keyboard shortcuts.
 * Dialog viewers take precedence over panel viewers. When only panel
 * viewers exist, the focused viewer or most recently registered viewer is chosen.
 */
export function selectActiveViewer<T extends ZoomableViewerTarget>(
  viewers: readonly T[],
  activeElement: Node | null = typeof document !== "undefined" ? document.activeElement : null,
): T | undefined {
  if (viewers.length === 0) return undefined;

  // 1. If any dialog viewer is mounted, the topmost (last mounted) dialog receives shortcuts
  for (let i = viewers.length - 1; i >= 0; i--) {
    const viewer = viewers[i];
    if (viewer && viewer.layout === "dialog") {
      return viewer;
    }
  }

  // 2. If focus is inside a panel viewer container, prioritize that panel viewer
  if (activeElement) {
    for (let i = viewers.length - 1; i >= 0; i--) {
      const viewer = viewers[i];
      if (viewer?.container?.contains?.(activeElement)) {
        return viewer;
      }
    }
  }

  // 3. Fallback to the most recently registered viewer
  return viewers[viewers.length - 1];
}
