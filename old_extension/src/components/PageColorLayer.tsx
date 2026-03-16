import React, { useEffect, useRef } from 'react';
import { PageColorAnnotation } from '../types';
import { getNodeByXPath } from '../utils/xpath';

interface PageColorLayerProps {
  pageColors: PageColorAnnotation[];
}

interface ColorState {
  element: HTMLElement;
  color: string;
  property: string;
  originalColor: string;
  originalImportant: boolean;
}

export const PageColorLayer: React.FC<PageColorLayerProps> = ({ pageColors }) => {
  // Cache applied colors to avoid re-applying on every render
  const appliedColorsRef = useRef(new Map<string, ColorState>());
  // Cache XPath->Element lookups to avoid repeated document.evaluate calls
  const elementCacheRef = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const appliedColors = appliedColorsRef.current;
    const elementCache = elementCacheRef.current;

    // Create a set of current XPaths for efficient lookup
    const currentXPaths = new Set(pageColors.map(pc => pc.xpath));
    const currentColorsMap = new Map(pageColors.map(pc => [pc.xpath, pc]));

    // STEP 1: Remove colors that are no longer in the list
    for (const [xpath, colorState] of appliedColors.entries()) {
      if (!currentXPaths.has(xpath)) {
        const { element, property, originalColor, originalImportant } = colorState;

        // Restore original style
        if (element && element.isConnected) {
          if (originalColor) {
            element.style.setProperty(property, originalColor, originalImportant ? 'important' : '');
          } else {
            element.style.removeProperty(property);
          }
          element.removeAttribute('data-page-color-id');
        }

        appliedColors.delete(xpath);
        elementCache.delete(xpath);
      }
    }

    // STEP 2: Apply new or changed colors (incremental updates only)
    pageColors.forEach((pageColor) => {
      const cached = appliedColors.get(pageColor.xpath);

      // Skip if already applied with same color and element still exists
      if (cached && cached.color === pageColor.color && cached.element.isConnected) {
        return;
      }

      try {
        // Get element (use cache if available and still connected)
        let element = elementCache.get(pageColor.xpath);
        if (!element || !element.isConnected) {
          // Try fast O(1) querySelector lookup first
          if (pageColor.stableId) {
            const fastElement = document.querySelector(`[data-annotator-element-id="${pageColor.stableId}"]`);
            if (fastElement instanceof HTMLElement) {
              element = fastElement;
              elementCache.set(pageColor.xpath, element);
            }
          }

          // Fallback to XPath if querySelector failed
          if (!element || !element.isConnected) {
            const node = getNodeByXPath(pageColor.xpath);
            if (!node || !(node instanceof HTMLElement)) {
              // Cleanup stale cache entries
              elementCache.delete(pageColor.xpath);
              appliedColors.delete(pageColor.xpath);
              return;
            }
            element = node;
            elementCache.set(pageColor.xpath, element);

            // Re-inject stable ID if we found it via XPath (for future fast lookups)
            if (pageColor.stableId) {
              element.setAttribute('data-annotator-element-id', pageColor.stableId);
            }
          }
        }

        const property = pageColor.modificationType === 'text' ? 'color' : 'backgroundColor';

        // Store original value only if not already cached
        let originalColor = cached?.originalColor;
        let originalImportant = cached?.originalImportant;

        if (!cached) {
          originalColor = element.style.getPropertyValue(property);
          originalImportant = element.style.getPropertyPriority(property) === 'important';
        }

        // Apply color with !important to override site CSS
        element.style.setProperty(property, pageColor.color, 'important');
        element.setAttribute('data-page-color-id', pageColor.id);

        // Update cache
        appliedColors.set(pageColor.xpath, {
          element,
          color: pageColor.color,
          property,
          originalColor: originalColor || '',
          originalImportant: originalImportant || false,
        });

      } catch (error) {
        // Silent error - element may have been removed from DOM
        elementCache.delete(pageColor.xpath);
        appliedColors.delete(pageColor.xpath);
      }
    });

    // Cleanup on unmount: restore ALL colors
    return () => {
      for (const [xpath, colorState] of appliedColors.entries()) {
        const { element, property, originalColor, originalImportant } = colorState;
        if (element && element.isConnected) {
          if (originalColor) {
            element.style.setProperty(property, originalColor, originalImportant ? 'important' : '');
          } else {
            element.style.removeProperty(property);
          }
          element.removeAttribute('data-page-color-id');
        }
      }
      appliedColors.clear();
      elementCache.clear();
    };
  }, [pageColors]);

  return null;
};
