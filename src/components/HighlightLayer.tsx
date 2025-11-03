import React, { useEffect } from 'react';
import { HighlightAnnotation } from '../types';
import { getNodeByXPath } from '../utils/xpath';

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

    // Restore each highlight using XPath
    highlights.forEach((highlight) => {
      try {
        // Get nodes from XPaths
        const startContainer = getNodeByXPath(highlight.startContainerXPath);
        const endContainer = getNodeByXPath(highlight.endContainerXPath);

        if (!startContainer || !endContainer) return;

        // Create Range from XPath data
        const range = document.createRange();
        range.setStart(startContainer, highlight.startOffset);
        range.setEnd(endContainer, highlight.endOffset);

        // Extract the contents and wrap each text node individually
        // This handles spans across multiple elements (links, formatting, etc.)
        const fragment = range.cloneContents();
        const walker = document.createTreeWalker(
          fragment,
          NodeFilter.SHOW_TEXT,
          null
        );

        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          textNodes.push(node as Text);
        }

        // Walk through the actual DOM range and wrap each text node
        const rangeWalker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
          }
        );

        const nodesToWrap: { node: Text; startOffset: number; endOffset: number }[] = [];
        while ((node = rangeWalker.nextNode())) {
          const textNode = node as Text;

          // Calculate the portion of this text node that's in the range
          let startOffset = 0;
          let endOffset = textNode.length;

          if (textNode === startContainer) {
            startOffset = highlight.startOffset;
          }
          if (textNode === endContainer) {
            endOffset = highlight.endOffset;
          }

          if (startOffset < endOffset) {
            nodesToWrap.push({ node: textNode, startOffset, endOffset });
          }
        }

        // Wrap each text node portion
        nodesToWrap.forEach(({ node, startOffset, endOffset }) => {
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

          // Split the text node and wrap the middle portion
          const textContent = node.textContent || '';

          if (startOffset > 0) {
            // Split before
            const beforeText = textContent.substring(0, startOffset);
            const beforeNode = document.createTextNode(beforeText);
            node.parentNode?.insertBefore(beforeNode, node);
          }

          // Create highlighted portion
          const highlightedText = textContent.substring(startOffset, endOffset);
          span.textContent = highlightedText;
          node.parentNode?.insertBefore(span, node);

          if (endOffset < textContent.length) {
            // Split after
            const afterText = textContent.substring(endOffset);
            const afterNode = document.createTextNode(afterText);
            node.parentNode?.insertBefore(afterNode, node);
          }

          // Remove original node
          node.parentNode?.removeChild(node);

          highlightElements.push(span);
        });

      } catch (error) {
        // Silent error
      }
    });

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
