import React, { useRef, useEffect, useState } from 'react';
import { DrawingAnnotation, Position } from '../types';

interface DrawingCanvasProps {
  isDrawing: boolean;
  color: string;
  strokeWidth: number;
  onDrawingComplete: (path: Position[]) => void;
  existingDrawings: DrawingAnnotation[];
  onDelete?: (id: string) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawing,
  color,
  strokeWidth,
  onDrawingComplete,
  existingDrawings,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas to match document size (not viewport) with proper DPI
    const dpr = window.devicePixelRatio || 1;
    const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth);
    const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    canvas.width = docWidth * dpr;
    canvas.height = docHeight * dpr;
    canvas.style.width = `${docWidth}px`;
    canvas.style.height = `${docHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing drawings
    existingDrawings.forEach((drawing) => {
      drawing.paths.forEach((path) => {
        if (path.length < 2) return;
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      });
    });

    // Draw current path
    if (currentPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  }, [existingDrawings, currentPath, color, strokeWidth]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      // Check if clicking on a drawing to erase
      if (onDelete) {
        const clickX = e.pageX;
        const clickY = e.pageY;

        // Check each drawing to see if click is near any path
        for (const drawing of existingDrawings) {
          for (const path of drawing.paths) {
            for (let i = 0; i < path.length - 1; i++) {
              const dist = distanceToLineSegment(
                { x: clickX, y: clickY },
                path[i],
                path[i + 1]
              );
              if (dist < 10) { // 10px hit tolerance
                onDelete(drawing.id);
                return;
              }
            }
          }
        }
      }
      return;
    }
    setIsDrawingActive(true);
    setCurrentPath([{ x: e.clientX, y: e.clientY }]);
  };

  // Helper function to calculate distance from point to line segment
  const distanceToLineSegment = (p: Position, a: Position, b: Position): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = a.x + t * dx;
    const projY = a.y + t * dy;

    return Math.hypot(p.x - projX, p.y - projY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingActive) return;
    setCurrentPath((prev) => [...prev, { x: e.clientX, y: e.clientY }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !isDrawingActive) return;
    setIsDrawingActive(false);
    if (currentPath.length > 1) {
      onDrawingComplete(currentPath);
    }
    setCurrentPath([]);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: isDrawing ? 1001 : 999,
        cursor: isDrawing ? 'crosshair' : onDelete ? 'pointer' : 'default',
        pointerEvents: isDrawing || onDelete ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
