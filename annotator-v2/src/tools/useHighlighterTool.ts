import { useEffect } from "react";
import { db } from "../store/db";
import { useLiveQuery } from "dexie-react-hooks";
import { serializeRange, deserializeRange, isInsideShadowDOM } from "../utils/rangeSerializer";
import { addHighlight, deleteHighlight } from "../store/undoable";
import { getPageContext } from "../utils/pageContext";
import type { UndoAction } from "../hooks/useUndoRedo";

interface Props {
  isActive: boolean;
  color: string;
  onUndoableAction?: (action: UndoAction) => void;
}

const HIGHLIGHT_ATTR = 'data-annotator-highlight-id';

export default function useHighlighterTool({ isActive, color, onUndoableAction }: Props) {
  const url = window.location.href;

  const highlights = useLiveQuery(
    () => db.highlights.where({ url }).toArray(),
    [url]
  );

  // ── Rendering: inject <mark> elements into real page DOM ──
  useEffect(() => {
    // Always clean up ALL existing marks by attribute (robust against stale refs)
    cleanupAllMarks();

    if (!highlights || highlights.length === 0) return;

    // Phase 1: Deserialize ALL ranges while DOM is clean (no marks injected)
    const resolved: { id: string; color: string; nodes: { node: Text; startOffset: number; endOffset: number }[] }[] = [];

    for (const hl of highlights) {
      try {
        const range = deserializeRange(hl.serializedRange);
        if (!range) continue;

        const walker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) =>
              range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
          }
        );

        const nodes: { node: Text; startOffset: number; endOffset: number }[] = [];
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const textNode = n as Text;
          let sOff = 0;
          let eOff = textNode.length;
          if (textNode === range.startContainer) sOff = range.startOffset;
          if (textNode === range.endContainer) eOff = range.endOffset;
          if (sOff < eOff) nodes.push({ node: textNode, startOffset: sOff, endOffset: eOff });
        }

        if (nodes.length > 0) resolved.push({ id: hl.id, color: hl.color, nodes });
      } catch {
        // XPath no longer valid — skip
      }
    }

    // Phase 2: Flatten all wrapping ops and sort by reverse document position
    // so earlier DOM positions aren't invalidated by later wraps
    const ops: { node: Text; startOffset: number; endOffset: number; id: string; color: string }[] = [];
    for (const r of resolved) {
      for (const n of r.nodes) {
        ops.push({ ...n, id: r.id, color: r.color });
      }
    }

    // Reverse: process last-in-document first
    ops.reverse();

    // Phase 3: Apply all wrappings
    for (const { node: textNode, startOffset, endOffset, id, color: hlColor } of ops) {
      const parent = textNode.parentNode;
      if (!parent) continue;

      const fullText = textNode.textContent || '';
      if (startOffset >= fullText.length) continue;

      const mark = document.createElement('mark');
      mark.setAttribute(HIGHLIGHT_ATTR, id);
      mark.style.backgroundColor = hlColor;
      mark.style.color = 'inherit';
      mark.style.opacity = '0.5';
      mark.style.transition = 'opacity 0.2s';
      mark.style.cursor = 'pointer';
      mark.style.borderRadius = '2px';
      mark.style.padding = '0';
      mark.style.margin = '0';
      mark.textContent = fullText.substring(startOffset, endOffset);

      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteHighlight(id).then((action) => {
          onUndoableAction?.(action);
        });
      });
      mark.addEventListener('mouseenter', () => { mark.style.opacity = '0.7'; });
      mark.addEventListener('mouseleave', () => { mark.style.opacity = '0.5'; });

      const frag = document.createDocumentFragment();
      if (startOffset > 0) {
        frag.appendChild(document.createTextNode(fullText.substring(0, startOffset)));
      }
      frag.appendChild(mark);
      if (endOffset < fullText.length) {
        frag.appendChild(document.createTextNode(fullText.substring(endOffset)));
      }

      parent.replaceChild(frag, textNode);
    }

    return () => cleanupAllMarks();
  }, [highlights, onUndoableAction]);

  // ── Selection capture: only when highlighter is the active tool ──
  useEffect(() => {
    if (!isActive) return;

    let didMouseDown = false;

    const onMouseDown = (e: MouseEvent) => {
      // Skip if inside shadow DOM or existing highlight
      const target = e.target as HTMLElement;
      if (isInsideShadowDOM(target)) return;
      if (target.hasAttribute?.(HIGHLIGHT_ATTR)) return;

      didMouseDown = true;

      // Expand selection to the word under the cursor on mousedown
      // so dragging starts from a full word boundary
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        // If click landed in a text node, expand to word
        if (!sel.isCollapsed) return; // already dragging
        try {
          sel.modify('extend', 'forward', 'word');
          sel.modify('extend', 'backward', 'word');
          // That double-modify can overshoot; use a cleaner approach:
          // collapse back and re-expand
          sel.collapseToStart();
          sel.modify('move', 'backward', 'word');
          sel.modify('extend', 'forward', 'word');
        } catch {
          // sel.modify not supported in some contexts, ignore
        }
      });
    };

    const onMouseUp = () => {
      if (!didMouseDown) return;
      didMouseDown = false;

      // Small delay to let double-click selections finalize
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);

        // Don't capture selections inside our shadow DOM UI
        if (isInsideShadowDOM(range.startContainer) || isInsideShadowDOM(range.endContainer)) return;

        // Don't capture selections inside existing highlights
        if ((range.startContainer.parentElement as HTMLElement)?.hasAttribute?.(HIGHLIGHT_ATTR)) return;

        // Expand to word boundaries at both ends
        try {
          expandRangeToWordBoundaries(range);
        } catch {
          // ignore if expansion fails
        }

        const text = range.toString().trim();
        if (!text) return;

        const serialized = serializeRange(range);

        const rangeRect = range.getBoundingClientRect();
        const highlightY = rangeRect.top + window.scrollY;
        const context = getPageContext(highlightY);
        const highlightData = {
          id: crypto.randomUUID(),
          url,
          serializedRange: serialized,
          color,
          timestamp: Date.now(),
          ...context,
        };
        addHighlight(highlightData).then((action) => {
          onUndoableAction?.(action);
        });

        sel.removeAllRanges();
      });
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isActive, color, url, onUndoableAction]);
}

/** Expand a range's start and end to the nearest word boundaries. */
function expandRangeToWordBoundaries(range: Range) {
  const wordChar = /[\w\u00C0-\u024F\u1E00-\u1EFF]/; // letters, digits, accented chars

  // Expand start backward
  let startNode = range.startContainer;
  let startOffset = range.startOffset;
  if (startNode.nodeType === Node.TEXT_NODE) {
    const text = startNode.textContent || '';
    while (startOffset > 0 && wordChar.test(text[startOffset - 1])) {
      startOffset--;
    }
    range.setStart(startNode, startOffset);
  }

  // Expand end forward
  let endNode = range.endContainer;
  let endOffset = range.endOffset;
  if (endNode.nodeType === Node.TEXT_NODE) {
    const text = endNode.textContent || '';
    while (endOffset < text.length && wordChar.test(text[endOffset])) {
      endOffset++;
    }
    range.setEnd(endNode, endOffset);
  }
}

/** Remove ALL injected marks from the document and restore text nodes. */
function cleanupAllMarks() {
  const marks = document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}
