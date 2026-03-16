/**
 * Returns a CSS cursor string for the given tool.
 * Uses inline SVG data URIs — no external dependencies.
 */

interface CursorOptions {
  color?: string;
  eraserRadius?: number;
}

/** Encode a hex color for use inside SVG data URIs (# → %23). */
function encodeColor(hex: string): string {
  return hex.replace('#', '%23');
}

export function getCursorForTool(tool: string, options?: CursorOptions): string {
  const color = options?.color;
  const eraserRadius = options?.eraserRadius ?? 20;

  switch (tool) {
    case 'pointer':
      return 'default';

    case 'pen': {
      const fill = encodeColor(color ?? '#ef4444');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="4" fill="${fill}" stroke="white" stroke-width="2"/>
      </svg>`;
      return `url("data:image/svg+xml,${svg}") 6 6, crosshair`;
    }

    case 'note': {
      // Crosshair with plus sign (24px)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <line x1="12" y1="4" x2="12" y2="20" stroke="%23334155" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="4" y1="12" x2="20" y2="12" stroke="%23334155" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="2" fill="%23334155"/>
      </svg>`;
      return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
    }

    case 'highlighter': {
      const fill = encodeColor(color ?? '#fde047');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <rect x="2" y="8" width="20" height="8" rx="2" fill="${fill}" fill-opacity="0.7" stroke="%23ca8a04" stroke-width="1"/>
      </svg>`;
      return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
    }

    case 'eraser': {
      // Circle matching eraser radius, semi-transparent fill
      const size = eraserRadius * 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${eraserRadius}" cy="${eraserRadius}" r="${eraserRadius - 1}" fill="rgba(148,163,184,0.2)" stroke="%2364748b" stroke-width="1.5"/>
      </svg>`;
      return `url("data:image/svg+xml,${svg}") ${eraserRadius} ${eraserRadius}, crosshair`;
    }

    default:
      return 'default';
  }
}
