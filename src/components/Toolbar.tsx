import React, { useState } from 'react';
import { MousePointer, Highlighter, StickyNote, Pencil, Eraser, Trash2, PaintBucket } from 'lucide-react';
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

  const invertColor = (hex: string): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Convert to RGB
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Invert
    const invR = (255 - r).toString(16).padStart(2, '0');
    const invG = (255 - g).toString(16).padStart(2, '0');
    const invB = (255 - b).toString(16).padStart(2, '0');

    return `#${invR}${invG}${invB}`;
  };

  const renderTooltip = (text: string, toolName: string, shortcut?: string) => {
    if (hoveredTool !== toolName) return null;
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: '#1e293b',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {text}
        {shortcut && (
          <span style={{ marginLeft: '8px', opacity: 0.7 }}>
            ({shortcut})
          </span>
        )}
      </div>
    );
  };

  const renderNumberBadge = (number: string) => {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '3px',
          right: '3px',
          color: '#1e293b',
          fontSize: '10px',
          fontWeight: '700',
          lineHeight: '1',
          pointerEvents: 'none',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          textShadow: '0 0 2px rgba(255, 255, 255, 0.8)',
          opacity: 0.7,
        }}
      >
        {number}
      </div>
    );
  };

  const getToolColors = (tool: string) => {
    const colors: { [key: string]: { bg: string; color: string; shadow: string } } = {
      select: { bg: '#64748b', color: '#fff', shadow: 'rgba(100, 116, 139, 0.3)' },
      highlight: { bg: '#FFEB3B', color: '#424242', shadow: 'rgba(255, 235, 59, 0.3)' },
      note: { bg: '#FF9800', color: '#fff', shadow: 'rgba(255, 152, 0, 0.3)' },
      drawing: { bg: '#2196F3', color: '#fff', shadow: 'rgba(33, 150, 243, 0.3)' },
      eraser: { bg: '#E91E63', color: '#fff', shadow: 'rgba(233, 30, 99, 0.3)' },
      'paint-bucket': { bg: '#9C27B0', color: '#fff', shadow: 'rgba(156, 39, 176, 0.3)' },
    };
    return colors[tool] || colors.select;
  };

  const buttonStyle = (tool: string) => {
    const toolColors = getToolColors(tool);
    return {
      padding: '10px',
      backgroundColor: currentTool === tool ? toolColors.bg : '#ffffff',
      color: currentTool === tool ? toolColors.color : '#64748b',
      border: currentTool === tool ? 'none' : '1.5px solid #e2e8f0',
      borderRadius: '10px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: currentTool === tool ? `0 4px 12px ${toolColors.shadow}` : 'none',
    };
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, tool: string, isEnter: boolean) => {
    setHoveredTool(isEnter ? tool : null);
    if (currentTool !== tool) {
      const toolColors = getToolColors(tool);
      if (isEnter) {
        e.currentTarget.style.backgroundColor = '#f8fafc';
        e.currentTarget.style.borderColor = toolColors.bg;
        e.currentTarget.style.boxShadow = `0 2px 8px ${toolColors.shadow}`;
      } else {
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#ffffff',
        border: 'none',
        borderRadius: '16px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 2147483647,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        pointerEvents: 'auto',
        backdropFilter: 'blur(10px)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onToolChange('select')}
            style={buttonStyle('select')}
            onMouseEnter={(e) => handleButtonHover(e, 'select', true)}
            onMouseLeave={(e) => handleButtonHover(e, 'select', false)}
          >
            <MousePointer size={18} />
            {renderNumberBadge('1')}
            {renderTooltip('Select/Navigate', 'select', '1')}
          </button>
          <button
            onClick={() => onToolChange('highlight')}
            style={buttonStyle('highlight')}
            onMouseEnter={(e) => handleButtonHover(e, 'highlight', true)}
            onMouseLeave={(e) => handleButtonHover(e, 'highlight', false)}
          >
            <Highlighter size={18} />
            {renderNumberBadge('2')}
            {renderTooltip('Highlight', 'highlight', '2')}
          </button>
          <button
            onClick={() => onToolChange('note')}
            style={buttonStyle('note')}
            onMouseEnter={(e) => handleButtonHover(e, 'note', true)}
            onMouseLeave={(e) => handleButtonHover(e, 'note', false)}
          >
            <StickyNote size={18} />
            {renderNumberBadge('3')}
            {renderTooltip('Add Note', 'note', '3')}
          </button>
          <button
            onClick={() => onToolChange('drawing')}
            style={buttonStyle('drawing')}
            onMouseEnter={(e) => handleButtonHover(e, 'drawing', true)}
            onMouseLeave={(e) => handleButtonHover(e, 'drawing', false)}
          >
            <Pencil size={18} />
            {renderNumberBadge('4')}
            {renderTooltip('Draw', 'drawing', '4')}
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            style={buttonStyle('eraser')}
            onMouseEnter={(e) => handleButtonHover(e, 'eraser', true)}
            onMouseLeave={(e) => handleButtonHover(e, 'eraser', false)}
          >
            <Eraser size={18} />
            {renderNumberBadge('5')}
            {renderTooltip('Eraser', 'eraser', '5')}
          </button>
          <button
            onClick={() => onToolChange('paint-bucket')}
            style={buttonStyle('paint-bucket')}
            onMouseEnter={(e) => handleButtonHover(e, 'paint-bucket', true)}
            onMouseLeave={(e) => handleButtonHover(e, 'paint-bucket', false)}
          >
            <PaintBucket size={18} />
            {renderNumberBadge('6')}
            {renderTooltip('Paint Bucket', 'paint-bucket', '6')}
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 0',
          borderTop: '1.5px solid #e2e8f0',
          alignItems: 'stretch',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 28px)',
            gap: '6px',
          }}>
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: color,
                  border: currentColor === color ? `3px solid ${invertColor(color)}` : '2px solid #e2e8f0',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  padding: 0,
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: currentColor === color ? `0 4px 12px ${invertColor(color)}40` : '0 2px 4px rgba(0,0,0,0.06)',
                }}
                onMouseEnter={(e) => {
                  setHoveredTool(`color-${color}`);
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  setHoveredTool(null);
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {renderTooltip(color.toUpperCase(), `color-${color}`)}
              </button>
            ))}
          </div>
          <button
            onClick={onClearAll}
            style={{
              width: '32px',
              backgroundColor: '#ffffff',
              color: '#64748b',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '500',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 4px',
              position: 'relative',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.borderColor = '#fecaca';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <Trash2 size={14} />
            <div style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
              letterSpacing: '-1px',
            }}>CLEAR</div>
          </button>
        </div>
      </div>
    </div>
  );
};
