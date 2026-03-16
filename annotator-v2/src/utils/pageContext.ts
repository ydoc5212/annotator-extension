/**
 * Captures page context (title, favicon, nearest heading) for annotation metadata.
 */
export function getPageContext(y?: number): { pageTitle: string; favicon: string; pageSection?: string } {
  const pageTitle = document.title;

  // Favicon: check for link[rel*="icon"], fallback to origin/favicon.ico
  const iconLink = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  const favicon = iconLink?.href || `${window.location.origin}/favicon.ico`;

  // Page section: find nearest heading above the given y position
  let pageSection: string | undefined;
  if (y !== undefined) {
    const headings = document.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6');
    let closestDist = Infinity;
    let closestText: string | undefined;

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      const headingY = rect.top + window.scrollY;
      if (headingY <= y) {
        const dist = y - headingY;
        if (dist < closestDist) {
          closestDist = dist;
          closestText = heading.textContent?.trim();
        }
      }
    });

    if (closestText) {
      pageSection = closestText;
    }
  }

  return { pageTitle, favicon, pageSection };
}
