# Directory Structure

## Layout

```
snooze-tab/
├── manifest.json           # Extension manifest (v2), permissions, background config
├── html/                   # UI entry points
│   ├── popup.html          # Toolbar popup (quick snooze)
│   ├── nap_room.html       # Dashboard for managing snoozed tabs
│   ├── settings.html       # User preferences
│   └── rise-and-shine.html # Window opener on tab wake
├── scripts/                # JavaScript source
│   ├── background.js       # Background service worker (alarms, wake logic)
│   ├── common.js           # Shared CRUD utilities (~707 lines)
│   ├── popup.js            # Popup page logic
│   ├── nap_room.js         # Nap room dashboard logic
│   ├── settings.js         # Settings page logic
│   └── (other helpers)
├── styles/                 # CSS
│   ├── common.css          # Shared styles
│   ├── popup.css           # Popup-specific styles
│   └── (page-specific css)
├── icons/                  # Extension icons
│   ├── logo.svg            # Master logo
│   ├── logo-16.png         # 16px icon
│   ├── logo-32.png         # 32px icon
│   ├── logo-48.png         # 48px icon
│   ├── logo-128.png        # 128px icon
│   ├── human/              # Human-theme icon variants
│   ├── hats/               # Hats-theme icon variants
│   └── animal/             # Animal-theme icon variants
├── sounds/                 # Audio
│   └── beep.mp3            # Wake notification sound
├── docs/                   # Documentation
└── .idea/                  # JetBrains IDE config (committed)
```

## Key Locations

- Extension entry: `manifest.json`
- Business logic: `scripts/common.js`
- Background worker: `scripts/background.js`
- Popup UI: `html/popup.html` + `scripts/popup.js`
- Dashboard: `html/nap_room.html` + `scripts/nap_room.js`

## Naming Conventions

- HTML files: `kebab-case.html`
- JS files: `snake_case.js` (nap_room) and `kebab-case.js` (popup, settings, background)
- CSS files: `kebab-case.css`
- Icons: `logo-{size}.png`