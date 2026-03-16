import { db, type StrokePath, type StickyNote, type HighlightRange } from '../store/db';

interface ExportOptions {
  url?: string;
  types?: string[]; // 'strokes' | 'notes' | 'highlights'
}

interface PageGroup {
  url: string;
  pageTitle?: string;
  favicon?: string;
  strokes: StrokePath[];
  notes: StickyNote[];
  highlights: HighlightRange[];
}

export async function exportAsMarkdown(options?: ExportOptions): Promise<string> {
  const types = options?.types ?? ['strokes', 'notes', 'highlights'];

  const [strokes, notes, highlights] = await Promise.all([
    types.includes('strokes')
      ? (options?.url ? db.strokes.where('url').equals(options.url).toArray() : db.strokes.toArray())
      : Promise.resolve([]),
    types.includes('notes')
      ? (options?.url ? db.notes.where('url').equals(options.url).toArray() : db.notes.toArray())
      : Promise.resolve([]),
    types.includes('highlights')
      ? (options?.url ? db.highlights.where('url').equals(options.url).toArray() : db.highlights.toArray())
      : Promise.resolve([]),
  ]);

  // Group by URL
  const groupMap = new Map<string, PageGroup>();

  const getGroup = (url: string, pageTitle?: string, favicon?: string): PageGroup => {
    let group = groupMap.get(url);
    if (!group) {
      group = { url, strokes: [], notes: [], highlights: [] };
      groupMap.set(url, group);
    }
    if (pageTitle) group.pageTitle = pageTitle;
    if (favicon) group.favicon = favicon;
    return group;
  };

  for (const s of strokes) getGroup(s.url, s.pageTitle, s.favicon).strokes.push(s);
  for (const n of notes) getGroup(n.url, n.pageTitle, n.favicon).notes.push(n);
  for (const h of highlights) getGroup(h.url, h.pageTitle, h.favicon).highlights.push(h);

  if (groupMap.size === 0) {
    return '# My Annotations\n\nNo annotations found.\n';
  }

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const lines: string[] = [
    '# My Annotations',
    `Exported on ${date}`,
    '',
  ];

  // Sort pages by most recent annotation
  const pages = [...groupMap.values()].sort((a, b) => {
    const latestTs = (g: PageGroup) => Math.max(
      ...g.strokes.map(s => s.timestamp),
      ...g.notes.map(n => n.timestamp),
      ...g.highlights.map(h => h.timestamp),
      0,
    );
    return latestTs(b) - latestTs(a);
  });

  for (const page of pages) {
    const title = page.pageTitle || page.url;
    lines.push(`## ${title}`);
    if (page.pageTitle) lines.push(`${page.url}`);
    lines.push('');

    if (page.highlights.length > 0) {
      lines.push('### Highlights');
      for (const h of page.highlights.sort((a, b) => a.timestamp - b.timestamp)) {
        const section = h.pageSection ? ` (${h.pageSection})` : '';
        lines.push(`- Highlight \u2014 *${h.color}*${section}`);
      }
      lines.push('');
    }

    if (page.notes.length > 0) {
      lines.push('### Notes');
      for (const n of page.notes.sort((a, b) => a.timestamp - b.timestamp)) {
        const text = n.text || '(empty note)';
        lines.push(`- ${text} \u2014 *position (${Math.round(n.x)}, ${Math.round(n.y)})*`);
      }
      lines.push('');
    }

    if (page.strokes.length > 0) {
      lines.push('### Drawings');
      for (const s of page.strokes.sort((a, b) => a.timestamp - b.timestamp)) {
        lines.push(`- Drawing with ${s.points.length} points \u2014 *${s.color}, width ${s.strokeWidth}*`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadMarkdown(content: string, filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const name = filename ?? `annotations-${date}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

export async function exportAndDownload(options?: ExportOptions): Promise<void> {
  const md = await exportAsMarkdown(options);
  downloadMarkdown(md);
}
