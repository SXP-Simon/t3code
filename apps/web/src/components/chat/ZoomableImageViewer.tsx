import { memo, type CSSProperties, type ReactNode } from "react";
import { MinusIcon, PlusIcon, RotateCwIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useZoomableImage } from "./useZoomableImage";

export interface ZoomableImageViewerProps {
  readonly src: string;
  readonly alt: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly onError?: () => void;
  readonly onOpenOriginal?: ReactNode;
}

export const ZoomableImageViewer = memo(function ZoomableImageViewer({
  src,
  alt,
  className,
  style,
  onError,
}: ZoomableImageViewerProps) {
  const {
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
    canZoomIn,
    canZoomOut,
    isZoomed,
    zoomPercentage,
  } = useZoomableImage(src);

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Zoomable Image Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "relative flex max-h-[82vh] max-w-[92vw] items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background/95 shadow-2xl transition-colors touch-none select-none",
          isDragging ? "cursor-grabbing" : isZoomed ? "cursor-grab" : "cursor-zoom-in",
          className,
        )}
        style={style}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={onError}
          className="max-h-[82vh] max-w-[92vw] object-contain select-none will-change-transform"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>

      {/* Floating Interactive Toolbar */}
      <div
        className="mt-3 flex items-center gap-1 rounded-full border border-border/80 bg-popover/90 px-2.5 py-1 text-foreground shadow-xl backdrop-blur-md"
        role="toolbar"
        aria-label="Image preview controls"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={zoomOut}
          disabled={!canZoomOut}
          title="Zoom out (-)"
          aria-label="Zoom out"
          className="size-7 rounded-full text-foreground/80 hover:bg-muted hover:text-foreground"
        >
          <MinusIcon className="size-3.5" />
        </Button>

        <button
          type="button"
          onClick={resetTransform}
          title="Reset zoom (0)"
          aria-label={`Current zoom ${zoomPercentage}%. Click to reset.`}
          className="min-w-12 px-1 text-center font-mono text-xs font-semibold text-foreground/90 transition-colors hover:text-foreground"
        >
          {zoomPercentage}%
        </button>

        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={zoomIn}
          disabled={!canZoomIn}
          title="Zoom in (+)"
          aria-label="Zoom in"
          className="size-7 rounded-full text-foreground/80 hover:bg-muted hover:text-foreground"
        >
          <PlusIcon className="size-3.5" />
        </Button>

        <div className="mx-1 h-3.5 w-px bg-border/80" />

        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={rotateClockwise}
          title="Rotate 90° (R)"
          aria-label="Rotate 90 degrees"
          className="size-7 rounded-full text-foreground/80 hover:bg-muted hover:text-foreground"
        >
          <RotateCwIcon className="size-3.5" />
        </Button>

        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={resetTransform}
          title="Reset view (0)"
          aria-label="Reset zoom and rotation"
          className="size-7 rounded-full text-foreground/80 hover:bg-muted hover:text-foreground"
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
});
