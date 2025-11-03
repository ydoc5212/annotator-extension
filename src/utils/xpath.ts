// Utility functions for XPath-based text position tracking

export function getXPath(node: Node): string {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return '/';
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentNode;
    if (!parent) return '';

    const siblings = Array.from(parent.childNodes);
    const index = siblings.filter(n => n.nodeType === Node.TEXT_NODE).indexOf(node);
    return `${getXPath(parent)}/text()[${index + 1}]`;
  }

  const parent = node.parentNode;
  if (!parent) return '';

  const element = node as Element;
  const siblings = Array.from(parent.children).filter(
    n => n.nodeName === element.nodeName
  );
  const index = siblings.indexOf(element);
  const tagName = element.nodeName.toLowerCase();

  return `${getXPath(parent)}/${tagName}[${index + 1}]`;
}

export function getNodeByXPath(xpath: string): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch (error) {
    console.error('Error evaluating XPath:', error);
    return null;
  }
}
