import { useState, useEffect, useRef, useCallback } from 'react';
import { db, type StickyNote } from '../store/db';
import { deleteNote } from '../store/undoable';
import { Pin, PinOff } from 'lucide-react';
import type { UndoAction } from '../hooks/useUndoRedo';

interface Props {
  note: StickyNote;
  onUndoableAction?: (action: UndoAction) => void;
}

const MIN_WIDTH = 180;
const MIN_HEIGHT = 80;
const MAX_AUTO_HEIGHT = 400;

export default function AnnotationCard({ note, onUndoableAction }: Props) {
  const [text, setText] = useState(note.text);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ width: note.width || 250, height: note.height || 120 });
  const [isFocused, setIsFocused] = useState(false);
  const [pinned, setPinned] = useState(!!note.pinned);
  const textOnFocusRef = useRef(note.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [userResized, setUserResized] = useState(false);

  // Auto-size height based on text content (only if user hasn't manually resized)
  useEffect(() => {
    if (userResized) return;
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = '0px';
    const contentHeight = el.scrollHeight;
    el.style.height = '';

    const totalHeight = Math.max(MIN_HEIGHT, Math.min(contentHeight + 16 + 24, MAX_AUTO_HEIGHT));
    if (Math.abs(totalHeight - size.height) > 4) {
      setSize(prev => ({ ...prev, height: totalHeight }));
      db.notes.update(note.id, { height: totalHeight });
    }
  }, [text, userResized, note.id]);

  // Debounced DB update for text
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== note.text) {
        db.notes.update(note.id, { text });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [text, note.id, note.text]);

  // Toggle pin state
  const handleTogglePin = useCallback(() => {
    const wasPinned = pinned;
    const newPinned = !wasPinned;

    if (newPinned) {
      // Pinning: convert page coordinates to viewport coordinates
      const viewportX = position.x - window.scrollX;
      const viewportY = position.y - window.scrollY;
      setPosition({ x: viewportX, y: viewportY });
      setPinned(true);
      db.notes.update(note.id, { pinned: true, x: viewportX, y: viewportY });
      onUndoableAction?.({
        undo: async () => {
          // Restore to page coords (re-add current scroll offset at undo time)
          const pageX = viewportX + window.scrollX;
          const pageY = viewportY + window.scrollY;
          await db.notes.update(note.id, { pinned: false, x: pageX, y: pageY });
        },
        redo: async () => {
          await db.notes.update(note.id, { pinned: true, x: viewportX, y: viewportY });
        },
      });
    } else {
      // Unpinning: convert viewport coordinates to page coordinates
      const pageX = position.x + window.scrollX;
      const pageY = position.y + window.scrollY;
      setPosition({ x: pageX, y: pageY });
      setPinned(false);
      db.notes.update(note.id, { pinned: false, x: pageX, y: pageY });
      onUndoableAction?.({
        undo: async () => {
          // Restore to viewport coords (subtract current scroll offset at undo time)
          const vpX = pageX - window.scrollX;
          const vpY = pageY - window.scrollY;
          await db.notes.update(note.id, { pinned: true, x: vpX, y: vpY });
        },
        redo: async () => {
          await db.notes.update(note.id, { pinned: false, x: pageX, y: pageY });
        },
      });
    }
  }, [pinned, position, note.id, onUndoableAction]);

  // Custom drag handler — uses page-relative or viewport-relative coordinates depending on pin state
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = position.x;
    const startY = position.y;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      setPosition({ x: startX + dx, y: startY + dy });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      setPosition(current => {
        if (current.x !== startX || current.y !== startY) {
          db.notes.update(note.id, { x: current.x, y: current.y });
          onUndoableAction?.({
            undo: async () => { await db.notes.update(note.id, { x: startX, y: startY }); },
            redo: async () => { await db.notes.update(note.id, { x: current.x, y: current.y }); },
          });
        }
        return current;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [position, note.id, onUndoableAction]);

  // Custom resize handler
  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setUserResized(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startW;
      let newH = startH;

      if (corner.includes('r')) newW = Math.max(MIN_WIDTH, startW + dx);
      if (corner.includes('b')) newH = Math.max(MIN_HEIGHT, startH + dy);
      if (corner.includes('l')) newW = Math.max(MIN_WIDTH, startW - dx);

      setSize({ width: newW, height: newH });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      setSize(current => {
        db.notes.update(note.id, { width: current.width, height: current.height });
        onUndoableAction?.({
          undo: async () => { await db.notes.update(note.id, { width: startW, height: startH }); },
          redo: async () => { await db.notes.update(note.id, { width: current.width, height: current.height }); },
        });
        return current;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [size, note.id, onUndoableAction]);

  return (
    <div
      className={`shadow-lg rounded-xl overflow-hidden backdrop-blur-md border transition-shadow group ${
        isFocused ? 'ring-2 ring-blue-500 border-blue-200' : 'border-slate-200/50 hover:border-slate-300'
      }`}
      style={{
        position: pinned ? 'fixed' : 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        backgroundColor: note.color || '#fef08a',
        pointerEvents: 'auto',
        zIndex: pinned ? 10000 : 10,
      }}
    >
      {/* Drag handle with pin button */}
      <div
        onMouseDown={handleDragStart}
        className="h-5 w-full cursor-grab active:cursor-grabbing bg-black/5 hover:bg-black/10 transition-colors flex items-center px-1"
      >
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleTogglePin}
          className="flex items-center justify-center w-4 h-4 rounded-sm opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-pointer"
          style={{ opacity: pinned ? 0.7 : undefined }}
          title={pinned ? 'Unpin from viewport' : 'Pin to viewport'}
        >
          {pinned ? (
            <PinOff size={11} strokeWidth={2} />
          ) : (
            <Pin size={11} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Delete button */}
      <button
        onClick={async () => {
          const action = await deleteNote(note.id);
          onUndoableAction?.(action);
        }}
        className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded-bl-md bg-black/0 hover:bg-black/20 text-slate-800 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-pointer z-10"
        title="Delete note"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>

      {/* Text area */}
      <div className="p-3" style={{ height: `calc(100% - 20px)` }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            textOnFocusRef.current = text;
          }}
          onBlur={() => {
            setIsFocused(false);
            const oldText = textOnFocusRef.current;
            const newText = text;
            if (oldText !== newText) {
              onUndoableAction?.({
                undo: async () => { await db.notes.update(note.id, { text: oldText }); },
                redo: async () => { await db.notes.update(note.id, { text: newText }); },
              });
            }
          }}
          className="w-full h-full bg-transparent resize-none outline-none text-slate-800 placeholder:text-slate-800/50 text-sm leading-relaxed"
          placeholder="Type a note..."
          autoFocus={!note.text}
        />
      </div>

      {/* Resize handles */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'r')}
        style={{ position: 'absolute', top: 8, right: 0, bottom: 8, width: 6, cursor: 'ew-resize' }}
      />
      <div
        onMouseDown={(e) => handleResizeStart(e, 'b')}
        style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 6, cursor: 'ns-resize' }}
      />
      <div
        onMouseDown={(e) => handleResizeStart(e, 'br')}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, cursor: 'nwse-resize' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: 0.3 }}>
          <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="6" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
