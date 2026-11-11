# Train Fare BD

Offline, bilingual (English / Bengali) Bangladesh Railway intercity fare calculator and fare table. No account, no network, no build step -- open `index.html` and it works, including from `file://`.

## Problem

Intercity train fares in Bangladesh changed on 20 Dec 2025 (pontage / bridge-charge change), and the fares quoted by different sites disagree. Travellers need one honest place to check the fare for their route and class, work out the total for a family, and know which numbers are solid and which are shaky -- before they pay on the official e-ticket site.

## Features

1. **Calculator** -- From/To station selects (8 stations, only pairs with a verified route), route variant picker (Dhaka-Chattogram stoppage vs non-stop are separate options), class select limited to classes with a verified fare for that route, adults (1-6), children aged 3-9 (half fare), children under 3 (free, counted only), online-booking checkbox (+20 Tk per paying seat). Full breakdown: per-person fare, adults subtotal, children subtotal, online fee, grand total. Save a calculation by name.
2. **Fare Table** -- All 8 routes x classes (33 verified fares), searchable by station or class, with badges: **Estimated** (Rangpur-Dhaka), **Single source -- verify** (Feni-Dhaka), **Reports vary** (Cox's Bazar Snigdha). Tap any row to load it into the calculator.
3. **Class Guide** -- All 8 classes (Shovon, Shovon Chair, First Seat, First Berth, Snigdha, AC Chair, AC Seat, AC Berth) with plain-language descriptions, VAT badges, and which routes offer each class with its fare. First Berth has no verified fare on any route, so it never appears in the table or calculator.
4. **Fare Rules** -- Dec 2025 pontage change, 15% VAT included in AC fares, +20 Tk/seat online fee, child rules (under 3 free, 3-9 half, 10+ adult), booking opens 10 days ahead at 8:00 AM, and the "verify the final fare on eticket.railway.gov.bd before paying" notice.
5. **Data** -- Saved calculations (load/delete), JSON export (download) and import (file or paste) with strict validation (wrong app/version, unknown route/class, or bad shape are rejected and existing data stays intact), typed-DELETE erase-all, and a Sources & accuracy box.

Every tab carries the footer: "Fares as reported Dec 2025 (post-pontage change) -- verify on eticket.railway.gov.bd. Not affiliated with Bangladesh Railway."

## Fare data (one-way, adult, BDT)

| Route | Verified fares |
|---|---|
| Dhaka-Chattogram (stoppage) | Shovon Chair 450, First Seat 685, Snigdha 857, AC Seat 1030, AC Berth 1591 |
| Dhaka-Chattogram (non-stop) | Shovon Chair 495, Snigdha 943, AC Seat 1133 |
| Dhaka-Sylhet | Shovon Chair 410, Snigdha 788, AC Seat 943, AC Berth 1465 |
| Dhaka-Dewanganj | Shovon Chair 255, Snigdha 489, AC Seat 587, AC Berth 924 |
| Chattogram-Jamalpur | Shovon Chair 545, Snigdha 1041, AC Seat 1254, AC Berth 1925 |
| Dhaka-Cox's Bazar (non-stop) | Shovon Chair 754, Snigdha 1443*, AC Seat 1728, AC Berth 2644 |
| Rangpur-Dhaka | Shovon 385, Shovon Chair 460, Snigdha 875, AC Chair 1050, AC Berth 1575 (estimated) |
| Feni-Dhaka | Shovon Chair 330, First Seat 506, Snigdha 633, AC Seat 759 (single source) |

\* Cox's Bazar Snigdha is also reported as 1449 and 1450 elsewhere -- see DATA_NOTES.md. Cells with no verified value show as "--" in the guide and are excluded from the calculator; no fare in this app is invented.

**Rounding rule:** a child (3-9) pays exactly half the adult fare, so a total can end in .5 Tk (e.g. Snigdha 857: 1 adult + 1 child = 1285.5). The grand total is rounded to the nearest whole taka at the end; the UI says so whenever rounding applied.

## Stack

- Vanilla HTML / CSS / JavaScript, no dependencies, no build step.
- Pure logic in `logic.js` (shared by browser and Node tests); bilingual strings in `i18n.js`; UI wiring in `app.js`.
- State in `localStorage` (`tfbd.lang`, `tfbd.calcs`); zero network requests at runtime.
- All sources are pure ASCII: Bengali text is stored as `\uXXXX` escapes in `.js` / `.html` / `.css` (verify: `grep -rP '[^\x00-\x7F]' --include='*.js' --include='*.html' --include='*.css' .` returns nothing).

## Install / dev

```sh
# No install step. Serve it or open it directly:
python3 -m http.server 8000        # then open http://localhost:8000/
# or just open index.html in any browser (works from file://)
```

## Testing

```sh
node --test tests/logic.test.js   # 13 tests: fare lookups, child/online math, validation, import
node tests/smoke.js               # 81 headless-Chrome CDP checks: full flows, i18n, 390px, zero network
```

See TEST_RESULTS.md for the real results (13/13 logic, 81/81 smoke, 2026-11-11).

## Deployment

Static site. Any static host works (GitHub Pages, Netlify, or a local file). No server, no environment variables, no secrets.

## Limitations

- Only 8 routes / 33 fares are verified; most Bangladesh Railway routes are not covered yet -- pairs without a verified fare show "No verified fare for this station pair yet."
- Fares are as reported Dec 2025; they can change. Always verify on eticket.railway.gov.bd before paying.
- Rangpur-Dhaka fares are estimated by their source; Feni-Dhaka rests on a single source; the Cox's Bazar Snigdha fare is disputed (1443 / 1449 / 1450) -- all flagged in the UI and in DATA_NOTES.md.
- No live seat availability, no booking -- this app only calculates fares.
- One-way fares only; return journeys are two one-way fares.

## Status

Built 2026-11-11 (Muse Project Factory run #301, 10:00 slot). Complete MVP, tested for real. Not affiliated with Bangladesh Railway.
