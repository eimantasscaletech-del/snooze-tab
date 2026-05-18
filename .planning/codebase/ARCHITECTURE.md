# Architecture

## Pattern
Browser Extension (Manifest v2) — event-driven background service worker + multi-page UI

## Core Layers

### Background (`scripts/background.js`)
- Scheduling, alarms, notifications, state synchronization
- Listens for chrome.alarms, storage changes, and tab events
- Responsible for waking snoozed tabs at the correct time

### Utilities (`scripts/common.js`, ~707 lines)
- All CRUD operations for snoozed tabs and options
- Shared across all UI pages
- Handles chrome.storage read/write, tab manipulation, group/recurring logic

### UI Pages
- **Popup** (`html/popup.html` + `scripts/popup.js`): Quick snooze entry point from toolbar
- **Nap Room** (`html/nap_room.html` + `scripts/nap_room.js`): Dashboard for managing snoozed tabs
- **Settings** (`html/settings.html` + `scripts/settings.js`): User preferences
- **Rise and Shine** (`html/rise-and-shine.html`): Window opener triggered on wake

## Data Flow

```
User snoozes tab
  → saveTab() writes to chrome.storage
  → background.js detects storage change
  → sets chrome.alarm for wake time
  → alarm fires → openTab() restores the tab
```

## Key Abstractions

- **Tab object**: Individual snoozed tab with url, title, time, pinned, incognito
- **Group object**: Multiple tabs snoozed as a window or selection
- **Recurring object**: Scheduled repeating snooze (e.g. every Monday)
- **Choice object**: Preset snooze time options shown in popup

## Entry Points

- `manifest.json` — declares background script, popup, permissions
- `scripts/background.js` — service worker / background page
- `html/popup.html` — user-facing toolbar popup