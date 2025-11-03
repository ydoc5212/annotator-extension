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

### Option 1: Quick Install (Recommended)

1. **Download the extension**
   - Click the green "Code" button above → Download ZIP
   - Unzip the file to a folder you'll remember (like `Downloads/web-annotator`)

2. **Install in Chrome**
   - Open Chrome
   - Type `chrome://extensions` in the address bar and press Enter
   - Turn on "Developer mode" (toggle switch in the top right)
   - Click "Load unpacked" button
   - Select the `dist` folder inside the unzipped folder
   - Done! The extension icon appears in your toolbar

### Option 2: Build from Source (For Developers)

```bash
git clone https://github.com/YOUR_USERNAME/annotator-extension.git
cd annotator-extension
npm install
npm run build
```

Then follow step 2 from Option 1 above.

## How to Use

1. **Turn it on**: Click the extension icon in your Chrome toolbar → Click "Enable Annotator"
2. **Pick a tool**: Click the toolbar that appears (top-left of page)
   - 🖱️ Cursor = normal browsing
   - ✨ Highlighter = select text to highlight
   - 📝 Note = click anywhere to add a note
   - ✏️ Pencil = click and drag to draw
   - 🗑️ Eraser = click any annotation to delete it
3. **Change colors**: Click the colored circles
4. **Turn it off**: Click the extension icon → Click "Disable Annotator"

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
