export type AnnotationType = 'highlight' | 'note' | 'drawing';

export type ToolType = AnnotationType | 'eraser' | 'select';

export interface Position {
  x: number;
  y: number;
}

export interface HighlightAnnotation {
  id: string;
  type: 'highlight';
  color: string;
  text: string;
  // Store the text context around the highlight for better matching
  textBefore: string;
  textAfter: string;
  timestamp: number;
}

export interface NoteAnnotation {
  id: string;
  type: 'note';
  content: string;
  position: Position;
  color: string;
  timestamp: number;
}

export interface DrawingAnnotation {
  id: string;
  type: 'drawing';
  paths: Position[][];
  color: string;
  strokeWidth: number;
  timestamp: number;
}

export type Annotation = HighlightAnnotation | NoteAnnotation | DrawingAnnotation;

export interface AnnotationStorage {
  [url: string]: Annotation[];
}
