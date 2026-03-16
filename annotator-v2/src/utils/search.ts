import { db, type StrokePath } from '../store/db';

export interface SearchResult {
  id: string;
  type: 'highlight' | 'note' | 'drawing';
  text: string;
  url: string;
  page: string; // hostname from URL
  color: string;
  timestamp: number;
  pageTitle?: string;
  favicon?: string;
}

const MAX_RESULTS = 50;

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Extract the highlighted text from the serializedRange JSON. */
function extractHighlightText(serialized: string): string {
  try {
    const data = JSON.parse(serialized);
    // New format: AnnotationSelector with quote.exact
    if (data?.quote?.exact) return data.quote.exact;
    // Fallback: just show a generic label
    return 'Highlighted text';
  } catch {
    return 'Highlighted text';
  }
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export type FilterType = 'highlight' | 'note' | 'drawing';

export async function searchAnnotations(
  query: string,
  filter?: FilterType | null,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const q = query.trim();

  // Fetch from all tables in parallel (unless filtered to one type)
  const [highlights, notes, strokes] = await Promise.all([
    filter && filter !== 'highlight' ? Promise.resolve([]) : db.highlights.toArray(),
    filter && filter !== 'note' ? Promise.resolve([]) : db.notes.toArray(),
    filter && filter !== 'drawing' ? Promise.resolve([]) : db.strokes.toArray(),
  ]);

  for (const h of highlights) {
    const text = extractHighlightText(h.serializedRange);
    if (q && !matchesQuery(text, q) && !matchesQuery(h.url, q)) continue;
    results.push({
      id: h.id,
      type: 'highlight',
      text,
      url: h.url,
      page: hostnameFromUrl(h.url),
      color: h.color,
      timestamp: h.timestamp,
    });
  }

  for (const n of notes) {
    if (q && !matchesQuery(n.text, q) && !matchesQuery(n.url, q)) continue;
    results.push({
      id: n.id,
      type: 'note',
      text: n.text || '(empty note)',
      url: n.url,
      page: hostnameFromUrl(n.url),
      color: n.color,
      timestamp: n.timestamp,
    });
  }

  // Group strokes by URL to show counts
  const strokesByUrl = new Map<string, StrokePath[]>();
  for (const s of strokes) {
    if (q && !matchesQuery(s.url, q) && !(s.pageTitle && matchesQuery(s.pageTitle, q))) continue;
    const existing = strokesByUrl.get(s.url);
    if (existing) existing.push(s);
    else strokesByUrl.set(s.url, [s]);
  }

  for (const [url, group] of strokesByUrl) {
    const latest = group.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    const title = latest.pageTitle || hostnameFromUrl(url);
    results.push({
      id: latest.id,
      type: 'drawing',
      text: `${group.length} stroke${group.length !== 1 ? 's' : ''} on ${title}`,
      url,
      page: hostnameFromUrl(url),
      color: latest.color,
      timestamp: latest.timestamp,
      pageTitle: latest.pageTitle,
      favicon: latest.favicon,
    });
  }

  // Sort by timestamp descending (most recent first)
  results.sort((a, b) => b.timestamp - a.timestamp);

  return results.slice(0, MAX_RESULTS);
}

/** Get total counts per type (unfiltered, for chip badges). */
export async function getAnnotationCounts(): Promise<{ highlight: number; note: number; drawing: number }> {
  const [h, n, d] = await Promise.all([
    db.highlights.count(),
    db.notes.count(),
    db.strokes.count(),
  ]);
  return { highlight: h, note: n, drawing: d };
}
