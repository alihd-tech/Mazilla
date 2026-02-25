# Mazilla Quick Start Guide

## Installation (2 minutes)

1. Download this folder: `public/extension/`
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `extension` folder
6. Done! Look for the Mazilla icon in your toolbar

## Feature Overview

### 🟢 Autoclick — Click buttons at intervals

**Perfect for**: Loading more content, auto-refreshing, testing workflows

```
1. Click Mazilla icon → Open sidebar
2. Click "Pick Element" → Click the button you want to autoclick
3. Set interval (e.g., 2 seconds) and optional max clicks
4. Click "Start" and watch it go
5. Click "Save current" to save for later
```

**Pro tips**:
- Use presets for quick selection (0.5s to 30s)
- Set max clicks to avoid infinite loops
- Stats show real-time progress
- Click "Stop" anytime to pause

---

### 📋 Form Filler — Save & refill forms instantly

**Perfect for**: Repetitive forms, registrations, surveys, feedback

```
1. Go to any page with a form
2. Click Mazilla → Go to "Forms" tab
3. Click "Capture Form" → All fields are detected and saved
4. Name your form template
5. On another page, click the play button to fill matching fields instantly
```

**Pro tips**:
- Works across different pages with similar forms
- Automatically saves field values and types
- One-click filling saves tons of time
- Delete old templates anytime

---

### 🎬 Macro Recorder — Record & replay click sequences

**Perfect for**: Multi-step workflows, complex interactions, testing

```
1. Click Mazilla → Go to "Macros" tab
2. Click "Start Recording"
3. Click and interact with the page (every click is captured)
4. Click "Stop Recording" when done
5. Name your macro
6. Click the play button to replay the entire sequence
```

**Pro tips**:
- Each click is logged with a timeline
- Playback has 300ms delays between clicks for stability
- Perfect for workflows that span multiple pages
- Re-record anytime if something changes

---

## Common Workflows

### Auto-refresh a page every 5 seconds
1. Pick Element → Click the "Refresh" or "Load more" button
2. Select 5s preset
3. Optionally set max clicks
4. Click Start

### Fill a survey form quickly
1. Go to the survey page
2. Fill it out once manually
3. Capture Form
4. Go to another instance of the survey
5. Click Fill Form — it's done in seconds

### Automate a multi-step login + dashboard workflow
1. Record your entire workflow: login → navigate → perform actions
2. Save as a macro
3. Replay anytime to automate the whole process

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension doesn't show | Make sure Developer mode is on in extensions page |
| Can't pick elements | Refresh page and try again; extension needs to inject |
| Form fill doesn't work | Try re-capturing the form on that specific page |
| Macro not replaying | Elements may have moved; re-record on target page |
| Data disappeared | Check browser isn't in Private/Incognito mode |

---

## Data & Privacy

✅ **100% Local** — Everything stays in your browser  
✅ **Never sent** — No external servers or analytics  
✅ **Always safe** — No malware or tracking  
✅ **You own it** — Modify and use freely  

---

## Keyboard Shortcuts

- **Chrome**: Ctrl+Shift+B then click toolbar icon to pin Mazilla
- **Mac**: Cmd+Shift+B then click toolbar icon to pin Mazilla
- **Edge**: Similar to Chrome

---

## Tips & Tricks

1. **Stable selectors**: Mazilla assigns unique IDs to picked elements, making them very stable
2. **Complex forms**: If form structures differ, re-capture on the target page
3. **Timing**: Use longer intervals (5-10s) for pages that load slowly
4. **Testing**: Macros are perfect for testing workflows repeatedly
5. **Organization**: Name your jobs, forms, and macros clearly

---

## Questions?

Check `README.md` in the extension folder for detailed documentation.

---

**Mazilla v1.0** — Click less, automate more! 🚀
