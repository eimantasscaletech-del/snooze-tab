# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- JavaScript (ES6+) - All extension scripts and background processing

**Secondary:**
- HTML5 - UI markup for popup, settings, and nap room interfaces
- CSS3 - Styling for all UI components
- Python 3 - Build script for minification and packaging

## Runtime

**Environment:**
- Chrome/Chromium-based browsers (manifest v2)
- Firefox (compatible via manifest adaptation)
- Safari (custom build support)
- Edge (compatible)

**Package Manager:**
- No NPM/package.json - Dependencies bundled as minified files
- Lockfile: Not applicable

## Frameworks

**Core:**
- Chrome Extensions API v2 - Core extension functionality

**UI/Utilities:**
- dayjs (minified: `scripts/dayjs.min.js`) - Date/time manipulation
- flatpickr (minified: `scripts/flatpickr.min.js`) - Date picker UI
- gradient (minified: `scripts/gradient.min.js`) - Gradient generation for UI
- lozad (minified: `scripts/lozad.min.js`) - Lazy loading library
- BSF (Body Scroll Freezer) (minified: `scripts/BSF.min.js`) - Scroll prevention

**Build/Dev:**
- uglifyjs - JavaScript minification
- csso - CSS minification (referenced in build.py)
- Python build script with shutil for packaging

## Key Dependencies

**Critical:**
- Chrome Extension APIs (runtime, storage, tabs, alarms, notifications) - Core functionality for snoozing
- dayjs - Timezone-aware date handling for wake-up scheduling

**Infrastructure:**
- besticon.herokuapp.com API - Favicon fetching for tab icons
- Manifest v2 - Extension protocol and API compatibility

## Configuration

**Environment:**
- Manifest-driven configuration (`manifest.json`) - Defines permissions, background scripts, UI pages
- No environment variables required - Self-contained deployment

**Build:**
- `build.py` - Python build script for creating minified distribution packages
- Browser-specific builds: Chrome, Firefox, Safari, Edge
- Minification targets: `scripts/`, `html/`, `styles/` directories

**Permissions (from manifest.json):**
- `alarms` - Scheduled wake-up times
- `contextMenus` - Right-click menu integration
- `idle` - System idle state detection
- `notifications` - Native browser notifications
- `storage` - Local data persistence (snoozed tabs, options)
- `tabs` - Tab manipulation and querying
- `https://habitica.com/*` - Content script access (manifest indicates potential Habitica integration, unused in current codebase)

## Platform Requirements

**Development:**
- Python 3.x - Build script execution
- Node.js (optional) - For running uglifyjs and csso minifiers locally
- Web browser supporting Manifest v2 extensions

**Production:**
- Chrome Web Store - Primary distribution channel
- Firefox Add-ons (AMO) - Secondary distribution
- Edge Add-ons Store - Windows distribution
- Safari App Store - macOS distribution

---

*Stack analysis: 2026-03-26*
