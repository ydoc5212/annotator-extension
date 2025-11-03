# Web Annotator Chrome Extension

Annotate web pages like a PDF - highlight text, add notes, and draw on any webpage.

## Features

- **Highlight** text with 12 colors
- **Add sticky notes** anywhere on the page
- **Draw** freehand with a pen tool
- **Erase** individual annotations or clear all
- **Auto-saves** - annotations persist when you return to the page
- **Privacy-first** - all data stays in your browser

## Installation

### Easy Install (No coding required!)

1. **Download**: Go to [Releases](https://github.com/ydoc5212/annotator-extension/releases) and download `web-annotator-v1.0.0.zip`
2. **Unzip** the file
3. **Install in Chrome**:
   - Open Chrome and type `chrome://extensions` in the address bar
   - Turn ON "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the unzipped folder
   - Done! The extension icon appears in your toolbar

### Build from Source (For Developers)

```bash
git clone https://github.com/ydoc5212/annotator-extension.git
cd annotator-extension
npm install
npm run build
```

## How to Use

1. **Toggle on/off**: Click the extension icon in your Chrome toolbar (toggles annotator)
2. **Pick a tool**: Use the toolbar that appears (top-left of page)
   - 🖱️ Cursor = normal browsing
   - ✨ Highlighter = select text to highlight
   - 📝 Note = click anywhere to add a note
   - ✏️ Pencil = click and drag to draw
   - 🗑️ Eraser = click any annotation to delete it
3. **Change colors**: Click the colored circles

## Troubleshooting

**Extension icon doesn't appear?**
- Refresh Chrome after installation
- Check that "Developer mode" is ON in `chrome://extensions`

**Toolbar doesn't show up?**
- Click the extension icon and make sure it says "Currently: ON"
- Refresh the page

**Annotations disappeared?**
- They're saved per-URL. Make sure you're on the exact same page
- Clear All removes everything - this can't be undone

## Tech Stack

React + TypeScript + Vite + Chrome Extension Manifest V3

## License

ISC

---

Built with [Claude Code](https://claude.com/claude-code)
