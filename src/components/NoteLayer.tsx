import React, { useState } from 'react';
import { NoteAnnotation } from '../types';

interface NoteLayerProps {
  notes: NoteAnnotation[];
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, content: string) => void;
}

export const NoteLayer: React.FC<NoteLayerProps> = ({ notes, onDelete, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (note: NoteAnnotation) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = (id: string) => {
    onUpdate?.(id, editContent);
    setEditingId(null);
  };

  return (
    <>
      {notes.map((note) => (
        <div
          key={note.id}
          style={{
            position: 'absolute',
            left: `${note.position.x}px`,
            top: `${note.position.y}px`,
            backgroundColor: note.color,
            border: '2px solid #333',
            borderRadius: '4px',
            padding: '8px',
            minWidth: '150px',
            maxWidth: '250px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            cursor: 'move',
          }}
        >
          {editingId === note.id ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '4px',
                  fontSize: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button
                  onClick={() => handleSaveEdit(note.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#4CAF50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#999',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#333',
                  wordWrap: 'break-word',
                  marginBottom: '4px',
                }}
              >
                {note.content}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => handleStartEdit(note)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    backgroundColor: '#2196F3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(note.id)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};
