import { useState, useCallback, useEffect, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T | ((prevState: T) => T)) => void;
  setStateWithoutHistory: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

const HISTORY_LIMIT = 50;

/**
 * Custom hook for managing undo/redo history
 * @param initialState - Initial state value
 * @returns Object with state, setState, undo, redo functions and canUndo/canRedo flags
 */
export function useHistory<T>(initialState: T): UseHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Track if we're in the middle of an undo/redo operation to prevent recursion
  const isUndoRedoRef = useRef(false);

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    // Don't add to history if we're in the middle of undo/redo
    if (isUndoRedoRef.current) {
      return;
    }

    setHistory((currentHistory) => {
      const resolvedState = typeof newState === 'function'
        ? (newState as (prevState: T) => T)(currentHistory.present)
        : newState;

      // Don't add to history if state hasn't changed
      if (JSON.stringify(resolvedState) === JSON.stringify(currentHistory.present)) {
        return currentHistory;
      }

      const newPast = [...currentHistory.past, currentHistory.present];

      // Limit history size to prevent memory issues
      if (newPast.length > HISTORY_LIMIT) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: resolvedState,
        future: [], // Clear redo stack when new changes are made
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) {
        return currentHistory;
      }

      const previous = currentHistory.past[currentHistory.past.length - 1];
      const newPast = currentHistory.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [currentHistory.present, ...currentHistory.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) {
        return currentHistory;
      }

      const next = currentHistory.future[0];
      const newFuture = currentHistory.future.slice(1);

      return {
        past: [...currentHistory.past, currentHistory.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((currentHistory) => ({
      past: [],
      present: currentHistory.present,
      future: [],
    }));
  }, []);

  // Set state without adding to history (useful for initial load)
  const setStateWithoutHistory = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z (without Shift)
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          isUndoRedoRef.current = true;
          undo();
          // Reset flag after a short delay to allow state to propagate
          setTimeout(() => {
            isUndoRedoRef.current = false;
          }, 0);
        }
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      else if ((modifier && e.key === 'z' && e.shiftKey) || (modifier && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) {
          isUndoRedoRef.current = true;
          redo();
          // Reset flag after a short delay to allow state to propagate
          setTimeout(() => {
            isUndoRedoRef.current = false;
          }, 0);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo]);

  return {
    state: history.present,
    setState,
    setStateWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
