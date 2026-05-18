# Concerns

## Critical Issues

### Manifest V2 Deprecation
- `manifest.json` uses Manifest V2, which Chrome is deprecating
- Extension will stop working in future Chrome versions
- Migration to Manifest V3 required (service worker, new APIs)

### Variable Typo Bug
- `scripts/common.js` line ~47: `tabdDBId` vs `tabDBId` — likely causes silent failures
- Incomplete variable reference for incognito tabs around line ~154

## Tech Debt

### Error Handling
- Silent/empty catch blocks in 5+ files — errors are swallowed without logging
- No error monitoring or reporting mechanism
- No data validation on storage retrieval (corrupt data would cause silent failures)

### Code Quality
- Redundant array length checks throughout codebase
- Heavy global state management makes testing and reasoning difficult
- `scripts/common.js` is very large (~707 lines) — monolithic utility file

## Performance Issues

- Unoptimized DOM queries in loops (`scripts/nap_room.js`)
- Calendar re-initialized on every popup open
- Multiple event listener registrations without cleanup (potential memory leaks)

## Test Coverage

- No test infrastructure exists at all
- Time calculations untested — DST transitions and edge cases are risky
- Incognito mode support recently added but not tested
- Edit/duplicate flows are fragile without tests
- No CI/CD pipeline

## Security

- Extension handles sensitive browsing data (tab URLs, titles)
- No input sanitization for tab URLs before storage
- No content security policy beyond manifest defaults

## Missing Features / Future Risk

- No internationalization (i18n) support
- No data migration strategy for storage schema changes
- No backup/export mechanism for snoozed tabs