(() => {
  'use strict';

  const results = document.getElementById('results');
  const passCount = document.getElementById('passCount');
  const warnCount = document.getElementById('warnCount');
  const failCount = document.getElementById('failCount');
  const deviceInfo = document.getElementById('deviceInfo');
  let lastReport = [];

  const test = (name, status, detail) => ({ name, status, detail });
  const safe = fn => { try { return fn(); } catch { return false; } };

  async function run() {
    const report = [];

    report.push(test('Secure context', window.isSecureContext ? 'pass' : 'fail', window.isSecureContext ? 'HTTPS security context is active.' : 'The demo should run over HTTPS.'));
    report.push(test('JavaScript runtime', 'pass', `JavaScript is active (${navigator.userAgentData ? 'UA-CH available' : 'standard UA'}).`));

    const localStorageWorks = safe(() => {
      const key = 'gtp.diag.test';
      localStorage.setItem(key, 'ok');
      const ok = localStorage.getItem(key) === 'ok';
      localStorage.removeItem(key);
      return ok;
    });
    report.push(test('Local storage', localStorageWorks ? 'pass' : 'fail', localStorageWorks ? 'Persistent local game state can be stored.' : 'LocalStorage is blocked or unavailable.'));

    report.push(test('Cookies', navigator.cookieEnabled ? 'pass' : 'fail', navigator.cookieEnabled ? 'Browser reports cookies enabled for demo access.' : 'Cookies are disabled; private demo access will not persist.'));
    report.push(test('Web Crypto', globalThis.crypto?.subtle ? 'pass' : 'fail', globalThis.crypto?.subtle ? 'Secure cryptographic APIs are available.' : 'Web Crypto is unavailable.'));

    const canvasWorks = safe(() => !!document.createElement('canvas').getContext('2d'));
    report.push(test('Drawing canvas', canvasWorks ? 'pass' : 'fail', canvasWorks ? '2D canvas is available for DRAW.' : 'Canvas is unavailable.'));

    report.push(test('Touch / pointer input', ('PointerEvent' in window || navigator.maxTouchPoints > 0) ? 'pass' : 'warn', navigator.maxTouchPoints > 0 ? `${navigator.maxTouchPoints} touch point(s) reported.` : 'No touch points reported; desktop pointer input should still work.'));
    report.push(test('Visual viewport', window.visualViewport ? 'pass' : 'warn', window.visualViewport ? 'Dynamic mobile viewport API is available.' : 'VisualViewport is unavailable; layout falls back to window height.'));

    if ('serviceWorker' in navigator) {
      let registration = null;
      try { registration = await navigator.serviceWorker.getRegistration('/'); } catch {}
      report.push(test('Service worker API', 'pass', registration ? 'Service worker registration found.' : 'API available; registration not yet controlling this page.'));
      report.push(test('PWA controller', navigator.serviceWorker.controller ? 'pass' : 'warn', navigator.serviceWorker.controller ? 'This page is controlled by the current PWA worker.' : 'Reload after the first demo visit if installed/offline behavior is being tested.'));
    } else {
      report.push(test('Service worker API', 'warn', 'Service workers are unavailable in this browser.'));
      report.push(test('PWA controller', 'warn', 'No service worker controller.'));
    }

    report.push(test('Cache API', 'caches' in window ? 'pass' : 'warn', 'caches' in window ? 'Static PWA assets can be cached.' : 'Cache API unavailable.'));
    report.push(test('Network', navigator.onLine ? 'pass' : 'warn', navigator.onLine ? 'Browser reports online.' : 'Browser reports offline. Private access verification requires a connection.'));

    try {
      const response = await fetch('/play', { cache: 'no-store', credentials: 'same-origin' });
      const finalPath = new URL(response.url).pathname;
      const authorized = response.ok && (finalPath === '/play' || finalPath === '/play.html');
      report.push(test('Private demo authorization', authorized ? 'pass' : 'fail', authorized ? 'Protected /play route is reachable with the current access cookie.' : `Access check ended at ${finalPath || 'an unexpected route'}.`));
    } catch (error) {
      report.push(test('Private demo authorization', 'fail', `Request failed: ${error?.message || 'network error'}`));
    }

    try {
      const response = await fetch('/play.js?v=8', { cache: 'no-store' });
      report.push(test('Game runtime asset', response.ok ? 'pass' : 'fail', response.ok ? 'Core game JavaScript is reachable.' : `play.js returned HTTP ${response.status}.`));
    } catch (error) {
      report.push(test('Game runtime asset', 'fail', `Request failed: ${error?.message || 'network error'}`));
    }

    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
    report.push(test('Display mode', 'pass', standalone ? 'Running as installed/standalone PWA.' : 'Running in the browser tab.'));

    lastReport = report;
    render(report);
    renderDeviceInfo(standalone);
  }

  function render(report) {
    const counts = { pass: 0, warn: 0, fail: 0 };
    report.forEach(row => counts[row.status]++);
    passCount.textContent = counts.pass;
    warnCount.textContent = counts.warn;
    failCount.textContent = counts.fail;
    results.innerHTML = report.map(row => `<article class="diag-card"><div class="diag-card-head"><h2>${escapeHtml(row.name)}</h2><span class="diag-status diag-status--${row.status}">${row.status.toUpperCase()}</span></div><p>${escapeHtml(row.detail)}</p></article>`).join('');
  }

  function renderDeviceInfo(standalone) {
    const vv = window.visualViewport;
    const payload = {
      checkedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      visualViewport: vv ? `${Math.round(vv.width)}×${Math.round(vv.height)}` : 'unavailable',
      devicePixelRatio: window.devicePixelRatio,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone,
      online: navigator.onLine,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
    };
    deviceInfo.textContent = JSON.stringify(payload, null, 2);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  async function copyReport() {
    const text = [
      'GET THE POINT — Playtest Diagnostics',
      new Date().toISOString(),
      '',
      ...lastReport.map(r => `[${r.status.toUpperCase()}] ${r.name}: ${r.detail}`),
      '',
      deviceInfo.textContent
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      const button = document.getElementById('copyReport');
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => button.textContent = old, 1200);
    } catch {
      window.prompt('Copy diagnostics report:', text);
    }
  }

  document.getElementById('runTests')?.addEventListener('click', run);
  document.getElementById('copyReport')?.addEventListener('click', copyReport);
  window.addEventListener('online', run);
  window.addEventListener('offline', run);
  window.addEventListener('DOMContentLoaded', run);
})();
