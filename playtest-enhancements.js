(() => {
  'use strict';

  const MIME_MASK = `<svg viewBox="0 0 64 64" role="img" aria-label="Mime" focusable="false" style="width:1em;height:1em;display:block">
    <path d="M11 13.5C17 8.8 24.2 7 32 7s15 1.8 21 6.5v17.2c0 13.1-8.6 23.6-21 27.3C19.6 54.3 11 43.8 11 30.7V13.5Z" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linejoin="round"/>
    <path d="M19.5 25.2c2.7-2.2 5.5-2.2 8.2 0M36.3 25.2c2.7-2.2 5.5-2.2 8.2 0" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M23 41.4c5.9 3.8 12.1 3.8 18 0" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M17 15.8c5.5 3.5 10.5 4.8 15 4.8s9.5-1.3 15-4.8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" opacity=".78"/>
  </svg>`;

  function polishMimeIcons(root = document) {
    root.querySelectorAll('.method--mime .method-icon, .method--mime .commit-icon').forEach(icon => {
      if (icon.dataset.gtpMask === '1') return;
      icon.dataset.gtpMask = '1';
      icon.innerHTML = MIME_MASK;
      icon.setAttribute('aria-hidden', 'true');
    });
  }

  function markBlindTestCandidate(root = document) {
    root.querySelectorAll('.home-screen .eyebrow').forEach(label => {
      if (/performance ux|playtest build/i.test(label.textContent || '')) {
        label.textContent = 'BLIND-TEST CANDIDATE · v0.6';
      }
    });

    root.querySelectorAll('.home-screen .version').forEach(version => {
      if (!version.dataset.gtpCandidate) {
        version.dataset.gtpCandidate = '1';
        version.insertAdjacentHTML('beforeend', '<br><span style="display:inline-block;margin-top:4px;color:var(--gtp-yellow);font-size:.62rem;font-weight:900;letter-spacing:.1em">PROPOSED TEST VARIABLES ACTIVE</span>');
      }
    });
  }

  function enhance() {
    polishMimeIcons();
    markBlindTestCandidate();
  }

  const observer = new MutationObserver(enhance);
  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  });
})();
