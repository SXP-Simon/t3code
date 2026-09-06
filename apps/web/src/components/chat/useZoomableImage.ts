import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
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
  type Point,
} from "./zoomableImage.logic";

export function useZoomableImage(src: string) {
  const [scale, setScale] = useState(DEFAULT_ZOOM_SCALE);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    posX: number;
    posY: number;
  }>({ clientX: 0, clientY: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);

  // Reset transform whenever source image changes
  useEffect(() => {
    setScale(DEFAULT_ZOOM_SCALE);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [src]);

  const zoomIn = useCallback(() => {
    setScale((prev) => getNextZoomInScale(prev));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = getNextZoomOutScale(prev);
      if (next <= DEFAULT_ZOOM_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const resetTransform = useCallback(() => {
    setScale(DEFAULT_ZOOM_SCALE);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const rotateClockwise = useCallback(() => {
    setRotation((prev) => getNextRotation(prev));
  }, []);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const focalPoint = {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      };

      const factor = event.deltaY < 0 ? 1.15 : 0.87;
      const nextScale = clampZoomScale(scale * factor);

      if (Math.abs(nextScale - scale) < 0.001) return;

      if (nextScale <= DEFAULT_ZOOM_SCALE && scale > DEFAULT_ZOOM_SCALE) {
        setScale(DEFAULT_ZOOM_SCALE);
        setPosition({ x: 0, y: 0 });
      } else {
        const newPos = calculateZoomAnchorPosition(scale, nextScale, position, focalPoint);
        setScale(nextScale);
        setPosition(newPos);
      }
    },
    [position, scale],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return; // Only primary mouse button
      event.stopPropagation();

      setIsDragging(true);
      hasMovedRef.current = false;
      dragStartRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        posX: position.x,
        posY: position.y,
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Safe fallback in test environments
      }
    },
    [position],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.stopPropagation();

      const dx = event.clientX - dragStartRef.current.clientX;
      const dy = event.clientY - dragStartRef.current.clientY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.stopPropagation();
      setIsDragging(false);

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Safe fallback
      }
    },
    [isDragging],
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (scale !== DEFAULT_ZOOM_SCALE || position.x !== 0 || position.y !== 0) {
        resetTransform();
      } else {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const focalPoint = {
          x: event.clientX - (rect.left + rect.width / 2),
          y: event.clientY - (rect.top + rect.height / 2),
        };
        const targetScale = DOUBLE_CLICK_ZOOM_SCALE;
        const newPos = calculateZoomAnchorPosition(scale, targetScale, position, focalPoint);
        setScale(targetScale);
        setPosition(newPos);
      }
    },
    [position, resetTransform, scale],
  );

  // Keyboard shortcut listeners (+, -, 0, r)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableElement(event.target)) return;

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        event.stopPropagation();
        zoomIn();
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        event.stopPropagation();
        zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        event.stopPropagation();
        resetTransform();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        event.stopPropagation();
        rotateClockwise();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetTransform, rotateClockwise, zoomIn, zoomOut]);

  return {
    scale,
    position,
    rotation,
    isDragging,
    containerRef,
    zoomIn,
    zoomOut,
    resetTransform,
    rotateClockwise,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    canZoomIn: scale < MAX_ZOOM_SCALE,
    canZoomOut: scale > MIN_ZOOM_SCALE,
    isZoomed: scale > DEFAULT_ZOOM_SCALE,
    zoomPercentage: Math.round(scale * 100),
  };
}
