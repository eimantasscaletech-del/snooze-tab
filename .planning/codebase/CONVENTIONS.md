# Conventions

## Language & Style

- **Language**: Vanilla JavaScript (ES2017+), no TypeScript, no build step
- **Style**: No linter/formatter enforced; inconsistent spacing (tabs used in most files)
- **Variable declarations**: `var` throughout (not `const`/`let`) — ES5-era habit
- **Function style**: Mix of `async function name()` declarations and arrow functions

## Naming

- Functions: `camelCase` (e.g. `getSnoozedTabs`, `saveOption`, `wakeUpTask`)
- Variables: `camelCase`
- Files: `kebab-case.html`, `snake_case.js` (inconsistent — `nap_room.js` vs `popup.js`)
- CSS classes: `kebab-case`
- Storage keys: string literals (`'snoozed'`, `'snoozedOptions'`)

## Async Pattern

- `async/await` with `new Promise(r => chrome.api(..., r))` wrapper pattern throughout
- Example from `scripts/common.js`:
  ```js
  var p = await new Promise(r => chrome.storage.local.get('snoozed', r));
  ```
- No centralized promise wrapper utilities — pattern repeated inline everywhere

## Error Handling

- Empty `catch(e) {}` blocks — errors silently swallowed (seen in `scripts/background.js:43`)
- Early returns on falsy values: `if (!t || !t.id) return;`
- No centralized error handling or logging to external service
- `bgLog()` function used for background debug logging (console only)

## Data Access

- All storage reads/writes go through `scripts/common.js` utility functions
- Functions named `get*`, `save*`, `delete*` for CRUD operations
- Storage schema: flat arrays in `chrome.storage.local` under `'snoozed'` and `'snoozedOptions'` keys

## Event Handling

- `chrome.runtime.onMessage.addListener` for cross-page communication
- `chrome.storage.onChanged.addListener` for reactive state sync
- `chrome.alarms.onAlarm.addListener` for wake scheduling
- No cleanup of event listeners (registered once on script load)

## DOM Patterns

- Direct `document.querySelector` / `getElementById` — no framework
- Event delegation not consistently used
- DOM manipulation done imperatively in page scripts