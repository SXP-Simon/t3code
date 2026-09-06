import { forwardRef, memo, type HTMLAttributes, type ReactNode } from "react";
import { MinusIcon, PlusIcon, RotateCwIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useZoomableImage } from "./useZoomableImage";

export interface ZoomableImageViewerProps extends HTMLAttributes<HTMLDivElement> {
  readonly src: string;
  readonly alt: string;
  readonly layout?: "dialog" | "panel";
  readonly onError?: () => void;
  readonly onOpenOriginal?: ReactNode;
}

export const ZoomableImageViewer = memo(
  forwardRef<HTMLDivElement, ZoomableImageViewerProps>(function ZoomableImageViewer(
    { src, alt, layout = "dialog", className, style, onError, onOpenOriginal, ...domProps },
    ref,
  ) {
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
    } = useZoomableImage(src, { layout });

    const isPanel = layout === "panel";

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-center justify-center",
          isPanel ? "h-full w-full min-h-0 flex-1 flex-col overflow-hidden" : "flex-col",
          className,
        )}
        style={style}
        {...domProps}
      >
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
            "relative flex items-center justify-center overflow-hidden transition-colors touch-none select-none",
            isPanel
              ? "h-full w-full min-h-0 flex-1 rounded-md border border-border/40 bg-muted/10"
              : "max-h-[82vh] max-w-[92vw] rounded-lg border border-border/70 bg-background/95 shadow-2xl",
            isDragging ? "cursor-grabbing" : isZoomed ? "cursor-grab" : "cursor-zoom-in",
          )}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            onError={onError}
            className={cn(
              "object-contain select-none will-change-transform",
              isPanel ? "max-h-full max-w-full" : "max-h-[82vh] max-w-[92vw]",
            )}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
          />
        </div>

        {/* Floating Interactive Toolbar */}
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border border-border/80 bg-popover/90 px-2.5 py-1 text-foreground shadow-xl backdrop-blur-md",
            isPanel ? "absolute bottom-4 z-10" : "mt-3",
          )}
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
  }),
);
