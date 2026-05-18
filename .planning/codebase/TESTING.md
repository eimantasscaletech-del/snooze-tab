# Testing

## Current State

**No test infrastructure exists.** There are no test files, no test framework, no test runner, and no CI configuration in this repository.

## Coverage

- **Unit tests**: None
- **Integration tests**: None
- **E2E tests**: None
- **Manual testing**: Implied (extension is loaded in browser manually)

## Risks from No Testing

- Time calculation logic (snooze scheduling, recurring events, DST transitions) is entirely untested
- Incognito mode support was recently added with no test coverage
- Edit/duplicate tab flows are fragile
- Storage migration logic has no regression protection
- Cross-browser compatibility (Chrome vs Firefox vs Safari) relies on manual checks

## Notes for Adding Tests

- No build system exists — any test framework would need to be added (Jest recommended for unit tests)
- Chrome extension APIs (`chrome.storage`, `chrome.tabs`, etc.) would need mocking
- `scripts/common.js` is the highest-value target for unit tests (pure CRUD logic)
- Background alarm logic is the highest-risk untested area
- Consider using `webextension-polyfill` mocks or `jest-chrome` for API mocking