// train-fare-bd -- headless-Chrome smoke test via raw CDP (no puppeteer).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9355;
const BASE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/tfbd-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const nav = async (url) => { await send('Page.navigate', { url }); await wait(1400); };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const clickTab = async (name) => ev(`document.querySelector('[data-tab="${name}"]').click()`);
  const setSelect = async (id, val) => ev(`document.getElementById('${id}').value='${val}'; document.getElementById('${id}').dispatchEvent(new Event('change'))`);
  const setNum = async (id, val) => ev(`document.getElementById('${id}').value='${val}'`);
  const BN_TITLE = '\u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6 \u099f\u09cd\u09b0\u09c7\u09a8 \u09ad\u09be\u09a1\u09bc\u09be';

  // ---- Load: defaults Dhaka -> Chattogram (stoppage), Shovon Chair ----
  await nav(BASE);
  check('page title mentions Train Fare', (await ev('document.title'))?.includes('Train Fare'));
  check('default From is Dhaka', (await ev(`document.getElementById('fromSelect').value`)) === 'dhaka');
  check('default To is Chattogram', (await ev(`document.getElementById('toSelect').value`)) === 'chattogram');
  check('two Chattogram route variants offered', (await ev(`document.getElementById('routeSelect').options.length`)) === 2);
  check('default route is stoppage', (await ev(`document.getElementById('routeSelect').value`)) === 'dhaka-chattogram-stop');
  check('stoppage offers 5 classes', (await ev(`document.getElementById('classSelect').options.length`)) === 5);
  check('First Berth NOT in class select', (await ev(`[...document.getElementById('classSelect').options].map(o=>o.value).join(',')`)).indexOf('first-berth') === -1);

  // ---- Calculator: 1 adult Shovon Chair stoppage = 450 ----
  await ev(`document.getElementById('calcBtn').click()`);
  check('1 adult Shovon Chair = 450 Tk', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('450'));
  check('result route line shows Dhaka - Chattogram', (await ev(`document.getElementById('resultRoute').textContent`)).includes('Dhaka'));

  // ---- Child half-fare + rounding: Snigdha 857, 1 adult + 1 child = 1286 ----
  await setSelect('classSelect', 'snigdha');
  await setNum('childrenInput', '1');
  await ev(`document.getElementById('calcBtn').click()`);
  check('Snigdha 1 adult + 1 child = 1,286 Tk', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('1,286'));
  check('rounding note shows for .5 total', (await ev(`document.getElementById('roundingNote').hidden`)) === false);
  check('child fare row shows 428.5', (await ev(`document.getElementById('breakdownBody').textContent`)).includes('428.5'));

  // ---- Online fee: 2 adults AC Seat 1030 + online = 2100 ----
  await setSelect('classSelect', 'ac-seat');
  await setNum('adultsInput', '2');
  await setNum('childrenInput', '0');
  await ev(`document.getElementById('onlineCheck').checked=true`);
  await ev(`document.getElementById('calcBtn').click()`);
  check('2 adults AC Seat + online = 2,100 Tk', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('2,100'));
  check('online fee row shows 40', (await ev(`document.getElementById('breakdownBody').textContent`)).includes('40'));

  // ---- Under-3 free, pays no online fee: 1 adult + 2 under-3, online = 470 ----
  await setNum('adultsInput', '1');
  await setNum('under3Input', '2');
  await setSelect('classSelect', 'shovon-chair');
  await ev(`document.getElementById('calcBtn').click()`);
  check('1 adult + 2 under-3 online = 470 Tk', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('470'));
  check('under-3 row shows Free', (await ev(`document.getElementById('breakdownBody').textContent`)).includes('Free'));
  await setNum('under3Input', '0');
  await ev(`document.getElementById('onlineCheck').checked=false`);

  // ---- Non-stop variant: Shovon Chair = 495 ----
  await setSelect('routeSelect', 'dhaka-chattogram-nonstop');
  await setNum('adultsInput', '1');
  await ev(`document.getElementById('calcBtn').click()`);
  check('non-stop Shovon Chair = 495 Tk', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('495'));
  check('non-stop offers 3 classes', (await ev(`document.getElementById('classSelect').options.length`)) === 3);
  await setSelect('routeSelect', 'dhaka-chattogram-stop');

  // ---- Validation: same station / no route / zero paying ----
  await setSelect('toSelect', 'dhaka');
  await ev(`document.getElementById('calcBtn').click()`);
  check('same station shows inline error', (await ev(`document.getElementById('calcError').hidden`)) === false);
  check('same station error text', (await ev(`document.getElementById('calcError').textContent`)).includes('different stations'));
  await setSelect('fromSelect', 'sylhet');
  await setSelect('toSelect', 'rangpur');
  await ev(`document.getElementById('calcBtn').click()`);
  check('no-route pair shows error', (await ev(`document.getElementById('calcError').textContent`)).includes('No verified fare'));
  await setSelect('fromSelect', 'dhaka');
  await setSelect('toSelect', 'chattogram');
  await setNum('adultsInput', '0');
  await ev(`document.getElementById('calcBtn').click()`);
  check('zero paying passengers rejected', (await ev(`document.getElementById('calcError').textContent`)).includes('At least 1 paying passenger'));
  await setNum('adultsInput', '1');
  await ev(`document.getElementById('calcBtn').click()`);
  check('valid calc recovers after errors', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('450'));

  // ---- Swap button ----
  await ev(`document.getElementById('swapBtn').click()`);
  check('swap exchanges From/To', (await ev(`document.getElementById('fromSelect').value`)) === 'chattogram' && (await ev(`document.getElementById('toSelect').value`)) === 'dhaka');
  await ev(`document.getElementById('swapBtn').click()`);

  // ---- Fare Table: 33 rows, search, badges, row tap loads calculator ----
  await clickTab('table');
  check('fare table shows 33 verified fares', (await ev(`document.getElementById('tableCount').textContent`)).includes('33'));
  check('fare table lists 33 rows', (await ev(`document.querySelectorAll('#fareTableBody .fare-row').length`)) === 33);
  check('Estimated badge present (Rangpur)', (await ev(`document.querySelectorAll('#fareTableBody .badge.estimated').length`)) > 0);
  check('Single-source badge present (Feni)', (await ev(`document.querySelectorAll('#fareTableBody .badge.single').length`)) > 0);
  check('Reports-vary badge present (Cox Snigdha)', (await ev(`document.querySelectorAll('#fareTableBody .badge.varies').length`)) === 1);
  check('Cox Snigdha cell shows 1,443', (await ev(`document.querySelector('[data-route-id="dhaka-coxsbazar"][data-class-id="snigdha"] .fare-cell').textContent`)).includes('1,443'));
  await ev(`document.getElementById('tableSearch').value='cox'; document.getElementById('tableSearch').dispatchEvent(new Event('input'))`);
  check('search "cox" -> 4 rows', (await ev(`document.querySelectorAll('#fareTableBody .fare-row').length`)) === 4);
  await ev(`document.getElementById('tableSearch').value='rangpur'; document.getElementById('tableSearch').dispatchEvent(new Event('input'))`);
  check('search "rangpur" -> 5 rows', (await ev(`document.querySelectorAll('#fareTableBody .fare-row').length`)) === 5);
  await ev(`document.getElementById('tableSearch').value=''; document.getElementById('tableSearch').dispatchEvent(new Event('input'))`);
  check('clearing search restores 33 rows', (await ev(`document.querySelectorAll('#fareTableBody .fare-row').length`)) === 33);
  await setNum('adultsInput', '1'); // adults input lives on calc tab; set via hook-free DOM anyway
  await ev(`document.querySelector('[data-route-id="dhaka-coxsbazar"][data-class-id="ac-berth"]').click()`);
  check('row tap switches to calculator tab', (await ev(`document.querySelector('[data-tab="calc"]').classList.contains('active')`)) === true);
  check('row tap sets From Dhaka', (await ev(`document.getElementById('fromSelect').value`)) === 'dhaka');
  check('row tap sets To Cox\'s Bazar', (await ev(`document.getElementById('toSelect').value`)) === 'coxsbazar');
  check('row tap sets AC Berth, total 2,644', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('2,644'));
  await setSelect('fromSelect', 'dhaka');
  await setSelect('toSelect', 'chattogram');
  await setSelect('routeSelect', 'dhaka-chattogram-stop');
  await setSelect('classSelect', 'shovon-chair');
  await ev(`document.getElementById('calcBtn').click()`);

  // ---- Class Guide: 8 cards, First Berth has no verified fare ----
  await clickTab('classes');
  check('class guide renders 8 cards', (await ev(`document.querySelectorAll('#classList .class-card').length`)) === 8);
  check('First Berth card notes no verified fare', (await ev(`document.querySelector('#classList [data-class-id="first-berth"]').textContent`)).includes('No verified fare'));
  check('Snigdha card shows VAT included', (await ev(`document.querySelector('#classList [data-class-id="snigdha"]').textContent`)).includes('15% VAT included'));
  check('Shovon card shows No VAT', (await ev(`document.querySelector('#classList [data-class-id="shovon"]').textContent`)).includes('No VAT'));

  // ---- Fare Rules tab ----
  await clickTab('rules');
  check('rules tab mentions pontage', (await ev(`document.getElementById('tab-rules').textContent`)).includes('Pontage'));
  check('rules tab mentions 20 Tk online fee', (await ev(`document.getElementById('tab-rules').textContent`)).includes('20 Tk'));
  check('rules tab mentions 10 days / 8:00 AM', (await ev(`document.getElementById('tab-rules').textContent`)).includes('10 days'));
  check('rules tab has verify disclaimer', (await ev(`document.getElementById('tab-rules').textContent`)).includes('eticket.railway.gov.bd'));

  // ---- Save calculation + Data tab load/delete ----
  await clickTab('calc');
  await ev(`document.getElementById('calcName').value='Family Cox trip'; document.getElementById('saveCalcBtn').click()`);
  check('save shows confirmation', (await ev(`document.getElementById('saveMsg').hidden`)) === false);
  await clickTab('data');
  check('saved calculation appears in Data tab', (await ev(`document.querySelectorAll('#savedList .trip-card').length`)) === 1);
  check('saved name shown', (await ev(`document.querySelector('#savedList .trip-card').textContent`)).includes('Family Cox trip'));
  await ev(`document.querySelector('#savedList .trip-card .save-btn').click()`);
  check('Load returns to calculator tab', (await ev(`document.querySelector('[data-tab="calc"]').classList.contains('active')`)) === true);
  check('Loaded calc total is 450', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('450'));
  await clickTab('data');
  await ev(`document.querySelector('#savedList .trip-card .delete-btn').click()`);
  check('delete removes saved calculation', (await ev(`document.querySelectorAll('#savedList .trip-card').length`)) === 0);
  check('empty saved message shows', (await ev(`document.getElementById('savedEmpty').hidden`)) === false);

  // ---- Export / erase / import round-trip via test hooks ----
  await clickTab('calc');
  await ev(`document.getElementById('calcName').value='Export check'; document.getElementById('saveCalcBtn').click()`);
  const payload = await ev(`window.__tfbd.exportPayload()`);
  check('export payload is train-fare-bd v1', payload.includes('"app": "train-fare-bd"') && payload.includes('"version": 1'), payload.slice(0, 120));
  check('export carries the saved calc', payload.includes('Export check'));
  await ev(`window.__tfbd.eraseAll()`);
  check('eraseAll empties calcs', (await ev(`window.__tfbd.exportPayload()`)).includes('"calcs": []'));
  const imp = await ev(`JSON.stringify(window.__tfbd.importPayload(${JSON.stringify(payload)}))`);
  check('import valid payload ok', imp.includes('"ok":true'), imp);
  check('import restores calc', (await ev(`window.__tfbd.exportPayload()`)).includes('Export check'));
  const badImp = await ev(`JSON.stringify(window.__tfbd.importPayload('{"app":"train-schedule-bd","version":1,"calcs":[]}'))`);
  check('import wrong app rejected', badImp.includes('"ok":false'));
  check('invalid import leaves data intact', (await ev(`window.__tfbd.exportPayload()`)).includes('Export check'));
  const badRoute = await ev(`JSON.stringify(window.__tfbd.importPayload('{"app":"train-fare-bd","version":1,"calcs":[{"id":"x","routeId":"dhaka-khulna","classId":"snigdha","from":"dhaka","to":"khulna","adults":1,"children39":0,"under3":0,"online":false}]}'))`);
  check('import unknown route rejected', badRoute.includes('"ok":false'));
  const badClass = await ev(`JSON.stringify(window.__tfbd.importPayload('{"app":"train-fare-bd","version":1,"calcs":[{"id":"x","routeId":"dhaka-sylhet","classId":"first-berth","from":"dhaka","to":"sylhet","adults":1,"children39":0,"under3":0,"online":false}]}'))`);
  check('import class-with-no-fare rejected', badClass.includes('"ok":false'));
  check('bad-class import leaves data intact', (await ev(`window.__tfbd.exportPayload()`)).includes('Export check'));

  // ---- Bad import via UI textarea shows visible error; good import succeeds ----
  await clickTab('data');
  await ev(`document.getElementById('importText').value='{not json'; document.getElementById('importBtn').click()`);
  check('bad UI import shows error', (await ev(`document.getElementById('importFail').hidden`)) === false);
  await ev(`document.getElementById('importText').value=${JSON.stringify(payload)}; document.getElementById('importBtn').click()`);
  check('good UI import succeeds', (await ev(`document.getElementById('importOk').hidden`)) === false);

  // ---- Typed-DELETE erase via UI; wrong word rejected ----
  await ev(`document.getElementById('eraseInput').value='delete'; document.getElementById('eraseBtn').click();`);
  check('wrong erase word rejected', (await ev(`document.getElementById('eraseWrong').hidden`)) === false);
  check('wrong erase keeps data', (await ev(`window.__tfbd.exportPayload()`)).includes('Export check'));
  await ev(`document.getElementById('eraseInput').value='DELETE'; document.getElementById('eraseBtn').click();`);
  check('DELETE erases data', (await ev(`window.__tfbd.exportPayload()`)).includes('"calcs": []'));
  check('erase success message shows', (await ev(`document.getElementById('erasedMsg').hidden`)) === false);

  // ---- Language toggle: Bengali title + digits, persists after reload ----
  await clickTab('calc');
  await ev(`document.getElementById('calcBtn').click()`);
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === BN_TITLE);
  check('BN toggle: total in Bengali digits', (await ev(`document.getElementById('grandTotalCell').textContent`)).includes('\u09ea\u09eb\u09e6'));
  check('BN toggle: tab label in Bengali', (await ev(`document.querySelector('[data-tab="table"]').textContent`)).includes('\u09ad\u09be\u09a1\u09bc\u09be\u09b0 \u09a4\u09be\u09b2\u09bf\u0995\u09be'));
  await nav(BASE);
  check('BN toggle persists after reload', (await ev(`window.__tfbd.state.lang`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__tfbd.state.lang`)) === 'en');

  // ---- Footer disclaimer on every tab (footer is outside panels) ----
  check('footer carries verify disclaimer', (await ev(`document.getElementById('footerText').textContent`)).includes('eticket.railway.gov.bd'));

  // ---- Mobile 390px: no horizontal overflow on any tab ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(BASE);
  for (const tab of ['calc', 'table', 'classes', 'rules', 'data']) {
    await clickTab(tab);
    await wait(300);
    const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    check('390px no overflow on ' + tab + ' tab', overflow <= 0, 'overflow=' + overflow);
  }

  // ---- Zero network requests: app is fully offline (only file:// loads) ----
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
