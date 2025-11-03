import React, { useState, useRef, useEffect } from 'react';
import { NoteAnnotation } from '../types';
import { ToolType } from '../types';

interface NoteLayerProps {
  notes: NoteAnnotation[];
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, content: string) => void;
  onUpdatePosition?: (id: string, x: number, y: number) => void;
  currentTool?: ToolType;
  initialEditingId?: string | null;
  onEditStart?: () => void;
}

export const NoteLayer: React.FC<NoteLayerProps> = ({ notes, onDelete, onUpdate, onUpdatePosition, currentTool, initialEditingId, onEditStart }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [notePositions, setNotePositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate text color based on background luminance for optimal contrast
  const getContrastTextColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Handle initial editing for newly created notes
  useEffect(() => {
    if (initialEditingId && !editingId) {
      setEditingId(initialEditingId);
      setEditContent('');
      onEditStart?.();
    }
  }, [initialEditingId]);

  // Auto-focus and select all text when entering edit mode
  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  // Save changes when switching tools
  useEffect(() => {
    if (editingId && currentTool) {
      const trimmedContent = editContent.trim();

      // Delete note if content is empty
      if (trimmedContent === '') {
        onDelete?.(editingId);
      } else {
        onUpdate?.(editingId, trimmedContent);
      }

      setEditingId(null);
      setEditContent('');
    }
  }, [currentTool]);

  const handleStartEdit = (e: React.MouseEvent, note: NoteAnnotation) => {
    // Don't allow editing with eraser tool
    if (currentTool === 'eraser') return;

    // Don't start editing if we're dragging
    if (draggedNoteId) return;

    e.stopPropagation();
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = (id: string) => {
    const trimmedContent = editContent.trim();

    // Delete note if content is empty
    if (trimmedContent === '') {
      onDelete?.(id);
    } else {
      onUpdate?.(id, trimmedContent);
    }

    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (editingId) {
      const target = e.target as HTMLElement;
      // Check if click is outside the note being edited
      if (!target.closest(`[data-note-id="${editingId}"]`)) {
        handleSaveEdit(editingId);
      }
    }
  };

  useEffect(() => {
    if (editingId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingId, editContent]);

  const handleMouseDown = (e: React.MouseEvent, noteId: string, currentX: number, currentY: number) => {
    // Don't start dragging if we're in edit mode
    if (editingId === noteId) {
      return;
    }

    // Don't drag if clicking with eraser tool (will delete instead)
    if (currentTool === 'eraser' && onDelete) {
      return;
    }

    setDraggedNoteId(noteId);
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggedNoteId) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setNotePositions((prev) => ({
      ...prev,
      [draggedNoteId]: { x: newX, y: newY },
    }));
  };

  const handleMouseUp = () => {
    if (draggedNoteId && notePositions[draggedNoteId] && onUpdatePosition) {
      const pos = notePositions[draggedNoteId];
      onUpdatePosition(draggedNoteId, pos.x, pos.y);
    }
    setDraggedNoteId(null);
  };

  useEffect(() => {
    if (draggedNoteId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNoteId, dragOffset, notePositions]);

  return (
    <>
      {notes.map((note) => {
        const isEditing = editingId === note.id;
        const currentPos = notePositions[note.id] || note.position;

        return (
          <div
            key={note.id}
            data-note-id={note.id}
            style={{
              position: 'absolute',
              left: `${currentPos.x}px`,
              top: `${currentPos.y}px`,
              backgroundColor: note.color,
              border: isEditing ? '2px solid #2196F3' : '2px solid #333',
              borderRadius: '4px',
              padding: '8px',
              minWidth: '150px',
              maxWidth: '250px',
              boxShadow: isEditing
                ? '0 4px 12px rgba(33, 150, 243, 0.4)'
                : '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 1000,
              cursor: isEditing ? 'text' : 'move',
              transition: 'border 0.2s, box-shadow 0.2s',
            }}
            onMouseDown={(e) => handleMouseDown(e, note.id, currentPos.x, currentPos.y)}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, note.id)}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#000000',
                  outline: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                style={{
                  fontSize: '13px',
                  color: getContrastTextColor(note.color),
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  cursor: currentTool === 'eraser' ? 'pointer' : 'text',
                }}
                onMouseDown={(e) => {
                  // Stop propagation to prevent drag from interfering with edit
                  if (currentTool !== 'eraser') {
                    e.stopPropagation();
                  }
                }}
                onClick={(e) => {
                  if (currentTool === 'eraser' && onDelete) {
                    onDelete(note.id);
                  } else {
                    handleStartEdit(e, note);
                  }
                }}
              >
                {note.content}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
