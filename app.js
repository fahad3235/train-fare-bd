// train-fare-bd -- UI wiring. Pure static, zero network requests.
(function () {
  'use strict';
  var L = window.TrainFareLogic;
  var I = window.TrainFareI18n;
  var $ = function (id) { return document.getElementById(id); };

  var LANG_KEY = 'tfbd.lang';
  var CALCS_KEY = 'tfbd.calcs';
  var state = {
    lang: 'en',
    calcs: [],
    tableSearch: '',
    breakdown: null,
  };
  try {
    var savedLang = window.localStorage.getItem(LANG_KEY);
    if (savedLang === 'bn' || savedLang === 'en') state.lang = savedLang;
  } catch (e) { /* storage unavailable */ }
  try {
    var raw = window.localStorage.getItem(CALCS_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.calcs = parsed.filter(function (c) { return L.validateSavedCalc(c).ok; });
      }
    }
  } catch (e) { state.calcs = []; }

  function saveCalcs() {
    try { window.localStorage.setItem(CALCS_KEY, JSON.stringify(state.calcs)); } catch (e) { /* ignore */ }
  }
  function saveLang() {
    try { window.localStorage.setItem(LANG_KEY, state.lang); } catch (e) { /* ignore */ }
  }

  function t(key) { return I.t(state.lang, key); }
  function loc(s) { return I.loc(state.lang, s); }
  function money(n) { return I.formatTaka(state.lang, n); }
  function stationName(id) {
    var st = L.stationById(id);
    return st ? I.stationName(state.lang, st) : id;
  }
  function className(id) {
    var c = L.classById(id);
    return c ? I.className(state.lang, c) : id;
  }
  function routeVariant(route) {
    return state.lang === 'bn' ? route.variant_bn : route.variant_en;
  }
  function routeDisplay(route) {
    var label = stationName(route.from) + ' \u2013 ' + stationName(route.to);
    var v = routeVariant(route);
    if (v) label += ' (' + v + ')';
    return label;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- static i18n ----------
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    $('langBtn').textContent = t('langBtn');
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    populateStationSelects();
    populateRouteSelect();
    populateClassSelect();
    renderTable();
    renderClasses();
    renderSaved();
    if (state.breakdown) renderResult(state.breakdown);
  }

  // ---------- selects ----------
  function populateStationSelects() {
    [['fromSelect', 'dhaka'], ['toSelect', 'chattogram']].forEach(function (pair) {
      var sel = $(pair[0]);
      var cur = sel.value || pair[1];
      sel.innerHTML = '';
      L.STATIONS.forEach(function (st) {
        var o = document.createElement('option');
        o.value = st.id;
        o.textContent = I.stationName(state.lang, st);
        sel.appendChild(o);
      });
      sel.value = cur;
    });
  }

  function currentRoutes() {
    return L.routesForPair($('fromSelect').value, $('toSelect').value);
  }

  function populateRouteSelect() {
    var sel = $('routeSelect');
    var cur = sel.value;
    var routes = currentRoutes();
    sel.innerHTML = '';
    if (!routes.length) {
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = t('noRoute');
      sel.appendChild(o0);
      sel.value = '';
      return;
    }
    routes.forEach(function (r) {
      var o = document.createElement('option');
      o.value = r.id;
      o.textContent = routeDisplay(r);
      sel.appendChild(o);
    });
    sel.value = routes.some(function (r) { return r.id === cur; }) ? cur : routes[0].id;
  }

  function populateClassSelect() {
    var sel = $('classSelect');
    var cur = sel.value;
    var routeId = $('routeSelect').value;
    var classes = L.classesForRoute(routeId);
    sel.innerHTML = '';
    if (!classes.length) {
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = t('noClassFare');
      sel.appendChild(o0);
      sel.value = '';
      return;
    }
    classes.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = I.className(state.lang, c) + ' \u2014 ' + money(L.fareFor(routeId, c.id));
      sel.appendChild(o);
    });
    sel.value = classes.some(function (c) { return c.id === cur; }) ? cur : classes[0].id;
  }

  function refreshRouteAndClass() {
    populateRouteSelect();
    populateClassSelect();
  }

  function readForm() {
    return {
      from: $('fromSelect').value,
      to: $('toSelect').value,
      routeId: $('routeSelect').value,
      classId: $('classSelect').value,
      adults: parseInt($('adultsInput').value, 10),
      children39: parseInt($('childrenInput').value, 10),
      under3: parseInt($('under3Input').value, 10),
      online: $('onlineCheck').checked,
    };
  }

  function setForm(c) {
    $('fromSelect').value = c.from;
    $('toSelect').value = c.to;
    populateRouteSelect();
    if (c.routeId) $('routeSelect').value = c.routeId;
    populateClassSelect();
    if (c.classId) $('classSelect').value = c.classId;
    $('adultsInput').value = c.adults;
    $('childrenInput').value = c.children39;
    $('under3Input').value = c.under3;
    $('onlineCheck').checked = !!c.online;
  }

  // ---------- calculator ----------
  function renderResult(b) {
    var box = $('resultBox');
    box.hidden = false;
    var route = L.routeById(b.routeId);
    $('resultRoute').textContent = routeDisplay(route) + ' \u00b7 ' + className(b.classId);
    var rows = '';
    rows += '<tr><th>' + escapeHtml(t('adultFare')) + ' (' + escapeHtml(t('perPerson')) + ')</th><td>' + escapeHtml(money(b.adultFare)) + '</td></tr>';
    rows += '<tr><th>' + escapeHtml(t('adultsSubtotal')) + ' (' + loc(String(b.adults)) + ' \u00d7 ' + escapeHtml(money(b.adultFare)) + ')</th><td>' + escapeHtml(money(b.adultsSubtotal)) + '</td></tr>';
    if (b.children39 > 0) {
      rows += '<tr><th>' + escapeHtml(t('childFare')) + ' (' + escapeHtml(t('perPerson')) + ')</th><td>' + escapeHtml(money(b.childFare)) + '</td></tr>';
      rows += '<tr><th>' + escapeHtml(t('childrenSubtotal')) + ' (' + loc(String(b.children39)) + ' \u00d7 ' + escapeHtml(money(b.childFare)) + ')</th><td>' + escapeHtml(money(b.childrenSubtotal)) + '</td></tr>';
    }
    if (b.under3 > 0) {
      rows += '<tr><th>' + escapeHtml(t('under3')) + ' (' + loc(String(b.under3)) + ')</th><td>' + escapeHtml(t('freeLabel')) + '</td></tr>';
    }
    if (b.online) {
      rows += '<tr><th>' + escapeHtml(t('onlineFee')) + ' (' + loc(String(b.payingSeats)) + ' \u00d7 ' + escapeHtml(money(L.ONLINE_FEE_PER_SEAT)) + ')</th><td>' + escapeHtml(money(b.onlineFee)) + '</td></tr>';
    }
    $('breakdownBody').innerHTML = rows;
    $('grandTotalCell').textContent = money(b.total);
    $('roundingNote').hidden = !b.rounded;
    $('saveMsg').hidden = true;
  }

  function doCalculate() {
    var input = readForm();
    // Clamp NaN counts to 0 so validation reports the real problem.
    ['adults', 'children39', 'under3'].forEach(function (k) {
      if (isNaN(input[k])) input[k] = -1;
    });
    var res = L.calculate(input);
    var err = $('calcError');
    if (!res.ok) {
      err.textContent = res.errors.join(' ');
      err.hidden = false;
      $('resultBox').hidden = true;
      state.breakdown = null;
      return null;
    }
    err.hidden = true;
    state.breakdown = res.breakdown;
    renderResult(res.breakdown);
    return res.breakdown;
  }

  // ---------- fare table ----------
  function routeBadges(route) {
    var badges = [];
    if (route.estimated) badges.push({ cls: 'badge estimated', text: t('badgeEstimated') });
    if (route.singleSource) badges.push({ cls: 'badge single', text: t('badgeSingleSource') });
    return badges;
  }

  function renderTable() {
    var q = state.tableSearch.trim().toLowerCase();
    var rows = L.fareTableRows();
    var body = $('fareTableBody');
    body.innerHTML = '';
    var shown = 0;
    rows.forEach(function (row) {
      var route = L.routeById(row.routeId);
      var cls = L.classById(row.classId);
      if (q) {
        var hay = (stationName(route.from) + ' ' + stationName(route.to) + ' ' +
          L.stationById(route.from).name_en + ' ' + L.stationById(route.to).name_en + ' ' +
          className(row.classId) + ' ' + cls.name_en + ' ' + cls.name_bn + ' ' +
          L.stationById(route.from).name_bn + ' ' + L.stationById(route.to).name_bn).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      shown++;
      var tr = document.createElement('tr');
      tr.className = 'fare-row';
      tr.setAttribute('data-route-id', row.routeId);
      tr.setAttribute('data-class-id', row.classId);
      tr.tabIndex = 0;
      var tdRoute = document.createElement('td');
      tdRoute.textContent = routeDisplay(route);
      var trains = document.createElement('div');
      trains.className = 'route-trains';
      trains.textContent = t('routeTrains') + ': ' + (state.lang === 'bn' ? route.trains_bn : route.trains_en);
      tdRoute.appendChild(trains);
      routeBadges(route).forEach(function (b) {
        var s = document.createElement('span');
        s.className = b.cls;
        s.textContent = b.text;
        tdRoute.appendChild(s);
      });
      if (route.varies && route.varies[row.classId]) {
        var v = document.createElement('span');
        v.className = 'badge varies';
        v.textContent = t('badgeVaries');
        v.title = route.varies[row.classId];
        tdRoute.appendChild(v);
      }
      tr.appendChild(tdRoute);
      var tdClass = document.createElement('td');
      tdClass.textContent = className(row.classId);
      tr.appendChild(tdClass);
      var tdFare = document.createElement('td');
      tdFare.className = 'fare-cell';
      tdFare.textContent = money(row.fare);
      tr.appendChild(tdFare);
      tr.addEventListener('click', function () { loadRowIntoCalculator(row.routeId, row.classId); });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') loadRowIntoCalculator(row.routeId, row.classId);
      });
      body.appendChild(tr);
    });
    $('tableCount').textContent = loc(String(shown)) + ' / ' + loc(String(rows.length)) + ' ' + t('tableCount');
    $('tableEmpty').hidden = shown > 0;
  }

  function loadRowIntoCalculator(routeId, classId) {
    var route = L.routeById(routeId);
    if (!route) return;
    setForm({
      from: route.from, to: route.to, routeId: routeId, classId: classId,
      adults: parseInt($('adultsInput').value, 10) || 1,
      children39: parseInt($('childrenInput').value, 10) || 0,
      under3: parseInt($('under3Input').value, 10) || 0,
      online: $('onlineCheck').checked,
    });
    switchTab('calc');
    doCalculate();
    var msg = $('saveMsg');
    msg.textContent = t('calcLoaded');
    msg.hidden = false;
  }

  // ---------- class guide ----------
  function renderClasses() {
    var wrap = $('classList');
    wrap.innerHTML = '';
    L.CLASSES.forEach(function (cls) {
      var card = document.createElement('div');
      card.className = 'class-card';
      card.setAttribute('data-class-id', cls.id);
      var head = document.createElement('div');
      head.className = 'train-head';
      var name = document.createElement('span');
      name.className = 'train-name';
      name.textContent = I.className(state.lang, cls);
      head.appendChild(name);
      var vat = document.createElement('span');
      vat.className = 'badge ' + (cls.ac ? 'ac' : '');
      vat.textContent = cls.ac ? t('vatIncluded') : t('noVat');
      head.appendChild(vat);
      card.appendChild(head);
      var desc = document.createElement('p');
      desc.className = 'class-desc';
      desc.textContent = state.lang === 'bn' ? cls.desc_bn : cls.desc_en;
      card.appendChild(desc);
      var routes = L.ROUTES.filter(function (r) { return typeof r.fares[cls.id] === 'number'; });
      var offered = document.createElement('p');
      offered.className = 'class-routes';
      offered.textContent = routes.length
        ? routes.map(function (r) { return routeDisplay(r) + ': ' + money(r.fares[cls.id]); }).join('  \u00b7  ')
        : t('noFare');
      card.appendChild(offered);
      wrap.appendChild(card);
    });
  }

  // ---------- saved calculations ----------
  function renderSaved() {
    var wrap = $('savedList');
    wrap.innerHTML = '';
    $('savedEmpty').hidden = state.calcs.length > 0;
    state.calcs.forEach(function (c) {
      var route = L.routeById(c.routeId);
      if (!route) return;
      var card = document.createElement('div');
      card.className = 'trip-card';
      card.setAttribute('data-calc-id', c.id);
      var head = document.createElement('div');
      head.className = 'train-head';
      var name = document.createElement('span');
      name.className = 'train-name';
      name.textContent = c.name || (routeDisplay(route) + ' \u00b7 ' + className(c.classId));
      head.appendChild(name);
      var total = document.createElement('span');
      total.className = 'train-no total-strong';
      total.textContent = money(c.total);
      head.appendChild(total);
      card.appendChild(head);
      var det = document.createElement('p');
      det.className = 'trip-detail';
      det.textContent = routeDisplay(route) + ' \u00b7 ' + className(c.classId) + ' \u00b7 ' +
        loc(String(c.adults)) + ' adult' + (c.adults === 1 ? '' : 's') +
        (c.children39 ? ' + ' + loc(String(c.children39)) + ' child(3-9)' : '') +
        (c.under3 ? ' + ' + loc(String(c.under3)) + ' under-3' : '') +
        (c.online ? ' \u00b7 online' : '');
      card.appendChild(det);
      if (c.createdAt) {
        var d = document.createElement('p');
        d.className = 'trip-detail';
        d.textContent = t('savedOn') + ': ' + c.createdAt;
        card.appendChild(d);
      }
      var row = document.createElement('div');
      row.className = 'row-btns';
      var load = document.createElement('button');
      load.type = 'button';
      load.className = 'save-btn';
      load.textContent = t('loadBtn');
      load.addEventListener('click', function () {
        setForm(c);
        switchTab('calc');
        doCalculate();
      });
      row.appendChild(load);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete-btn';
      del.textContent = t('deleteBtn');
      del.addEventListener('click', function () {
        state.calcs = state.calcs.filter(function (x) { return x.id !== c.id; });
        saveCalcs();
        renderSaved();
      });
      row.appendChild(del);
      card.appendChild(row);
      wrap.appendChild(card);
    });
  }

  // ---------- data: export / import / erase ----------
  function exportPayload() {
    return JSON.stringify({ app: L.APP_ID, version: L.EXPORT_VERSION, calcs: state.calcs }, null, 2);
  }
  function importPayload(text) {
    var data;
    try { data = JSON.parse(text); }
    catch (e) { return { ok: false, errors: ['Not valid JSON.'] }; }
    var v = L.validateImport(data);
    if (!v.ok) return v;
    state.calcs = v.calcs;
    saveCalcs();
    renderSaved();
    return { ok: true, errors: [], calcs: v.calcs };
  }
  function eraseAll() {
    state.calcs = [];
    saveCalcs();
    renderSaved();
    return true;
  }

  // ---------- tabs ----------
  var TABS = ['calc', 'table', 'classes', 'rules', 'data'];
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    TABS.forEach(function (n) { $('tab-' + n).hidden = n !== name; });
    if (name === 'table') renderTable();
    if (name === 'classes') renderClasses();
    if (name === 'data') renderSaved();
  }
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
  });

  // ---------- events ----------
  $('calcForm').addEventListener('submit', function (e) { e.preventDefault(); doCalculate(); });
  $('fromSelect').addEventListener('change', refreshRouteAndClass);
  $('toSelect').addEventListener('change', refreshRouteAndClass);
  $('routeSelect').addEventListener('change', populateClassSelect);
  $('swapBtn').addEventListener('click', function () {
    var f = $('fromSelect'), to = $('toSelect');
    var tmp = f.value; f.value = to.value; to.value = tmp;
    refreshRouteAndClass();
  });
  $('saveCalcBtn').addEventListener('click', function () {
    var b = state.breakdown || doCalculate();
    if (!b) return;
    var calc = {
      id: 'calc-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      name: $('calcName').value.trim(),
      routeId: b.routeId,
      classId: b.classId,
      from: b.from,
      to: b.to,
      adults: b.adults,
      children39: b.children39,
      under3: b.under3,
      online: b.online,
      total: b.total,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    var v = L.validateSavedCalc(calc);
    if (!v.ok) {
      var err = $('calcError');
      err.textContent = v.errors.join(' ');
      err.hidden = false;
      return;
    }
    state.calcs.push(calc);
    saveCalcs();
    renderSaved();
    $('calcName').value = '';
    var msg = $('saveMsg');
    msg.textContent = t('savedCalc');
    msg.hidden = false;
  });
  $('tableSearch').addEventListener('input', function (e) { state.tableSearch = e.target.value; renderTable(); });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'en' ? 'bn' : 'en';
    saveLang();
    applyI18n();
  });
  $('exportBtn').addEventListener('click', function () {
    var blob = new Blob([exportPayload()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'train-fare-bd-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    var m = $('exportMsg');
    m.textContent = t('exportDone');
    m.hidden = false;
  });
  $('importBtn').addEventListener('click', function () {
    var okEl = $('importOk'), failEl = $('importFail');
    okEl.hidden = true; failEl.hidden = true;
    var res = importPayload($('importText').value);
    if (res.ok) { okEl.textContent = t('importOk'); okEl.hidden = false; }
    else { failEl.textContent = t('importFail') + res.errors.join(' '); failEl.hidden = false; }
  });
  $('importFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { $('importText').value = String(reader.result || ''); };
    reader.readAsText(file);
  });
  $('eraseBtn').addEventListener('click', function () {
    var wrong = $('eraseWrong'), done = $('erasedMsg');
    wrong.hidden = true; done.hidden = true;
    if ($('eraseInput').value !== 'DELETE') {
      wrong.textContent = t('eraseWrong');
      wrong.hidden = false;
      return;
    }
    eraseAll();
    $('eraseInput').value = '';
    done.textContent = t('erased');
    done.hidden = false;
  });

  // ---------- init ----------
  applyI18n();

  // Test hooks (used by tests/smoke.js; harmless in production use).
  window.__tfbd = {
    state: state,
    exportPayload: exportPayload,
    importPayload: importPayload,
    eraseAll: eraseAll,
    doCalculate: doCalculate,
    setForm: setForm,
    switchTab: switchTab,
  };
})();
