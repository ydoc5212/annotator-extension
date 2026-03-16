import Dexie, { type EntityTable } from 'dexie';

export interface Point {
  x: number;
  y: number;
}

export interface StrokePath {
  id: string;
  url: string; // The URL of the page this belongs to
  color: string;
  strokeWidth: number;
  points: Point[];
  timestamp: number;
  pageTitle: string;
  favicon: string;
  pageSection?: string;
}

export interface StickyNote {
  id: string;
  url: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  timestamp: number;
  pageTitle: string;
  favicon: string;
  pageSection?: string;
  pinned?: boolean;
}

export interface HighlightRange {
  id: string;
  url: string;
  serializedRange: string; // We'll need a robust way to serialize DOM ranges
  color: string;
  timestamp: number;
  pageTitle: string;
  favicon: string;
  pageSection?: string;
}

const db = new Dexie('WebAnnotatorDB') as Dexie & {
  strokes: EntityTable<StrokePath, 'id'>, 
  notes: EntityTable<StickyNote, 'id'>, 
  highlights: EntityTable<HighlightRange, 'id'>
};

db.version(1).stores({
  strokes: 'id, url', // index by id and url for quick retrieval
  notes: 'id, url',
  highlights: 'id, url'
});

db.version(2).stores({
  strokes: 'id, url',
  notes: 'id, url',
  highlights: 'id, url'
});

export { db };
