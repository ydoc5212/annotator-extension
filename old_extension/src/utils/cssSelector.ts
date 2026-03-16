/**
 * Generate a unique CSS selector for a given element
 * Similar to XPath but using CSS selector syntax
 */
export function getCssSelector(element: Element): string {
  // Use ID if it exists and is valid
  if (element.id && /^[a-zA-Z][\w-]*$/.test(element.id)) {
    return `#${CSS.escape(element.id)}`;
  }

  const path: string[] = [];
  let current: Element | null = element;
  let pathLength = 0;
  const MAX_PATH_LENGTH = 10; // Prevent extremely long selectors

  while (current && current !== document.body && pathLength < MAX_PATH_LENGTH) {
    let selector = current.tagName.toLowerCase();

    // Try to use a simple, stable class if available
    if (current.className && typeof current.className === 'string') {
      const classes = Array.from(current.classList)
        .filter(cls =>
          !cls.startsWith('annotator-') && // Skip our own classes
          !cls.match(/^_/) && // Skip generated classes (like _abc123)
          cls.length < 30 // Skip very long class names
        )
        .slice(0, 2); // Only use first 2 classes for brevity

      if (classes.length > 0) {
        selector += '.' + classes.map(cls => CSS.escape(cls)).join('.');
      }
    }

    // Add nth-of-type for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
    pathLength++;
  }

  return path.join(' > ');
}

/**
 * Get an element by CSS selector
 */
export function getElementBySelector(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch (e) {
    return null;
  }
}

/**
 * Determine if an element should be colored as text or background
 */
export function getColorModificationType(element: Element): 'text' | 'background' {
  const tagName = element.tagName.toLowerCase();

  // Text elements
  const textElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'td', 'th', 'label', 'button', 'code', 'pre', 'blockquote'];

  if (textElements.includes(tagName)) {
    return 'text';
  }

  // Background elements
  const backgroundElements = ['div', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'main', 'body'];

  if (backgroundElements.includes(tagName)) {
    return 'background';
  }

  // Default: check if element has direct text content
  const hasDirectText = Array.from(element.childNodes).some(
    node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
  );

  return hasDirectText ? 'text' : 'background';
}

/**
 * Check if an element should be ignored for color modification
 */
export function shouldIgnoreElement(element: Element): boolean {
  // Ignore our own toolbar and annotation elements
  if (element.closest('[data-annotator-toolbar]') ||
      element.closest('[data-note-id]') ||
      element.closest('[data-highlight-id]')) {
    return true;
  }

  // Ignore script, style, meta tags
  const tagName = element.tagName.toLowerCase();
  if (['script', 'style', 'meta', 'link', 'noscript'].includes(tagName)) {
    return true;
  }

  // Ignore input elements to prevent breaking forms
  if (['input', 'select', 'textarea'].includes(tagName)) {
    return true;
  }

  return false;
}
