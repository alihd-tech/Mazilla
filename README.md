# Mazilla — Browser Extension for Page & Form Automation

A powerful browser extension that lives in your sidebar and automates repetitive tasks: click buttons at intervals, capture and fill forms, and record & replay action sequences.

## Features

### ⚡ Autoclick
Pick any button or element on a webpage and click it automatically at customizable intervals (milliseconds to minutes).

- **Visual element picker** with crosshair and hover overlay
- **Flexible intervals**: Presets from 0.5s to 30s, or set custom values
- **Optional max clicks**: Stop after a certain number of clicks
- **Live stats**: Real-time click counter, elapsed time, and countdown to next click
- **Save as jobs**: Persist your autoclick configurations for instant replay later, even after browser restart

### 📋 Form Filler
Capture form fields and their values, then instantly fill them on any matching page with a single click.

- **Auto-detection**: Automatically finds all input, textarea, and select fields
- **Save templates**: Store form data as reusable templates
- **One-click filling**: Fill all matching fields on other pages instantly
- **Perfect for repetitive forms**: Registration, surveys, feedback forms, etc.

### 🎬 Macro Recorder
Record sequences of clicks and actions, then replay them instantly across pages for complex workflows.

- **Record clicks**: Capture all your clicks on a page with visual event timeline
- **Flexible playback**: 300ms delays between events for reliable automation
- **Save macros**: Store your recorded sequences for instant replay
- **Multi-step automation**: Perfect for workflows involving multiple pages or complex interactions

## Installation

### From Source (Developer Mode)

1. **Download the extension files**
   - Navigate to `public/extension/` in the project directory

2. **Load as unpacked extension**
   - Open `chrome://extensions/` (or `edge://extensions/` for Edge)
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `public/extension/` folder
   - The Mazilla icon will appear in your toolbar

3. **Open the sidebar**
   - Click the Mazilla icon in your browser toolbar
   - The sidebar panel will open on the right side of your screen

## How to Use

### Autoclick Workflow

1. Open Mazilla sidebar (click the extension icon)
2. Go to the **Autoclick** tab
3. Click **Pick Element** and then click the button you want to autoclick
4. Set your interval (choose a preset or enter a custom value)
5. Optionally set a max click limit
6. Click **Start** and watch the stats
7. Click **Stop** anytime to stop
8. Click **+ Save current** to save this job for later use

### Form Filler Workflow

1. Open Mazilla sidebar
2. Go to the **Forms** tab
3. Navigate to a page with a form you want to capture
4. Click **Capture Form** — Mazilla will automatically detect all fields
5. The form template is saved with all field values
6. On another page with a similar form, click the play button next to your saved template to fill all matching fields instantly

### Macro Recorder Workflow

1. Open Mazilla sidebar
2. Go to the **Macros** tab
3. Click **Start Recording**
4. Perform your clicks and actions on the page (each click is logged)
5. Click **Stop Recording** when done
6. Enter a name for your macro
7. Your macro is saved and ready to replay
8. Click the play button next to any saved macro to execute the entire sequence

## Technical Details

### Manifest V3
- Uses Chrome's latest Manifest V3 API
- Side panel for UI
- Content scripts for page interaction
- Service worker for background tasks
- Local storage for data persistence

### Key Components

**manifest.json** — Extension configuration with permissions
- `sidePanel`: Opens the sidebar UI
- `scripting`: Injects content scripts
- `storage`: Saves jobs, forms, and macros locally
- `tabs`: Routes messages between sidebar and page

**sidebar.html / sidebar.css / sidebar.js** — Main UI and logic
- Tab navigation (Autoclick, Forms, Macros)
- Form state management
- Job, form, and macro persistence
- Message routing to content script

**content.js** — Page injection script
- Element picking with visual overlay
- Building CSS selectors
- Executing clicks
- Capturing form data
- Recording and replaying macros
- Banner notifications

**background.js** — Service worker
- Opens sidebar on icon click

## Storage

All data is stored locally in your browser using `chrome.storage.local`:

- **Jobs** (`mazilla_jobs`): Autoclick configurations
- **Forms** (`mazilla_forms`): Captured form templates
- **Macros** (`mazilla_macros`): Recorded action sequences

Data persists across browser restarts and is never sent to external servers.

## Troubleshooting

### Extension doesn't appear in toolbar
- Make sure Developer mode is enabled in `chrome://extensions/`
- Reload the page or restart the browser

### Can't pick elements
- Make sure the content script is running on the page
- Try refreshing the page and opening the sidebar again
- Check that `scripting` permission is granted

### Forms not filling correctly
- Not all field selectors may match between pages (different forms, different IDs)
- Manually adjust selectors if needed or re-capture the form on the target page

### Macros not replaying correctly
- Element selectors may have changed since recording
- Try re-recording the macro on the target page
- Increase delays if elements take time to load

## Browser Support

- **Chrome** 114+
- **Edge** 114+
- **Other Chromium-based browsers** (Opera, Brave, Vivaldi, etc.)

Firefox support coming in a future release.

## Permissions Explained

| Permission | Why It's Needed |
|-----------|-----------------|
| `sidePanel` | Shows the Mazilla sidebar in the browser |
| `activeTab` | Identifies the current tab |
| `scripting` | Injects content script for element picking, form capture, and macro recording |
| `storage` | Saves jobs, forms, and macros locally |
| `tabs` | Routes messages between sidebar and page content |

## Privacy & Security

- **100% local**: All data is stored locally in your browser
- **No tracking**: Mazilla never collects, sends, or processes your data
- **No external calls**: The extension runs entirely offline
- **Open source**: Code is transparent and auditable

## License

MIT License — Feel free to modify and distribute

## Support

For issues, feature requests, or contributions, visit the GitHub repository or contact the developer.

---

**Mazilla v1.0** — Automate your browser, one click at a time.
