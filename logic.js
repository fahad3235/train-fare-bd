// train-fare-bd -- pure logic (node + browser).
// Dataset: verified one-way adult intercity fares in BDT, as reported
// Dec 2025 (post-pontage-charge change). See DATA_NOTES.md for every source
// and every conflict. A fare cell with no verified value is absent from the
// data (never invented): it renders as an em dash and is excluded from the
// calculator for that class. No First Berth fare is verified for any route.
(function (root) {
  'use strict';

  var STATIONS = [
    { id: 'dhaka', name_en: 'Dhaka', name_bn: '\u09a2\u09be\u0995\u09be' },
    { id: 'chattogram', name_en: 'Chattogram', name_bn: '\u099a\u099f\u09cd\u099f\u0997\u09cd\u09b0\u09be\u09ae' },
    { id: 'sylhet', name_en: 'Sylhet', name_bn: '\u09b8\u09bf\u09b2\u09c7\u099f' },
    { id: 'dewanganj', name_en: 'Dewanganj', name_bn: '\u09a6\u09c7\u0993\u09af\u09bc\u09be\u09a8\u0997\u099e\u09cd\u099c' },
    { id: 'jamalpur', name_en: 'Jamalpur', name_bn: '\u099c\u09be\u09ae\u09be\u09b2\u09aa\u09c1\u09b0' },
    { id: 'coxsbazar', name_en: "Cox's Bazar", name_bn: '\u0995\u0995\u09cd\u09b8\u09ac\u09be\u099c\u09be\u09b0' },
    { id: 'rangpur', name_en: 'Rangpur', name_bn: '\u09b0\u0982\u09aa\u09c1\u09b0' },
    { id: 'feni', name_en: 'Feni', name_bn: '\u09ab\u09c7\u09a8\u09c0' },
  ];

  // ac: 15% VAT is included in the fare of AC classes.
  var CLASSES = [
    { id: 'shovon', name_en: 'Shovon', name_bn: '\u09b6\u09cb\u09ad\u09a8', ac: false,
      desc_en: 'Budget bench seating, non-AC. The cheapest way to travel.',
      desc_bn: '\u09b8\u09be\u09b6\u09cd\u09b0\u09af\u09bc\u09c0 \u09ac\u09c7\u099e\u09cd\u099a \u0986\u09b8\u09a8, \u09a8\u09a8-\u098f\u09b8\u09bf\u0964 \u09b8\u09ac\u099a\u09c7\u09af\u09bc\u09c7 \u0995\u09ae \u0996\u09b0\u099a\u09c7 \u09ad\u09cd\u09b0\u09ae\u09a3\u09c7\u09b0 \u0989\u09aa\u09be\u09af\u09bc\u0964' },
    { id: 'shovon-chair', name_en: 'Shovon Chair', name_bn: '\u09b6\u09cb\u09ad\u09a8 \u099a\u09c7\u09af\u09bc\u09be\u09b0', ac: false,
      desc_en: 'Standard reclining chair, non-AC. The most common intercity class.',
      desc_bn: '\u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09b9\u09c7\u09b2\u09be\u09a8\u09cb \u099a\u09c7\u09af\u09bc\u09be\u09b0, \u09a8\u09a8-\u098f\u09b8\u09bf\u0964 \u0986\u09a8\u09cd\u09a4\u0983\u09a8\u0997\u09b0 \u099f\u09cd\u09b0\u09c7\u09a8\u09c7\u09b0 \u09b8\u09ac\u099a\u09c7\u09af\u09bc\u09c7 \u09aa\u09cd\u09b0\u099a\u09b2\u09bf\u09a4 \u09b6\u09cd\u09b0\u09c7\u09a3\u09bf\u0964' },
    { id: 'first-seat', name_en: 'First Seat', name_bn: '\u09aa\u09cd\u09b0\u09a5\u09ae \u09b6\u09cd\u09b0\u09c7\u09a3\u09bf\u09b0 \u0986\u09b8\u09a8', ac: false,
      desc_en: 'Non-AC first class seat, roomier than Shovon Chair, in a separate cabin.',
      desc_bn: '\u09a8\u09a8-\u098f\u09b8\u09bf \u09aa\u09cd\u09b0\u09a5\u09ae \u09b6\u09cd\u09b0\u09c7\u09a3\u09bf\u09b0 \u0986\u09b8\u09a8, \u09b6\u09cb\u09ad\u09a8 \u099a\u09c7\u09af\u09bc\u09be\u09b0\u09c7\u09b0 \u099a\u09c7\u09af\u09bc\u09c7 \u09aa\u09cd\u09b0\u09b6\u09b8\u09cd\u09a4, \u0986\u09b2\u09be\u09a6\u09be \u0995\u09c7\u09ac\u09bf\u09a8\u09c7\u0964' },
    { id: 'first-berth', name_en: 'First Berth', name_bn: '\u09aa\u09cd\u09b0\u09a5\u09ae \u09b6\u09cd\u09b0\u09c7\u09a3\u09bf\u09b0 \u09ac\u09be\u09b0\u09cd\u09a5', ac: false,
      desc_en: 'Non-AC first class sleeper berth for overnight journeys. No verified fare on any route in this app yet.',
      desc_bn: '\u09b0\u09be\u09a4\u09c7\u09b0 \u09af\u09be\u09a4\u09cd\u09b0\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u09a8\u09a8-\u098f\u09b8\u09bf \u09aa\u09cd\u09b0\u09a5\u09ae \u09b6\u09cd\u09b0\u09c7\u09a3\u09bf\u09b0 \u09b6\u09cb\u09af\u09bc\u09be\u09b0 \u09ac\u09be\u09b0\u09cd\u09a5\u0964 \u098f\u0987 \u0985\u09cd\u09af\u09be\u09aa\u09c7\u09b0 \u0995\u09cb\u09a8\u09cb \u09b0\u09c1\u099f\u09c7 \u098f\u09b0 \u09af\u09be\u099a\u09be\u0987\u0995\u09c3\u09a4 \u09ad\u09be\u09a1\u09bc\u09be \u098f\u0996\u09a8\u09cb \u09a8\u09c7\u0987\u0964' },
    { id: 'snigdha', name_en: 'Snigdha (AC Chair)', name_bn: '\u09b8\u09cd\u09a8\u09bf\u0997\u09cd\u09a7\u09be (\u098f\u09b8\u09bf \u099a\u09c7\u09af\u09bc\u09be\u09b0)', ac: true,
      desc_en: 'Air-conditioned chair car. 15% VAT is included in the fare.',
      desc_bn: '\u09b6\u09c0\u09a4\u09be\u09a4\u09aa \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09bf\u09a4 \u099a\u09c7\u09af\u09bc\u09be\u09b0 \u0995\u09cb\u099a\u0964 \u09ad\u09be\u09a1\u09bc\u09be\u09af\u09bc \u09e7\u09eb% \u09ad\u09cd\u09af\u09be\u099f \u0985\u09a8\u09cd\u09a4\u09b0\u09cd\u09ad\u09c1\u0995\u09cd\u09a4\u0964' },
    { id: 'ac-chair', name_en: 'AC Chair', name_bn: '\u098f\u09b8\u09bf \u099a\u09c7\u09af\u09bc\u09be\u09b0', ac: true,
      desc_en: 'Air-conditioned chair, listed as a separate class by the Rangpur route source. 15% VAT is included in the fare.',
      desc_bn: '\u09b6\u09c0\u09a4\u09be\u09a4\u09aa \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09bf\u09a4 \u099a\u09c7\u09af\u09bc\u09be\u09b0, \u09b0\u0982\u09aa\u09c1\u09b0 \u09b0\u09c1\u099f\u09c7\u09b0 \u0989\u09ce\u09b8\u09c7 \u0986\u09b2\u09be\u09a6\u09be \u09b6\u09cd\u09b0\u09c7\u09a3\u09bf \u09b9\u09bf\u09b8\u09c7\u09ac\u09c7 \u09a4\u09be\u09b2\u09bf\u0995\u09be\u09ad\u09c1\u0995\u09cd\u09a4\u0964 \u09ad\u09be\u09a1\u09bc\u09be\u09af\u09bc \u09e7\u09eb% \u09ad\u09cd\u09af\u09be\u099f \u0985\u09a8\u09cd\u09a4\u09b0\u09cd\u09ad\u09c1\u0995\u09cd\u09a4\u0964' },
    { id: 'ac-seat', name_en: 'AC Seat', name_bn: '\u098f\u09b8\u09bf \u09b8\u09bf\u099f', ac: true,
      desc_en: 'Air-conditioned reclining seat in a cabin. 15% VAT is included in the fare.',
      desc_bn: '\u0995\u09c7\u09ac\u09bf\u09a8\u09c7 \u09b6\u09c0\u09a4\u09be\u09a4\u09aa \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09bf\u09a4 \u09b9\u09c7\u09b2\u09be\u09a8\u09cb \u0986\u09b8\u09a8\u0964 \u09ad\u09be\u09a1\u09bc\u09be\u09af\u09bc \u09e7\u09eb% \u09ad\u09cd\u09af\u09be\u099f \u0985\u09a8\u09cd\u09a4\u09b0\u09cd\u09ad\u09c1\u0995\u09cd\u09a4\u0964' },
    { id: 'ac-berth', name_en: 'AC Berth', name_bn: '\u098f\u09b8\u09bf \u09ac\u09be\u09b0\u09cd\u09a5', ac: true,
      desc_en: 'Air-conditioned sleeper berth for overnight journeys. 15% VAT is included in the fare.',
      desc_bn: '\u09b0\u09be\u09a4\u09c7\u09b0 \u09af\u09be\u09a4\u09cd\u09b0\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u09b6\u09c0\u09a4\u09be\u09a4\u09aa \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09bf\u09a4 \u09b6\u09cb\u09af\u09bc\u09be\u09b0 \u09ac\u09be\u09b0\u09cd\u09a5\u0964 \u09ad\u09be\u09a1\u09bc\u09be\u09af\u09bc \u09e7\u09eb% \u09ad\u09cd\u09af\u09be\u099f \u0985\u09a8\u09cd\u09a4\u09b0\u09cd\u09ad\u09c1\u0995\u09cd\u09a4\u0964' },
  ];

  // flags: estimated = source labels the fares estimated;
  // singleSource = only one source found, verify before paying;
  // varies: { classId: note } = sources disagree on that cell.
  // fares: one-way adult fare in BDT. Both directions share the same fare.
  var ROUTES = [
    { id: 'dhaka-chattogram-stop', from: 'dhaka', to: 'chattogram',
      variant_en: 'Stoppage (all intercity trains)', variant_bn: '\u09b8\u09ac \u09b8\u09cd\u099f\u09aa\u09c7\u099c (\u09b8\u09ac \u0986\u09a8\u09cd\u09a4\u0983\u09a8\u0997\u09b0 \u099f\u09cd\u09b0\u09c7\u09a8)',
      trains_en: 'All stoppage intercity trains', trains_bn: '\u09b8\u09ac \u09b8\u09cd\u099f\u09aa\u09c7\u099c \u0986\u09a8\u09cd\u09a4\u0983\u09a8\u0997\u09b0 \u099f\u09cd\u09b0\u09c7\u09a8',
      fares: { 'shovon-chair': 450, 'first-seat': 685, 'snigdha': 857, 'ac-seat': 1030, 'ac-berth': 1591 } },
    { id: 'dhaka-chattogram-nonstop', from: 'dhaka', to: 'chattogram',
      variant_en: 'Non-stop (Subarna 701/702 & Sonar Bangla 787/788)', variant_bn: '\u09a8\u09a8-\u09b8\u09cd\u099f\u09aa (\u09b8\u09c1\u09ac\u09b0\u09cd\u09a3\u09be \u09ed\u09e6\u09e7/\u09ed\u09e6\u09e8 \u0993 \u09b8\u09cb\u09a8\u09be\u09b0 \u09ac\u09be\u0982\u09b2\u09be \u09ed\u09ee\u09ed/\u09ed\u09ee\u09ee)',
      trains_en: 'Subarna 701/702, Sonar Bangla 787/788', trains_bn: '\u09b8\u09c1\u09ac\u09b0\u09cd\u09a3\u09be \u09ed\u09e6\u09e7/\u09ed\u09e6\u09e8, \u09b8\u09cb\u09a8\u09be\u09b0 \u09ac\u09be\u0982\u09b2\u09be \u09ed\u09ee\u09ed/\u09ed\u09ee\u09ee',
      fares: { 'shovon-chair': 495, 'snigdha': 943, 'ac-seat': 1133 } },
    { id: 'dhaka-sylhet', from: 'dhaka', to: 'sylhet',
      variant_en: '', variant_bn: '',
      trains_en: 'Parabat, Jayantika, Kalni, Upaban', trains_bn: '\u09aa\u09be\u09b0\u09be\u09ac\u09a4, \u099c\u09af\u09bc\u09a8\u09cd\u09a4\u09bf\u0995\u09be, \u0995\u09be\u09b2\u09a8\u09c0, \u0989\u09aa\u09ac\u09a8',
      fares: { 'shovon-chair': 410, 'snigdha': 788, 'ac-seat': 943, 'ac-berth': 1465 } },
    { id: 'dhaka-dewanganj', from: 'dhaka', to: 'dewanganj',
      variant_en: '', variant_bn: '',
      trains_en: 'Tista, Brahmaputra, Dewanganj Express', trains_bn: '\u09a4\u09bf\u09b8\u09cd\u09a4\u09be, \u09ac\u09cd\u09b0\u09b9\u09cd\u09ae\u09aa\u09c1\u09a4\u09cd\u09b0, \u09a6\u09c7\u0993\u09af\u09bc\u09be\u09a8\u0997\u099e\u09cd\u099c \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b0\u09c7\u09b8',
      fares: { 'shovon-chair': 255, 'snigdha': 489, 'ac-seat': 587, 'ac-berth': 924 } },
    { id: 'chattogram-jamalpur', from: 'chattogram', to: 'jamalpur',
      variant_en: '', variant_bn: '',
      trains_en: 'Bijoy Express', trains_bn: '\u09ac\u09bf\u099c\u09af\u09bc \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b0\u09c7\u09b8',
      fares: { 'shovon-chair': 545, 'snigdha': 1041, 'ac-seat': 1254, 'ac-berth': 1925 } },
    { id: 'dhaka-coxsbazar', from: 'dhaka', to: 'coxsbazar',
      variant_en: 'Non-stop', variant_bn: '\u09a8\u09a8-\u09b8\u09cd\u099f\u09aa',
      trains_en: 'Parjatak Express, Cox\'s Bazar Express', trains_bn: '\u09aa\u09b0\u09cd\u09af\u099f\u0995 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b0\u09c7\u09b8, \u0995\u0995\u09cd\u09b8\u09ac\u09be\u099c\u09be\u09b0 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b0\u09c7\u09b8',
      fares: { 'shovon-chair': 754, 'snigdha': 1443, 'ac-seat': 1728, 'ac-berth': 2644 },
      varies: { 'snigdha': 'Reports vary: 1443, 1449 and 1450 have all been reported for Snigdha on this route.' } },
    { id: 'rangpur-dhaka', from: 'rangpur', to: 'dhaka',
      variant_en: '', variant_bn: '',
      trains_en: 'Rangpur Express', trains_bn: '\u09b0\u0982\u09aa\u09c1\u09b0 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b0\u09c7\u09b8',
      fares: { 'shovon': 385, 'shovon-chair': 460, 'snigdha': 875, 'ac-chair': 1050, 'ac-berth': 1575 },
      estimated: true },
    { id: 'feni-dhaka', from: 'feni', to: 'dhaka',
      variant_en: '', variant_bn: '',
      trains_en: 'Mahanagar, Turna, Chattala (via Feni)', trains_bn: '\u09ae\u09b9\u09be\u09a8\u0997\u09b0, \u09a4\u09c2\u09b0\u09cd\u09a3\u09be, \u099a\u099f\u09cd\u099f\u09b2\u09be (\u09ab\u09c7\u09a8\u09c0 \u09b9\u09af\u09bc\u09c7)',
      fares: { 'shovon-chair': 330, 'first-seat': 506, 'snigdha': 633, 'ac-seat': 759 },
      singleSource: true },
  ];

  var APP_ID = 'train-fare-bd';
  var EXPORT_VERSION = 1;
  var ONLINE_FEE_PER_SEAT = 20; // BDT per paying seat, online booking only
  var CHILD_MIN_AGE = 3; // children under 3 travel free
  var CHILD_MAX_AGE = 9; // children 3-9 pay half fare; 10+ pay adult fare
  var MAX_PASSENGERS = 6;

  function stationById(id) {
    for (var i = 0; i < STATIONS.length; i++) if (STATIONS[i].id === id) return STATIONS[i];
    return null;
  }

  function classById(id) {
    for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].id === id) return CLASSES[i];
    return null;
  }

  function routeById(id) {
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i];
    return null;
  }

  // Routes for an unordered station pair (either direction).
  function routesForPair(from, to) {
    if (!from || !to || from === to) return [];
    return ROUTES.filter(function (r) {
      return (r.from === from && r.to === to) || (r.from === to && r.to === from);
    });
  }

  function fareFor(routeId, classId) {
    var r = routeById(routeId);
    if (!r) return null;
    var f = r.fares[classId];
    return typeof f === 'number' ? f : null;
  }

  function classesForRoute(routeId) {
    var r = routeById(routeId);
    if (!r) return [];
    return CLASSES.filter(function (c) { return typeof r.fares[c.id] === 'number'; });
  }

  function routeLabel(route) {
    var a = stationById(route.from), b = stationById(route.to);
    var label = (a ? a.name_en : route.from) + ' - ' + (b ? b.name_en : route.to);
    if (route.variant_en) label += ' (' + route.variant_en + ')';
    return label;
  }

  function isIntInRange(v, min, max) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= min && v <= max;
  }

  // Validate a calculator input. Returns { ok, errors }.
  function validateCalculation(input) {
    var errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['Calculation must be an object.'] };
    if (!stationById(input.from)) errors.push('Unknown departure station.');
    if (!stationById(input.to)) errors.push('Unknown destination station.');
    if (input.from && input.to && input.from === input.to) errors.push('Pick two different stations.');
    var routes = routesForPair(input.from, input.to);
    if (input.from && input.to && input.from !== input.to && routes.length === 0) errors.push('No verified fare for this station pair.');
    var route = routeById(input.routeId);
    if (!input.routeId || !route) errors.push('Pick a route.');
    else if (routes.indexOf(route) === -1) errors.push('Route does not match the station pair.');
    if (!input.classId || !classById(input.classId)) errors.push('Pick a seat class.');
    else if (route && fareFor(route.id, input.classId) === null) errors.push('That class has no verified fare on this route.');
    if (!isIntInRange(input.adults, 0, MAX_PASSENGERS)) errors.push('Adults must be a whole number from 0 to 6.');
    if (!isIntInRange(input.children39, 0, MAX_PASSENGERS)) errors.push('Children (3-9) must be a whole number from 0 to 6.');
    if (!isIntInRange(input.under3, 0, MAX_PASSENGERS)) errors.push('Children under 3 must be a whole number from 0 to 6.');
    if (isIntInRange(input.adults, 0, MAX_PASSENGERS) && isIntInRange(input.children39, 0, MAX_PASSENGERS) &&
        input.adults + input.children39 < 1) errors.push('At least 1 paying passenger is required.');
    if (input.online !== undefined && typeof input.online !== 'boolean') errors.push('Online booking flag must be true or false.');
    return { ok: errors.length === 0, errors: errors };
  }

  // Fare math. Child (3-9) fare is exactly half the adult fare; the GRAND
  // TOTAL is rounded to the nearest whole taka at the end (a half-taka child
  // fare can make the unrounded total end in .5). Under-3s are free.
  // Returns { ok, errors, breakdown } where breakdown is null when invalid.
  function calculate(input) {
    var v = validateCalculation(input);
    if (!v.ok) return { ok: false, errors: v.errors, breakdown: null };
    var adultFare = fareFor(input.routeId, input.classId);
    var childFare = adultFare / 2;
    var adultsSubtotal = adultFare * input.adults;
    var childrenSubtotal = childFare * input.children39;
    var payingSeats = input.adults + input.children39;
    var onlineFee = input.online ? ONLINE_FEE_PER_SEAT * payingSeats : 0;
    var totalExact = adultsSubtotal + childrenSubtotal + onlineFee;
    var total = Math.round(totalExact);
    return {
      ok: true,
      errors: [],
      breakdown: {
        routeId: input.routeId,
        classId: input.classId,
        from: input.from,
        to: input.to,
        adults: input.adults,
        children39: input.children39,
        under3: input.under3,
        online: !!input.online,
        adultFare: adultFare,
        childFare: childFare,
        adultsSubtotal: adultsSubtotal,
        childrenSubtotal: childrenSubtotal,
        payingSeats: payingSeats,
        onlineFee: onlineFee,
        totalExact: totalExact,
        rounded: totalExact !== total,
        total: total,
      },
    };
  }

  // Validate one saved calculation (used by the UI save path and by import).
  function validateSavedCalc(c) {
    var errors = [];
    if (!c || typeof c !== 'object' || Array.isArray(c)) return { ok: false, errors: ['Saved calculation must be an object.'] };
    var v = validateCalculation(c);
    if (!v.ok) errors = errors.concat(v.errors);
    if (c.id !== undefined && typeof c.id !== 'string') errors.push('Saved id must be a string.');
    if (c.name !== undefined && c.name !== null && (typeof c.name !== 'string' || c.name.length > 60)) errors.push('Name must be at most 60 characters.');
    if (c.total !== undefined && (typeof c.total !== 'number' || !isFinite(c.total) || c.total < 0)) errors.push('Total must be a non-negative number.');
    if (c.createdAt !== undefined && typeof c.createdAt !== 'string') errors.push('createdAt must be a string.');
    return { ok: errors.length === 0, errors: errors };
  }

  // Strict import validation. Returns { ok, errors, calcs }.
  // Data is never mutated on failure: the caller keeps its own copy.
  function validateImport(data) {
    var errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['Import must be a JSON object.'], calcs: null };
    if (data.app !== APP_ID) return { ok: false, errors: ['Not a train-fare-bd file (app mismatch).'], calcs: null };
    if (data.version !== EXPORT_VERSION) return { ok: false, errors: ['Unsupported version (expected 1).'], calcs: null };
    if (!Array.isArray(data.calcs)) return { ok: false, errors: ['"calcs" must be an array.'], calcs: null };
    var calcs = [];
    for (var i = 0; i < data.calcs.length; i++) {
      var c = data.calcs[i];
      var v = validateSavedCalc(c);
      if (!v.ok) { errors.push('Calculation ' + (i + 1) + ': ' + v.errors.join(' ')); continue; }
      var calc = calculate(c);
      if (!calc.ok) { errors.push('Calculation ' + (i + 1) + ': ' + calc.errors.join(' ')); continue; }
      calcs.push({
        id: typeof c.id === 'string' ? c.id : ('imported-' + i + '-' + Date.now()),
        name: typeof c.name === 'string' ? c.name : '',
        routeId: c.routeId,
        classId: c.classId,
        from: c.from,
        to: c.to,
        adults: c.adults,
        children39: c.children39,
        under3: c.under3,
        online: !!c.online,
        total: calc.breakdown.total,
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : '',
      });
    }
    if (errors.length) return { ok: false, errors: errors, calcs: null };
    return { ok: true, errors: [], calcs: calcs };
  }

  // Flat fare-table rows for the Fare Table tab: one row per verified fare.
  function fareTableRows() {
    var rows = [];
    ROUTES.forEach(function (r) {
      Object.keys(r.fares).forEach(function (classId) {
        rows.push({ routeId: r.id, classId: classId, fare: r.fares[classId] });
      });
    });
    return rows;
  }

  var api = {
    STATIONS: STATIONS,
    CLASSES: CLASSES,
    ROUTES: ROUTES,
    APP_ID: APP_ID,
    EXPORT_VERSION: EXPORT_VERSION,
    ONLINE_FEE_PER_SEAT: ONLINE_FEE_PER_SEAT,
    CHILD_MIN_AGE: CHILD_MIN_AGE,
    CHILD_MAX_AGE: CHILD_MAX_AGE,
    MAX_PASSENGERS: MAX_PASSENGERS,
    stationById: stationById,
    classById: classById,
    routeById: routeById,
    routesForPair: routesForPair,
    fareFor: fareFor,
    classesForRoute: classesForRoute,
    routeLabel: routeLabel,
    validateCalculation: validateCalculation,
    calculate: calculate,
    validateSavedCalc: validateSavedCalc,
    validateImport: validateImport,
    fareTableRows: fareTableRows,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrainFareLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
