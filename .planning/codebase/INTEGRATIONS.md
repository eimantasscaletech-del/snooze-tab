# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**Analytics/Stats:**
- Snoozz Stats Server - Anonymous usage statistics collection
  - Endpoint: `https://stats.snoozz.me/clicks` (POST)
  - Implementation: `scripts/poll.js`
  - Data sent: User's selected snooze choice and timing
  - Privacy: No personal/identifiable data transmitted; tab URLs, IP addresses, and geolocation never leave device
  - Data visibility: All collected data publicly viewable at `https://snoozz.me/stats.html`
  - Source code: `https://github.com/rohanb10/snoozz-stats`

**Favicon Service:**
- Best Icon API - Favicon fetching for tab thumbnails
  - Endpoint: `https://besticon.herokuapp.com/icon`
  - Implementation: `scripts/common.js` (lines 525-529)
  - Function: `getFaviconUrl(url)`
  - Parameters: URL hostname, requested size (32..48..64), fallback icon color
  - Fallback options: Commented-out alternatives use DuckDuckGo and Google favicon services

**Web Links:**
- snoozz.me - Marketing/documentation website
  - On install: Opens `https://snoozz.me/hello`
  - On uninstall: Directs to `https://snoozz.me/bye`
  - Implementation: `scripts/background.js` (chrome.runtime events)

## Data Storage

**Databases:**
- None - No remote database integration

**Local Storage:**
- Chrome Extension Local Storage (`chrome.storage.local`) - Primary data persistence
  - Snoozed tabs: `'snoozed'` key - Array of tab objects with wake-up times
  - Options: `'snoozedOptions'` key - User configuration and preferences
  - Implementation: `scripts/common.js` (getSnoozedTabs, getOptions, saveTabs, saveOptions)
  - Size quota: 5MB default (retrievable via `chrome.storage.local.QUOTA_BYTES`)

**File Storage:**
- None - No cloud or file storage integrations

**Caching:**
- Browser cache only - No service worker caching layer

## Authentication & Identity

**Auth Provider:**
- None - Extension operates without user authentication
- Stats polling is completely anonymous (no user ID or tracking)

## Monitoring & Observability

**Error Tracking:**
- None - No external error reporting service

**Logs:**
- Console logging via `bgLog()` function (`scripts/background.js`)
- Browser developer tools for debugging
- Local logging with color-coded severity levels:
  - Log function: `scripts/background.js` (sendToLogs) - Logs tab snooze events, wake-ups, and deletions

**Notification System:**
- Native browser notifications via `chrome.notifications` API
  - Sound notifications: `sounds/beep.mp3` and `sounds/appointed.mp3`
  - Notification types: Basic bubbles with icon, title, and message
  - Configuration: `scripts/common.js` (createNotification function, lines 95-100)

## CI/CD & Deployment

**Hosting:**
- Chrome Web Store - Primary channel
- Firefox Add-ons (AMO) - Secondary channel
- Microsoft Edge Add-ons Store
- Safari App Store (custom builds)

**CI Pipeline:**
- None detected - Manual build process via `build.py`
- No GitHub Actions or automated deployment workflow

**Build Process:**
- Python script: `build.py` - Creates minified, platform-specific builds
- Outputs separate builds for: Chrome, Firefox, Safari, Edge
- Build artifacts: ZIP files for each platform with minified assets

## Environment Configuration

**Required env vars:**
- None - Extension is self-contained and configuration-agnostic

**Secrets location:**
- No secrets or API keys stored
- Extension requires no authentication or API credentials

## Webhooks & Callbacks

**Incoming:**
- None - Extension does not expose any webhook endpoints

**Outgoing:**
- Stats submission: One-way POST to `https://stats.snoozz.me/clicks` (optional, user-configurable)
  - Configuration: `scripts/background.js` (polling option: 'off', 'on')
  - Triggered on snooze action when polling enabled

## Unused Permission

**Habitica Integration (Declared but Unused):**
- Permission listed: `https://habitica.com/*` in `manifest.json` (line 28)
- Status: No active implementation found in codebase
- Indicates potential planned feature or legacy permission not yet removed

---

*Integration audit: 2026-03-26*
