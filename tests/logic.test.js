// train-fare-bd -- node logic tests (no deps).
// Run: node --test tests/logic.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const L = require('../logic.js');

const EXPECTED = {
  'dhaka-chattogram-stop': { 'shovon-chair': 450, 'first-seat': 685, 'snigdha': 857, 'ac-seat': 1030, 'ac-berth': 1591 },
  'dhaka-chattogram-nonstop': { 'shovon-chair': 495, 'snigdha': 943, 'ac-seat': 1133 },
  'dhaka-sylhet': { 'shovon-chair': 410, 'snigdha': 788, 'ac-seat': 943, 'ac-berth': 1465 },
  'dhaka-dewanganj': { 'shovon-chair': 255, 'snigdha': 489, 'ac-seat': 587, 'ac-berth': 924 },
  'chattogram-jamalpur': { 'shovon-chair': 545, 'snigdha': 1041, 'ac-seat': 1254, 'ac-berth': 1925 },
  'dhaka-coxsbazar': { 'shovon-chair': 754, 'snigdha': 1443, 'ac-seat': 1728, 'ac-berth': 2644 },
  'rangpur-dhaka': { 'shovon': 385, 'shovon-chair': 460, 'snigdha': 875, 'ac-chair': 1050, 'ac-berth': 1575 },
  'feni-dhaka': { 'shovon-chair': 330, 'first-seat': 506, 'snigdha': 633, 'ac-seat': 759 },
};

test('dataset integrity: 8 routes, 33 verified fares, no invented cells', () => {
  assert.strictEqual(L.ROUTES.length, 8);
  assert.strictEqual(L.STATIONS.length, 8);
  assert.strictEqual(L.CLASSES.length, 8);
  let cells = 0;
  const routeIds = new Set();
  for (const r of L.ROUTES) {
    assert.ok(!routeIds.has(r.id), 'duplicate route id: ' + r.id);
    routeIds.add(r.id);
    assert.ok(L.stationById(r.from), r.id + ' from station known');
    assert.ok(L.stationById(r.to), r.id + ' to station known');
    assert.notStrictEqual(r.from, r.to, r.id + ' endpoints differ');
    for (const [cls, fare] of Object.entries(r.fares)) {
      assert.ok(L.classById(cls), r.id + ' class known: ' + cls);
      assert.ok(Number.isInteger(fare) && fare > 0, r.id + ' ' + cls + ' fare positive integer');
      cells++;
    }
  }
  assert.strictEqual(cells, 33, 'exactly 33 verified fare cells');
  assert.strictEqual(L.fareTableRows().length, 33);
});

test('every verified fare matches the sourced value', () => {
  for (const [routeId, fares] of Object.entries(EXPECTED)) {
    for (const [cls, fare] of Object.entries(fares)) {
      assert.strictEqual(L.fareFor(routeId, cls), fare, routeId + ' / ' + cls);
    }
    // No extra fares beyond the expected set for this route.
    assert.deepStrictEqual(
      Object.keys(L.routeById(routeId).fares).sort(),
      Object.keys(fares).sort(),
      routeId + ' fare set is exactly the verified set',
    );
  }
});

test('unverified cells are absent (null), never invented', () => {
  // No First Berth fare is verified for ANY route.
  for (const r of L.ROUTES) assert.strictEqual(L.fareFor(r.id, 'first-berth'), null, r.id + ' first-berth');
  assert.strictEqual(L.fareFor('dhaka-chattogram-stop', 'shovon'), null, 'no Shovon on stoppage Chattogram');
  assert.strictEqual(L.fareFor('dhaka-sylhet', 'first-seat'), null, 'no First Seat on Sylhet');
  assert.strictEqual(L.fareFor('dhaka-sylhet', 'shovon'), null, 'no Shovon on Sylhet');
  assert.strictEqual(L.fareFor('rangpur-dhaka', 'first-seat'), null, 'no First Seat on Rangpur');
  assert.strictEqual(L.fareFor('rangpur-dhaka', 'ac-seat'), null, 'no AC Seat on Rangpur (AC Chair instead)');
  assert.strictEqual(L.fareFor('feni-dhaka', 'ac-berth'), null, 'no AC Berth on Feni');
  assert.strictEqual(L.fareFor('no-such-route', 'snigdha'), null, 'unknown route');
  assert.strictEqual(L.fareFor('dhaka-sylhet', 'royal'), null, 'unknown class');
});

test('route flags: estimated / single-source / reports-vary', () => {
  assert.strictEqual(L.routeById('rangpur-dhaka').estimated, true);
  assert.strictEqual(L.routeById('feni-dhaka').singleSource, true);
  assert.strictEqual(L.routeById('dhaka-coxsbazar').varies.snigdha.includes('1449'), true);
  assert.strictEqual(L.routeById('dhaka-chattogram-stop').estimated, undefined);
  assert.strictEqual(L.routeById('dhaka-sylhet').varies, undefined);
});

