# DATA_NOTES.md -- Train Fare BD: sources, conflicts, and decisions

All fares are **one-way adult fares in BDT**, as reported in **December 2025** after the pontage (bridge-crossing) charge changed on **20 Dec 2025**. Both directions of a route share the same fare. Every fare cell below is sourced; any cell with no verified value is **absent** from the data (never invented) and renders as an em dash in the Class Guide, and the class is excluded from the calculator for that route.

## Route-by-route sources

### 1. Dhaka-Chattogram (stoppage intercity)
- Shovon Chair 450, First Seat 685, Snigdha 857, AC Seat 1030, AC Berth 1591.
- Source: Ministry of Railways press release, reported by observerbd.com (10 Dec 2025), and Prothom Alo (Dec 2025) via bangladeshrailways.com. The two sources agree on these figures.

### 2. Dhaka-Chattogram (NON-STOP -- Subarna 701/702 & Sonar Bangla 787/788)
- Shovon Chair 495, Snigdha 943, AC Seat 1133.
- Source: same Ministry of Railways press release / Prothom Alo Dec 2025 reporting as route 1. Non-stop trains charge more than stoppage trains on the same corridor (495 vs 450 for Shovon Chair).

### 3. Dhaka-Sylhet
- Shovon Chair 410, Snigdha 788, AC Seat 943, AC Berth 1465.
- Source: Prothom Alo (Dec 2025) via bangladeshrailways.com.

### 4. Dhaka-Dewanganj
- Shovon Chair 255, Snigdha 489, AC Seat 587, AC Berth 924.
- Source: Prothom Alo (Dec 2025) via bangladeshrailways.com.

### 5. Chattogram-Jamalpur
- Shovon Chair 545, Snigdha 1041, AC Seat 1254, AC Berth 1925.
- Source: Prothom Alo (Dec 2025) via bangladeshrailways.com.

### 6. Dhaka-Cox's Bazar (non-stop)
- Shovon Chair 754, Snigdha 1443, AC Seat 1728, AC Berth 2644.
- Source: observerbd.com.
- **CONFLICT -- Snigdha fare:** other reports give Snigdha **1449** (bangladeshrailways.com) and **1450** (daily-sun.com) for this route. The app uses **1443** (the observerbd.com figure, from the same reporting as the rest of this route's fares) and flags the cell in the UI with a "Reports vary" badge; this note is the record of the disagreement. The other three fares on this route are not disputed in the sources seen.

### 7. Rangpur-Dhaka
- Shovon 385, Shovon Chair 460, Snigdha 875, AC Chair 1050, AC Berth 1575.
- Source: amadertrain.com, which labels these fares **ESTIMATED**. The whole route carries an "Estimated" badge in the UI.
- **AC Chair vs Snigdha:** the source lists "AC Chair" (1050) as a separate fare from Snigdha (875). Snigdha *is* the AC chair class on most routes, but because the source prices them separately here, the app keeps **AC Chair as its own class** (`ac-chair`) rather than merging the two numbers. The Class Guide explains this.

### 8. Feni-Dhaka
- Shovon Chair 330, First Seat 506, Snigdha 633, AC Seat 759.
- Source: a single source -- a journey-review video description (youtube.com/watch?v=ZPv13L3mEuU). The whole route carries a "Single source -- verify" badge in the UI. Treat these four fares as the weakest numbers in the app.

## Cross-source conflict noted (not used)

- **seat61.com** (page updated 5 Jun 2026) lists Dhaka-Chattogram **AC Berth 1540**, against the **1591** used here. Decision: the Ministry of Railways press release (Dec 2025, the post-pontage-change figure, corroborated by Prothom Alo reporting) wins over the seat61 listing, which may predate the change or reflect a different fare basis. Recorded here so the discrepancy is not lost.

## Classes with no verified fare anywhere

- **First Berth:** no First Berth fare is verified for any of the 8 routes, so First Berth appears in the Class Guide only -- never in the fare table or the calculator.
- **Shovon** is verified only on Rangpur-Dhaka; **First Seat** only on Dhaka-Chattogram (stoppage) and Feni-Dhaka; **AC Chair** only on Rangpur-Dhaka (see above).

## Rules applied (and where they come from)

- **Child fare:** children aged 3-9 pay exactly half the adult fare; children under 3 travel free; children 10+ pay the adult fare. Half fares can produce a .5 Tk total, so the grand total is rounded to the nearest whole taka at the end (documented in the UI whenever rounding applies).
- **Online booking fee:** +20 Tk per paying seat (adults + children 3-9; under-3s pay nothing), per eticket.railway.gov.bd practice.
- **VAT:** 15% VAT is included in AC fares (Snigdha, AC Seat, AC Berth, AC Chair). Non-AC fares carry no VAT.
- **Booking window:** tickets open 10 days ahead at 8:00 AM.
- **Pontage change:** fares rose on 20 Dec 2025 when the pontage charge changed; every fare in this app is a post-change fare as reported in Dec 2025.

## What was NOT used

- No fare was taken from train-schedule-bd (that project deliberately carries no fares -- they were not verified there).
- No fare was estimated, interpolated, or copied from a neighbouring route to fill a gap. Gaps stay gaps.
