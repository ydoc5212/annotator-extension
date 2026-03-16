import { useRef, useEffect, useCallback } from 'react';

export interface UndoAction {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const MAX_STACK_SIZE = 50;

export default function useUndoRedo() {
  const undoStackRef = useRef<UndoAction[]>([]);
  const redoStackRef = useRef<UndoAction[]>([]);
  // Counter ref to trigger re-renders when stacks change
  const versionRef = useRef(0);
  const forceUpdate = useCallback(() => {
    versionRef.current++;
  }, []);

  const push = useCallback((action: UndoAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > MAX_STACK_SIZE) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    forceUpdate();
  }, [forceUpdate]);

  const undo = useCallback(async () => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    await action.undo();
    redoStackRef.current.push(action);
    forceUpdate();
  }, [forceUpdate]);

  const redo = useCallback(async () => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    await action.redo();
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > MAX_STACK_SIZE) {
      undoStackRef.current.shift();
    }
    forceUpdate();
  }, [forceUpdate]);

  // Keyboard shortcuts: Cmd+Z = undo, Cmd+Shift+Z = redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in inputs/textareas/contenteditable
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement;
      }
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta || e.key.toLowerCase() !== 'z') return;

      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    push,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  };
}
