import React, { useState, useEffect, useCallback } from 'react';
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

export const App: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [currentColor, setCurrentColor] = useState('#FFEB3B');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const currentUrl = window.location.href;

  useEffect(() => {
    loadAnnotations(currentUrl).then(setAnnotations);
    loadEnabledState(currentUrl).then(setIsEnabled);

    // Listen for toggle messages from popup
    const handleMessage = (message: any) => {
      if (message.type === 'TOGGLE_ANNOTATOR') {
        setIsEnabled(message.isEnabled);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [currentUrl]);

  useEffect(() => {
    saveAnnotations(currentUrl, annotations);
  }, [annotations, currentUrl]);

  useEffect(() => {
    saveEnabledState(currentUrl, isEnabled);
  }, [isEnabled, currentUrl]);

  const handleTextSelection = useCallback(() => {
    if (!isEnabled || currentTool !== 'highlight') return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') return;

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);

    // Get surrounding context (up to 50 chars before and after)
    const containerText = range.commonAncestorContainer.textContent || '';
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    const textBefore = containerText.substring(Math.max(0, startOffset - 50), startOffset);
    const textAfter = containerText.substring(endOffset, Math.min(containerText.length, endOffset + 50));

    const highlight: HighlightAnnotation = {
      id: `highlight-${Date.now()}-${Math.random()}`,
      type: 'highlight',
      color: currentColor,
      text: selectedText,
      textBefore,
      textAfter,
      timestamp: Date.now(),
    };

    setAnnotations((prev) => [...prev, highlight]);
    selection.removeAllRanges();
  }, [currentTool, currentColor]);

  const handlePageClick = useCallback((e: MouseEvent) => {
    if (!isEnabled) return;
    if (currentTool === 'note') {
      const target = e.target as HTMLElement;
      // Don't create note if clicking on toolbar or existing notes
      if (target.closest('[data-annotator-toolbar]') || target.closest('[data-annotator-note]')) {
        return;
      }

      const content = window.prompt('Enter note text:');
      if (!content) return;

      const note: NoteAnnotation = {
        id: `note-${Date.now()}-${Math.random()}`,
        type: 'note',
        content,
        position: {
          x: e.pageX,
          y: e.pageY,
        },
        color: currentColor,
        timestamp: Date.now(),
      };

      setAnnotations((prev) => [...prev, note]);
    }
  }, [currentTool, currentColor]);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', handlePageClick);

    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('click', handlePageClick);
    };
  }, [handleTextSelection, handlePageClick, isEnabled]);

  const handleDrawingComplete = useCallback((paths: Position[][]) => {
    if (paths.length === 0) return;

    const drawing: DrawingAnnotation = {
      id: `drawing-${Date.now()}-${Math.random()}`,
      type: 'drawing',
      paths,
      color: currentColor,
      strokeWidth: 3,
      timestamp: Date.now(),
    };

    setAnnotations((prev) => [...prev, drawing]);
  }, [currentColor]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleUpdateNote = useCallback((id: string, content: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id && a.type === 'note' ? { ...a, content } : a))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all annotations on this page?')) {
      setAnnotations([]);
      clearAnnotations(currentUrl);
    }
  }, [currentUrl]);

  const highlights = annotations.filter((a) => a.type === 'highlight') as HighlightAnnotation[];
  const notes = annotations.filter((a) => a.type === 'note') as NoteAnnotation[];
  const drawings = annotations.filter((a) => a.type === 'drawing') as DrawingAnnotation[];

  return (
    <>
      {isEnabled && (
        <>
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
