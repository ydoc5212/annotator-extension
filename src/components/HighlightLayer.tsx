import React, { useEffect } from 'react';
import { HighlightAnnotation } from '../types';

interface HighlightLayerProps {
  highlights: HighlightAnnotation[];
  onDelete?: (id: string) => void;
}

export const HighlightLayer: React.FC<HighlightLayerProps> = ({ highlights, onDelete }) => {
  useEffect(() => {
    // Remove any existing highlight spans
    const existingHighlights = document.querySelectorAll('[data-highlight-id]');
    existingHighlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
        parent.normalize();
      }
    });

    const highlightElements: HTMLElement[] = [];

    // Find and highlight text in the DOM
    const findAndHighlightText = (highlight: HighlightAnnotation) => {
      const searchText = highlight.textBefore + highlight.text + highlight.textAfter;
      const bodyText = document.body.innerText;

      // Find the occurrence of our text in the page
      const index = bodyText.indexOf(searchText);
      if (index === -1) {
        // Try just the highlighted text if context doesn't match
        const simpleIndex = bodyText.indexOf(highlight.text);
        if (simpleIndex === -1) return;
      }

      // Walk through all text nodes to find the match
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip our toolbar and existing highlights
            const parent = node.parentElement;
            if (parent?.closest('[data-annotator-toolbar]') ||
                parent?.closest('[data-highlight-id]') ||
                parent?.closest('script') ||
                parent?.closest('style')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      // Search through text nodes for our highlight
      for (const textNode of textNodes) {
        const text = textNode.textContent || '';
        const highlightIndex = text.indexOf(highlight.text);

        if (highlightIndex !== -1) {
          // Check context if available
          const before = text.substring(Math.max(0, highlightIndex - 50), highlightIndex);
          const after = text.substring(
            highlightIndex + highlight.text.length,
            Math.min(text.length, highlightIndex + highlight.text.length + 50)
          );

          // If context matches or we don't have context, apply highlight
          if (!highlight.textBefore || !highlight.textAfter ||
              (before.endsWith(highlight.textBefore) && after.startsWith(highlight.textAfter))) {

            try {
              const range = document.createRange();
              range.setStart(textNode, highlightIndex);
              range.setEnd(textNode, highlightIndex + highlight.text.length);

              const span = document.createElement('span');
              span.setAttribute('data-highlight-id', highlight.id);
              span.style.backgroundColor = highlight.color;
              span.style.opacity = '0.5';
              span.style.transition = 'opacity 0.2s';
              span.style.cursor = onDelete ? 'pointer' : 'default';

              if (onDelete) {
                span.onclick = (e) => {
                  e.stopPropagation();
                  onDelete(highlight.id);
                };
                span.onmouseenter = () => {
                  span.style.opacity = '0.7';
                };
                span.onmouseleave = () => {
                  span.style.opacity = '0.5';
                };
              }

              range.surroundContents(span);
              highlightElements.push(span);
              return; // Only highlight first occurrence
            } catch (e) {
              console.warn('Could not apply highlight:', e);
            }
          }
        }
      }
    };

    // Apply all highlights
    highlights.forEach(findAndHighlightText);

    // Cleanup
    return () => {
      highlightElements.forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.normalize();
        }
      });
    };
  }, [highlights, onDelete]);

  return null;
};