test('routesForPair: unordered, both directions same fare', () => {
  assert.strictEqual(L.routesForPair('dhaka', 'chattogram').length, 2);
  assert.strictEqual(L.routesForPair('chattogram', 'dhaka').length, 2);
  assert.deepStrictEqual(
    L.routesForPair('chattogram', 'dhaka').map((r) => r.id).sort(),
    ['dhaka-chattogram-nonstop', 'dhaka-chattogram-stop'],
  );
  assert.strictEqual(L.routesForPair('rangpur', 'dhaka').length, 1);
  assert.strictEqual(L.routesForPair('dhaka', 'rangpur').length, 1);
  assert.strictEqual(L.routesForPair('dhaka', 'dhaka').length, 0, 'same station');
  assert.strictEqual(L.routesForPair('sylhet', 'rangpur').length, 0, 'no verified route');
  assert.strictEqual(L.routesForPair('feni', 'sylhet').length, 0);
  // Both directions share the same fare.
  assert.strictEqual(L.fareFor('rangpur-dhaka', 'snigdha'), 875);
});

test('classesForRoute: only classes with a verified fare', () => {
  assert.deepStrictEqual(
    L.classesForRoute('dhaka-chattogram-stop').map((c) => c.id),
    ['shovon-chair', 'first-seat', 'snigdha', 'ac-seat', 'ac-berth'],
  );
  assert.deepStrictEqual(
    L.classesForRoute('dhaka-chattogram-nonstop').map((c) => c.id),
    ['shovon-chair', 'snigdha', 'ac-seat'],
  );
  assert.deepStrictEqual(
    L.classesForRoute('rangpur-dhaka').map((c) => c.id),
    ['shovon', 'shovon-chair', 'snigdha', 'ac-chair', 'ac-berth'],
  );
  assert.deepStrictEqual(L.classesForRoute('nope'), []);
});

const base = {
  from: 'dhaka', to: 'chattogram', routeId: 'dhaka-chattogram-stop',
  classId: 'shovon-chair', adults: 1, children39: 0, under3: 0, online: false,
};

test('calculate: single adult, no extras', () => {
  const r = L.calculate(base);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.breakdown.adultFare, 450);
  assert.strictEqual(r.breakdown.adultsSubtotal, 450);
  assert.strictEqual(r.breakdown.childrenSubtotal, 0);
  assert.strictEqual(r.breakdown.onlineFee, 0);
  assert.strictEqual(r.breakdown.total, 450);
  assert.strictEqual(r.breakdown.rounded, false);
});

