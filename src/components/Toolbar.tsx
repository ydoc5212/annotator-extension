import React, { useState } from 'react';
import { MousePointer, Highlighter, StickyNote, Pencil, Eraser, Trash2 } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  onClearAll: () => void;
}

const COLORS = [
  '#FFEB3B', // Yellow
  '#4CAF50', // Green
  '#FF6B9D', // Pink
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#8BC34A', // Light Green
  '#FF5722', // Deep Orange
  '#673AB7', // Deep Purple
  '#000000', // Black
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  currentColor,
  onColorChange,
  onClearAll,
}) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const renderTooltip = (text: string, toolName: string) => {
    if (hoveredTool !== toolName) return null;
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: '#333',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {text}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#fff',
        border: '2px solid #333',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 2147483647,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onToolChange('select')}
            onMouseEnter={() => setHoveredTool('select')}
            onMouseLeave={() => setHoveredTool(null)}
            style={{
              padding: '8px',
              backgroundColor: currentTool === 'select' ? '#2196F3' : '#f0f0f0',
              color: currentTool === 'select' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <MousePointer size={18} />
            {renderTooltip('Select/Navigate', 'select')}
          </button>
          <button
            onClick={() => onToolChange('highlight')}
            onMouseEnter={() => setHoveredTool('highlight')}
            onMouseLeave={() => setHoveredTool(null)}
            style={{
              padding: '8px',
              backgroundColor: currentTool === 'highlight' ? '#2196F3' : '#f0f0f0',
              color: currentTool === 'highlight' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Highlighter size={18} />
            {renderTooltip('Highlight', 'highlight')}
          </button>
          <button
            onClick={() => onToolChange('note')}
            onMouseEnter={() => setHoveredTool('note')}
            onMouseLeave={() => setHoveredTool(null)}
            style={{
              padding: '8px',
              backgroundColor: currentTool === 'note' ? '#2196F3' : '#f0f0f0',
              color: currentTool === 'note' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <StickyNote size={18} />
            {renderTooltip('Add Note', 'note')}
          </button>
          <button
            onClick={() => onToolChange('drawing')}
            onMouseEnter={() => setHoveredTool('drawing')}
            onMouseLeave={() => setHoveredTool(null)}
            style={{
              padding: '8px',
              backgroundColor: currentTool === 'drawing' ? '#2196F3' : '#f0f0f0',
              color: currentTool === 'drawing' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Pencil size={18} />
            {renderTooltip('Draw', 'drawing')}
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            onMouseEnter={() => setHoveredTool('eraser')}
            onMouseLeave={() => setHoveredTool(null)}
            style={{
              padding: '8px',
              backgroundColor: currentTool === 'eraser' ? '#2196F3' : '#f0f0f0',
              color: currentTool === 'eraser' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Eraser size={18} />
            {renderTooltip('Eraser', 'eraser')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '200px' }}>
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              onMouseEnter={() => setHoveredTool(`color-${color}`)}
              onMouseLeave={() => setHoveredTool(null)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                border: currentColor === color ? '3px solid #333' : '1px solid #ccc',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                position: 'relative',
              }}
            >
              {renderTooltip(`Color`, `color-${color}`)}
            </button>
          ))}
        </div>

        <button
          onClick={onClearAll}
          onMouseEnter={() => setHoveredTool('clear')}
          onMouseLeave={() => setHoveredTool(null)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            position: 'relative',
          }}
        >
          <Trash2 size={14} />
          Clear All
          {renderTooltip('Remove all annotations on this page', 'clear')}
        </button>
      </div>
    </div>
  );
};
