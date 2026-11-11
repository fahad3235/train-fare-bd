# TEST_RESULTS.md -- Train Fare BD

Tested: 2026-11-11 (Muse Project Factory run #301, 10:00 slot, Asia/Dhaka).
Environment: Node v24.22.1; headless Chromium (headless_shell-1187) via raw CDP, no puppeteer.

## Logic tests -- 13/13 pass

Command: `node --test tests/logic.test.js`

| Test | Result |
|---|---|
| dataset integrity: 8 routes, 33 verified fares, no invented cells | pass |
| every verified fare matches the sourced value | pass |
| unverified cells are absent (null), never invented | pass |
| route flags: estimated / single-source / reports-vary | pass |
| routesForPair: unordered, both directions same fare | pass |
| classesForRoute: only classes with a verified fare | pass |
| calculate: single adult, no extras | pass |
| calculate: child half-fare + rounding to whole taka | pass |
| calculate: online fee per paying seat only | pass |
| calculate: under-3 free, children-only party allowed | pass |
| calculate: every route/class spot-check totals | pass |
| validateCalculation: all error paths | pass |
| validateImport: valid round-trip + malformed cases | pass |

Key values verified by the tests: Shovon Chair stoppage Dhaka-Chattogram 450; Snigdha 857 with 1 adult + 1 child = 1285.5 -> rounded total 1286; non-stop Snigdha 943 with 1 adult + 1 child = 1414.5 -> 1415; 2 adults AC Seat 1030 + online = 2100; import recomputes totals from fare data (a Cox's Bazar Snigdha import with a wrong stored total of 4329 is corrected to 3668: 2x1443 + 721.5 + 3x20).

## Smoke tests (headless Chrome CDP) -- 81/81 pass

Command: `node tests/smoke.js`

Coverage: default calculator flow (1 adult Shovon Chair stoppage = 450 Tk); child half-fare + rounding note (Snigdha 1 adult + 1 child = 1,286 Tk, child fare row 428.5); online fee (2 adults AC Seat + online = 2,100 Tk, fee row 40); under-3 free and pays no online fee (1 adult + 2 under-3 online = 470 Tk); non-stop variant (Shovon Chair 495, 3 classes); validation errors (same station, no-route pair Sylhet-Rangpur, zero paying passengers) and recovery; swap button; fare table (33 rows, badges Estimated / Single-source / Reports-vary each present, Cox's Bazar Snigdha 1,443, search "cox" -> 4 rows, "rangpur" -> 5 rows, row tap loads calculator with AC Berth 2,644); class guide (8 cards, First Berth "No verified fare", Snigdha "15% VAT included", Shovon "No VAT"); rules tab (pontage, 20 Tk fee, 10 days / 8:00 AM, eticket disclaimer); save/load/delete of a calculation; export/import round-trip via hooks plus wrong-app, unknown-route, and no-fare-class rejections (data intact after each); bad/good UI import; typed-DELETE erase (wrong word rejected, data kept; DELETE erases); EN/BN toggle (Bengali title, Bengali-digit total 450, persistence after reload, back to EN); footer disclaimer; 390px no horizontal overflow on all 5 tabs; zero non-file network requests; zero console/page errors.

## ASCII-source check -- pass

`grep -rP '[^\x00-\x7F]' --include='*.js' --include='*.html' --include='*.css' .` returns zero matches. All Bengali text is stored as `\uXXXX` escapes (928 chars escaped in logic.js, 2332 in i18n.js, 1 in app.js).

## Repairs made (2, both test bugs -- no app code changed)

1. **Logic test, repair cycle 1:** the route/class spot-check spread `{...base}` which kept `to: 'chattogram'` while testing Sylhet/Dewanganj/Jamalpur/Cox's Bazar/Rangpur routes, so validation (correctly) rejected the route/pair mismatch. Fixed the test to use each route's own endpoints. Re-ran: 13/13 pass.
2. **Smoke test, repair cycle 1:** the class-guide checks used `document.querySelector('[data-class-id="snigdha"]')`, which matched a fare-table row first (the table section precedes the class guide in the DOM). Scoped the selectors to `#classList`. Re-ran: 81/81 pass.

No app-code defects were found. No repair cycles were needed for the application itself.
