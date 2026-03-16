import { db, type StrokePath, type StickyNote, type HighlightRange, type Point } from './db';
import type { UndoAction } from '../hooks/useUndoRedo';

/** Add a stroke and return an UndoAction to reverse it. */
export async function addStroke(data: StrokePath): Promise<UndoAction> {
  await db.strokes.add(data);
  return {
    undo: async () => { await db.strokes.delete(data.id); },
    redo: async () => { await db.strokes.add(data); },
  };
}

/** Delete strokes by ids and return an UndoAction to restore them. */
export async function deleteStrokes(ids: string[]): Promise<UndoAction> {
  // Snapshot before deleting
  const snapshots = await db.strokes.bulkGet(ids);
  const existing = snapshots.filter((s): s is StrokePath => s !== undefined);
  await db.strokes.bulkDelete(ids);
  return {
    undo: async () => { await db.strokes.bulkAdd(existing); },
    redo: async () => { await db.strokes.bulkDelete(existing.map(s => s.id)); },
  };
}

/** Add a note and return an UndoAction to reverse it. */
export async function addNote(data: StickyNote): Promise<UndoAction> {
  await db.notes.add(data);
  return {
    undo: async () => { await db.notes.delete(data.id); },
    redo: async () => { await db.notes.add(data); },
  };
}

/** Delete a note by id and return an UndoAction to restore it. */
export async function deleteNote(id: string): Promise<UndoAction> {
  const snapshot = await db.notes.get(id);
  await db.notes.delete(id);
  return {
    undo: async () => { if (snapshot) await db.notes.add(snapshot); },
    redo: async () => { await db.notes.delete(id); },
  };
}

/** Update a note and return an UndoAction to restore previous values. */
export async function updateNote(id: string, changes: Partial<StickyNote>): Promise<UndoAction> {
  const snapshot = await db.notes.get(id);
  await db.notes.update(id, changes);
  // Build the reverse changes from the snapshot
  const reverseChanges: Partial<StickyNote> = {};
  if (snapshot) {
    for (const key of Object.keys(changes) as (keyof StickyNote)[]) {
      (reverseChanges as Record<string, unknown>)[key] = snapshot[key];
    }
  }
  return {
    undo: async () => { await db.notes.update(id, reverseChanges); },
    redo: async () => { await db.notes.update(id, changes); },
  };
}

/** Add a highlight and return an UndoAction to reverse it. */
export async function addHighlight(data: HighlightRange): Promise<UndoAction> {
  await db.highlights.add(data);
  return {
    undo: async () => { await db.highlights.delete(data.id); },
    redo: async () => { await db.highlights.add(data); },
  };
}

/** Delete a highlight by id and return an UndoAction to restore it. */
export async function deleteHighlight(id: string): Promise<UndoAction> {
  const snapshot = await db.highlights.get(id);
  await db.highlights.delete(id);
  return {
    undo: async () => { if (snapshot) await db.highlights.add(snapshot); },
    redo: async () => { await db.highlights.delete(id); },
  };
}

/** Move a stroke (update its points) and return an UndoAction to restore previous points. */
export async function moveStroke(id: string, newPoints: Point[]): Promise<UndoAction> {
  const snapshot = await db.strokes.get(id);
  const oldPoints = snapshot?.points ?? [];
  await db.strokes.update(id, { points: newPoints });
  return {
    undo: async () => { await db.strokes.update(id, { points: oldPoints }); },
    redo: async () => { await db.strokes.update(id, { points: newPoints }); },
  };
}

/** Clear all annotations for a URL and return an UndoAction to restore them. */
export async function clearAll(url: string): Promise<UndoAction> {
  const [strokeSnaps, noteSnaps, highlightSnaps] = await Promise.all([
    db.strokes.where({ url }).toArray(),
    db.notes.where({ url }).toArray(),
    db.highlights.where({ url }).toArray(),
  ]);
  await Promise.all([
    db.strokes.where({ url }).delete(),
    db.notes.where({ url }).delete(),
    db.highlights.where({ url }).delete(),
  ]);
  return {
    undo: async () => {
      await Promise.all([
        strokeSnaps.length > 0 ? db.strokes.bulkAdd(strokeSnaps) : Promise.resolve(),
        noteSnaps.length > 0 ? db.notes.bulkAdd(noteSnaps) : Promise.resolve(),
        highlightSnaps.length > 0 ? db.highlights.bulkAdd(highlightSnaps) : Promise.resolve(),
      ]);
    },
    redo: async () => {
      await Promise.all([
        db.strokes.where({ url }).delete(),
        db.notes.where({ url }).delete(),
        db.highlights.where({ url }).delete(),
      ]);
    },
  };
}
