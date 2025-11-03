import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toolbar } from './Toolbar';
import { HighlightLayer } from './HighlightLayer';
import { NoteLayer } from './NoteLayer';
import { DrawingCanvas } from './DrawingCanvas';
import {
  Annotation,
  HighlightAnnotation,
  NoteAnnotation,
  DrawingAnnotation,
  ToolType,
  Position,
} from '../types';
import { saveAnnotations, loadAnnotations, clearAnnotations, saveEnabledState, loadEnabledState } from '../utils/storage';
import { useHistory } from '../hooks/useHistory';
import { getXPath } from '../utils/xpath';

export const App: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [currentColor, setCurrentColor] = useState('#FFEB3B');
  const [newNoteId, setNewNoteId] = useState<string | null>(null);
  const [isErasing, setIsErasing] = useState(false);

  // Use history hook for undo/redo functionality
  const {
    state: annotations,
    setState: setAnnotations,
    setStateWithoutHistory: setAnnotationsWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  } = useHistory<Annotation[]>([]);

  const currentUrl = window.location.href;

  // Use refs to store current state for event handlers to avoid stale closures
  const stateRef = useRef({ isEnabled, currentTool, currentColor, setAnnotations });

  useEffect(() => {
    stateRef.current = { isEnabled, currentTool, currentColor, setAnnotations };
  }, [isEnabled, currentTool, currentColor, setAnnotations]);

  useEffect(() => {
    // Load initial annotations without adding to history
    loadAnnotations(currentUrl).then((loadedAnnotations) => {
      setAnnotationsWithoutHistory(loadedAnnotations);
    });
    loadEnabledState(currentUrl).then(setIsEnabled);

    // Listen for toggle messages from extension icon click
    const handleMessage = (message: any) => {
      if (message.type === 'TOGGLE_ANNOTATOR') {
        setIsEnabled((prev) => !prev);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [currentUrl]);

  // Separate effect for ESC and tilde key handling to avoid re-registering on every isEnabled change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEnabled) {
        setCurrentTool('select'); // Switch to select tool on ESC
      }
      // Tilde key (~) toggles annotator on/off and resets to select tool
      if (e.key === '`') {
        e.preventDefault();
        setIsEnabled((prev) => {
          const newEnabled = !prev;
          if (newEnabled) {
            setCurrentTool('select'); // Reset to select when enabling
          }
          return newEnabled;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled]);

  // Keyboard shortcuts for tool selection (1-5)
  useEffect(() => {
    const handleToolShortcut = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Only handle shortcuts when annotator is enabled
      if (!isEnabled) return;

      const toolMap: { [key: string]: ToolType } = {
        '1': 'select',
        '2': 'highlight',
        '3': 'note',
        '4': 'drawing',
        '5': 'eraser',
        '6': 'paint-bucket',
      };

      const tool = toolMap[e.key];
      if (tool) {
        e.preventDefault();
        setCurrentTool(tool);
      }
    };

    document.addEventListener('keydown', handleToolShortcut);

    return () => {
      document.removeEventListener('keydown', handleToolShortcut);
    };
  }, [isEnabled]);

  useEffect(() => {
    saveAnnotations(currentUrl, annotations);
  }, [annotations, currentUrl]);

  useEffect(() => {
    saveEnabledState(currentUrl, isEnabled);
  }, [isEnabled, currentUrl]);

  // Capture selection immediately on mouseup (synchronous, before anything clears it)
  useEffect(() => {
    const handleMouseUp = () => {
      const { isEnabled, currentTool, currentColor, setAnnotations } = stateRef.current;

      if (!isEnabled || currentTool !== 'highlight') return;

      // Capture selection RIGHT NOW synchronously
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0).cloneRange();

      try {
        // Get XPaths for start and end containers
        const startContainerXPath = getXPath(range.startContainer);
        const endContainerXPath = getXPath(range.endContainer);

        // Create highlight annotation with XPath data
        const highlight: HighlightAnnotation = {
          id: `highlight-${Date.now()}-${Math.random()}`,
          type: 'highlight',
          color: currentColor,
          text: text,
          startContainerXPath: startContainerXPath,
          startOffset: range.startOffset,
          endContainerXPath: endContainerXPath,
          endOffset: range.endOffset,
          timestamp: Date.now(),
        };

        setAnnotations((prev) => [...prev, highlight]);

        // Clear visible selection
        window.getSelection()?.removeAllRanges();

      } catch (error) {
        // Silent error
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handlePaintBucket = useCallback((e: MouseEvent) => {
    const { currentColor, setAnnotations } = stateRef.current;

    e.preventDefault();
    e.stopPropagation();

    const clickedElement = e.target as HTMLElement;

    // Skip toolbar
    if (clickedElement.closest('[data-annotator-toolbar]')) {
      return;
    }

    // Try to find a note
    const noteDiv = clickedElement.closest('[data-note-id]');
    if (noteDiv) {
      const noteId = noteDiv.getAttribute('data-note-id');
      if (noteId) {
        setAnnotations((prev) =>
          prev.map((annotation) =>
            annotation.id === noteId && annotation.type === 'note'
              ? { ...annotation, color: currentColor }
              : annotation
          )
        );
        return;
      }
    }

    // Try to find a highlight
    const highlightSpan = clickedElement.closest('[data-highlight-id]');
    if (highlightSpan) {
      const highlightId = highlightSpan.getAttribute('data-highlight-id');
      if (highlightId) {
        setAnnotations((prev) =>
          prev.map((annotation) =>
            annotation.id === highlightId && annotation.type === 'highlight'
              ? { ...annotation, color: currentColor }
              : annotation
          )
        );
        return;
      }
    }
  }, []);

  const handlePageClick = useCallback((e: MouseEvent) => {
    const { isEnabled, currentTool, currentColor, setAnnotations } = stateRef.current;

    if (!isEnabled) return;

    if (currentTool === 'paint-bucket') {
      handlePaintBucket(e);
      return;
    }

    if (currentTool === 'note') {
      const target = e.target as HTMLElement;
      // Don't create note if clicking on toolbar or existing notes
      if (target.closest('[data-annotator-toolbar]') || target.closest('[data-annotator-note]')) {
        return;
      }

      // Create empty note that will start in edit mode
      const noteId = `note-${Date.now()}-${Math.random()}`;
      const note: NoteAnnotation = {
        id: noteId,
        type: 'note',
        content: '',
        position: {
          x: e.pageX,
          y: e.pageY,
        },
        color: currentColor,
        timestamp: Date.now(),
      };

      setAnnotations((prev) => [...prev, note]);
      setNewNoteId(noteId);
    }
  }, []); // Empty deps - uses ref for current state

  useEffect(() => {
    document.addEventListener('click', handlePageClick);

    return () => {
      document.removeEventListener('click', handlePageClick);
    };
  }, [handlePageClick]);

  // Separate listener for paint bucket in capture phase to intercept clicks
  useEffect(() => {
    if (!isEnabled || currentTool !== 'paint-bucket') return;

    const captureClick = (e: MouseEvent) => {
      // Don't block toolbar clicks
      const target = e.target as HTMLElement;
      if (target.closest('[data-annotator-toolbar]')) {
        return;
      }

      // Check if clicking on a note or highlight
      if (target.closest('[data-note-id]') || target.closest('[data-highlight-id]')) {
        e.preventDefault();
        e.stopPropagation();
        handlePaintBucket(e);
      }
    };

    // Use capture phase to intercept clicks before they reach other handlers
    document.addEventListener('click', captureClick, true);

    return () => {
      document.removeEventListener('click', captureClick, true);
    };
  }, [isEnabled, currentTool, handlePaintBucket]);

  const handleDrawingComplete = useCallback((path: Position[]) => {
    if (path.length === 0) return;

    const drawing: DrawingAnnotation = {
      id: `drawing-${Date.now()}-${Math.random()}`,
      type: 'drawing',
      paths: [path], // Wrap single path in array
      color: currentColor,
      strokeWidth: 3,
      timestamp: Date.now(),
    };

    setAnnotations((prev) => [...prev, drawing]);
  }, [currentColor]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleEraseAtPoint = useCallback((x: number, y: number) => {
    if (currentTool !== 'eraser') return;

    const eraserRadius = 12; // Match the cursor circle radius
    const deletedIds = new Set<string>();

    // Check multiple points in a circular area around the cursor
    const checkPoints = [
      { x: x, y: y }, // Center
      { x: x + eraserRadius, y: y },
      { x: x - eraserRadius, y: y },
      { x: x, y: y + eraserRadius },
      { x: x, y: y - eraserRadius },
      { x: x + eraserRadius * 0.7, y: y + eraserRadius * 0.7 },
      { x: x - eraserRadius * 0.7, y: y - eraserRadius * 0.7 },
      { x: x + eraserRadius * 0.7, y: y - eraserRadius * 0.7 },
      { x: x - eraserRadius * 0.7, y: y + eraserRadius * 0.7 },
    ];

    for (const point of checkPoints) {
      // Check if we're over a note
      const noteElement = document.elementFromPoint(point.x, point.y)?.closest('[data-note-id]');
      if (noteElement) {
        const noteId = noteElement.getAttribute('data-note-id');
        if (noteId && !deletedIds.has(noteId)) {
          deletedIds.add(noteId);
        }
      }

      // Check if we're over a highlight
      const highlightElement = document.elementFromPoint(point.x, point.y)?.closest('[data-highlight-id]');
      if (highlightElement) {
        const highlightId = highlightElement.getAttribute('data-highlight-id');
        if (highlightId && !deletedIds.has(highlightId)) {
          deletedIds.add(highlightId);
        }
      }
    }

    // Delete all found annotations
    if (deletedIds.size > 0) {
      setAnnotations((prev) => prev.filter((a) => !deletedIds.has(a.id)));
    }

    // Check if we're over a drawing (handled by DrawingCanvas component)
  }, [currentTool, setAnnotations]);

  useEffect(() => {
    if (!isEnabled || currentTool !== 'eraser') return;

    const handleMouseDown = () => {
      setIsErasing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isErasing) {
        handleEraseAtPoint(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsErasing(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEnabled, currentTool, isErasing, handleEraseAtPoint]);

  const handleUpdateNote = useCallback((id: string, content: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id && a.type === 'note' ? { ...a, content } : a))
    );
  }, []);

  const handleUpdateNotePosition = useCallback((id: string, x: number, y: number) => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id && a.type === 'note' ? { ...a, position: { x, y } } : a
      )
    );
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all annotations on this page?')) {
      setAnnotationsWithoutHistory([]);
      clearAnnotations(currentUrl);
    }
  }, [currentUrl, setAnnotationsWithoutHistory]);

  const highlights = annotations.filter((a) => a.type === 'highlight') as HighlightAnnotation[];
  const notes = annotations.filter((a) => a.type === 'note') as NoteAnnotation[];
  const drawings = annotations.filter((a) => a.type === 'drawing') as DrawingAnnotation[];

  return (
    <>
      {isEnabled && (
        <>
          {/* Disable text selection for tools where it interferes */}
          {currentTool !== 'select' && currentTool !== 'highlight' && (
            <style>{`
              * {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
              }
              /* Allow selection in note textareas */
              textarea {
                user-select: text !important;
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
              }
            `}</style>
          )}

          {/* Custom cursors for tools */}
          {currentTool === 'highlight' && (
            <style>{`
              * {
                cursor: text !important;
              }
            `}</style>
          )}

          {currentTool === 'note' && (
            <style>{`
              * {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="6" y="6" width="18" height="20" rx="1" fill="%23FFD54F" stroke="%23000" stroke-width="1.5"/><path d="M 24 26 L 24 20 L 18 26 Z" fill="%23FFC107" stroke="%23000" stroke-width="1.5"/><line x1="10" y1="11" x2="20" y2="11" stroke="%23666" stroke-width="1"/><line x1="10" y1="15" x2="20" y2="15" stroke="%23666" stroke-width="1"/><line x1="10" y1="19" x2="16" y2="19" stroke="%23666" stroke-width="1"/></svg>') 16 16, auto !important;
              }
            `}</style>
          )}

          {currentTool === 'drawing' && (
            <style>{`
              * {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%232196F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>') 2 22, auto !important;
              }
            `}</style>
          )}

          {currentTool === 'eraser' && (
            <style>{`
              * {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="rgba(233, 30, 99, 0.3)" stroke="%23E91E63" stroke-width="2"/><circle cx="16" cy="16" r="2" fill="%23E91E63"/></svg>') 16 16, auto !important;
              }
            `}</style>
          )}

          {currentTool === 'paint-bucket' && (
            <style>{`
              * {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="m20 12-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L20 12Z" fill="%239C27B0" stroke="%23000" stroke-width="1.5"/><path d="m6 3 5 5" stroke="%23000" stroke-width="1.5"/><path d="M3 14h15" stroke="%23000" stroke-width="1.5"/><circle cx="4" cy="28" r="3" fill="%239C27B0" stroke="%23000" stroke-width="1.5"/><circle cx="4" cy="28" r="1.5" fill="%23fff"/><line x1="4" y1="24" x2="4" y2="20" stroke="%23000" stroke-width="2"/></svg>') 4 28, auto !important;
              }
            `}</style>
          )}

          <div data-annotator-toolbar style={{ pointerEvents: 'auto' }}>
            <Toolbar
              currentTool={currentTool}
              onToolChange={setCurrentTool}
              currentColor={currentColor}
              onColorChange={setCurrentColor}
              onClearAll={handleClearAll}
            />
          </div>

      <HighlightLayer
        highlights={highlights}
        onDelete={currentTool === 'eraser' ? handleDeleteAnnotation : undefined}
      />

      <div
        data-annotator-note
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1001,
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <NoteLayer
            notes={notes}
            onDelete={currentTool === 'eraser' ? handleDeleteAnnotation : undefined}
            onUpdate={handleUpdateNote}
            onUpdatePosition={handleUpdateNotePosition}
            currentTool={currentTool}
            initialEditingId={newNoteId}
            onEditStart={() => setNewNoteId(null)}
          />
        </div>
      </div>

          <DrawingCanvas
            isDrawing={currentTool === 'drawing'}
            color={currentColor}
            strokeWidth={3}
            onDrawingComplete={handleDrawingComplete}
            existingDrawings={drawings}
            onDelete={currentTool === 'eraser' ? handleDeleteAnnotation : undefined}
          />
        </>
      )}
    </>
  );
};
