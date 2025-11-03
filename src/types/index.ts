export type AnnotationType = 'highlight' | 'note' | 'drawing';

export type ToolType = AnnotationType | 'eraser' | 'select' | 'paint-bucket';

export interface Position {
  x: number;
  y: number;
}

export interface HighlightAnnotation {
  id: string;
  type: 'highlight';
  color: string;
  text: string;
  // XPath-based Range storage for accurate restoration
  startContainerXPath: string;
  startOffset: number;
  endContainerXPath: string;
  endOffset: number;
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
