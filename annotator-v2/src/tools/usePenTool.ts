import { useEffect, useRef } from "react";
import { db, type Point } from "../store/db";
import { useLiveQuery } from "dexie-react-hooks";
import { addStroke } from "../store/undoable";
import { getPageContext } from "../utils/pageContext";
import type { UndoAction } from "../hooks/useUndoRedo";

interface Props {
  isActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  color: string;
  strokeWidth: number;
  redrawKey: number;
  onUndoableAction?: (action: UndoAction) => void;
}

export default function usePenTool({ isActive, canvasRef, color, strokeWidth, redrawKey, onUndoableAction }: Props) {
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Point[]>([]);
  const url = window.location.href;

  const existingStrokes = useLiveQuery(
    () => db.strokes.where({ url }).toArray(),
    [url]
  );

  // Re-draw all saved strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !existingStrokes) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    existingStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [existingStrokes, canvasRef, redrawKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startDrawing = (e: MouseEvent) => {
      isDrawingRef.current = true;
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      currentPathRef.current = [{ x, y }];
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;

      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      currentPathRef.current.push({ x, y });

      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = async () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      ctx.closePath();

      if (currentPathRef.current.length > 1) {
        const minY = Math.min(...currentPathRef.current.map(p => p.y));
        const context = getPageContext(minY);
        const strokeData = {
          id: crypto.randomUUID(),
          url,
          color,
          strokeWidth,
          points: currentPathRef.current,
          timestamp: Date.now(),
          ...context,
        };
        const action = await addStroke(strokeData);
        onUndoableAction?.(action);
      }
      currentPathRef.current = [];
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
    };
  }, [isActive, color, strokeWidth, canvasRef, url, onUndoableAction]);
}