test('calculate: child half-fare + rounding to whole taka', () => {
  // Snigdha 857: child = 428.5; 1 adult + 1 child = 1285.5 -> rounds to 1286.
  const r = L.calculate({ ...base, classId: 'snigdha', children39: 1 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.breakdown.childFare, 428.5);
  assert.strictEqual(r.breakdown.totalExact, 1285.5);
  assert.strictEqual(r.breakdown.rounded, true);
  assert.strictEqual(r.breakdown.total, 1286);
  // Even adult fare: 450/2 = 225 exactly, no rounding.
  const r2 = L.calculate({ ...base, adults: 2, children39: 2 });
  assert.strictEqual(r2.breakdown.total, 1350); // 900 + 450
  assert.strictEqual(r2.breakdown.rounded, false);
  // Non-stop Snigdha 943: 1 adult + 1 child = 943 + 471.5 = 1414.5 -> 1415.
  const r3 = L.calculate({ ...base, routeId: 'dhaka-chattogram-nonstop', classId: 'snigdha', children39: 1 });
  assert.strictEqual(r3.breakdown.total, 1415);
});

test('calculate: online fee per paying seat only', () => {
  // 2 adults AC Seat 1030 + online: 2060 + 2x20 = 2100.
  const r = L.calculate({ ...base, classId: 'ac-seat', adults: 2, online: true });
  assert.strictEqual(r.breakdown.onlineFee, 40);
  assert.strictEqual(r.breakdown.payingSeats, 2);
  assert.strictEqual(r.breakdown.total, 2100);
  // Children 3-9 count as paying seats; under-3s do not.
  const r2 = L.calculate({ ...base, adults: 1, children39: 1, under3: 2, online: true });
  assert.strictEqual(r2.breakdown.payingSeats, 2);
  assert.strictEqual(r2.breakdown.onlineFee, 40);
  assert.strictEqual(r2.breakdown.total, 450 + 225 + 40); // 715
  // No online: fee is 0 even with passengers.
  const r3 = L.calculate({ ...base, adults: 3, children39: 2, online: false });
  assert.strictEqual(r3.breakdown.onlineFee, 0);
  assert.strictEqual(r3.breakdown.total, 3 * 450 + 2 * 225); // 1800
});

test('calculate: under-3 free, children-only party allowed', () => {
  const r = L.calculate({ ...base, adults: 1, under3: 2 });
  assert.strictEqual(r.breakdown.total, 450, 'under-3 adds nothing');
  const r2 = L.calculate({ ...base, adults: 0, children39: 2 });
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(r2.breakdown.total, 450); // 2 x 225
});

test('calculate: every route/class spot-check totals', () => {
  const cases = [
    ['dhaka-sylhet', 'ac-berth', 1465],
    ['dhaka-dewanganj', 'shovon-chair', 255],
    ['chattogram-jamalpur', 'ac-berth', 1925],
    ['dhaka-coxsbazar', 'ac-berth', 2644],
    ['rangpur-dhaka', 'shovon', 385],
    ['rangpur-dhaka', 'ac-chair', 1050],
    ['feni-dhaka', 'first-seat', 506],
    ['dhaka-chattogram-nonstop', 'shovon-chair', 495],
  ];
  for (const [routeId, cls, fare] of cases) {
    const rt = L.routeById(routeId);
    const r = L.calculate({ ...base, from: rt.from, to: rt.to, routeId, classId: cls });
    assert.strictEqual(r.ok, true, routeId + '/' + cls);
    assert.strictEqual(r.breakdown.total, fare, routeId + '/' + cls);
  }
});

test('validateCalculation: all error paths', () => {
  const bad = [
    ['same station', { ...base, to: 'dhaka' }],
    ['no route for pair', { ...base, to: 'rangpur' }],
    ['unknown station', { ...base, from: 'khulna' }],
    ['unknown route', { ...base, routeId: 'dhaka-khulna' }],
    ['route/pair mismatch', { ...base, routeId: 'dhaka-sylhet' }],
    ['class with no fare on route', { ...base, classId: 'first-berth' }],
    ['unknown class', { ...base, classId: 'royal' }],
    ['zero paying passengers', { ...base, adults: 0, children39: 0, under3: 3 }],
    ['adults over 6', { ...base, adults: 7 }],
    ['negative children', { ...base, children39: -1 }],
    ['fractional adults', { ...base, adults: 1.5 }],
    ['non-integer under3', { ...base, under3: 'two' }],
  ];
  for (const [name, input] of bad) {
    assert.strictEqual(L.validateCalculation(input).ok, false, name + ' must be rejected');
    assert.strictEqual(L.calculate(input).ok, false, name + ' calculate must fail');
    assert.strictEqual(L.calculate(input).breakdown, null, name + ' breakdown null');
  }
  assert.strictEqual(L.validateCalculation(null).ok, false, 'null input');
  assert.strictEqual(L.validateCalculation(base).ok, true, 'valid input passes');
});

test('validateImport: valid round-trip + malformed cases', () => {
  const good = {
    app: 'train-fare-bd', version: 1,
    calcs: [{
      id: 'c1', name: 'Family', routeId: 'dhaka-coxsbazar', classId: 'snigdha',
      from: 'dhaka', to: 'coxsbazar', adults: 2, children39: 1, under3: 0, online: true,
      total: 4329, createdAt: '2026-11-11',
    }],
  };
  // 2x1443 + 721.5 + 3x20 = 2886 + 721.5 + 60 = 3667.5 -> 3668 (recomputed on import)
  const v = L.validateImport(JSON.parse(JSON.stringify(good)));
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.calcs.length, 1);
  assert.strictEqual(v.calcs[0].total, 3668, 'import recomputes total from the fare data');

  const bad = [
    ['not an object', 'hello'],
    ['null', null],
    ['array', []],
    ['wrong app', { app: 'train-schedule-bd', version: 1, calcs: [] }],
    ['wrong version', { app: 'train-fare-bd', version: 2, calcs: [] }],
    ['missing calcs', { app: 'train-fare-bd', version: 1 }],
    ['calcs not array', { app: 'train-fare-bd', version: 1, calcs: {} }],
    ['unknown route', { app: 'train-fare-bd', version: 1, calcs: [{ ...good.calcs[0], routeId: 'dhaka-khulna' }] }],
    ['unknown class', { app: 'train-fare-bd', version: 1, calcs: [{ ...good.calcs[0], classId: 'royal' }] }],
    ['class with no fare', { app: 'train-fare-bd', version: 1, calcs: [{ ...good.calcs[0], classId: 'first-berth' }] }],
    ['zero paying', { app: 'train-fare-bd', version: 1, calcs: [{ ...good.calcs[0], adults: 0, children39: 0 }] }],
    ['name too long', { app: 'train-fare-bd', version: 1, calcs: [{ ...good.calcs[0], name: 'x'.repeat(61) }] }],
    ['one good one bad', { app: 'train-fare-bd', version: 1, calcs: [good.calcs[0], { ...good.calcs[0], id: 'c2', routeId: 'nope' }] }],
  ];
  for (const [name, data] of bad) {
    assert.strictEqual(L.validateImport(data).ok, false, name + ' must be rejected');
  }
  assert.strictEqual(L.validateImport({ app: 'train-fare-bd', version: 1, calcs: [] }).ok, true, 'empty calcs valid');
});
