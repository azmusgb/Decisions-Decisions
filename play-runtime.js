(() => {
  'use strict';

  const root = document.documentElement;

  function syncViewport() {
    const height = Math.round(window.visualViewport?.height || window.innerHeight || root.clientHeight || 0);
    if (height > 0) root.style.setProperty('--app-height', `${height}px`);
  }

  function isNetlifyOverlay(node) {
    if (!(node instanceof Element)) return false;
    const tag = (node.tagName || '').toLowerCase();
    const id = (node.id || '').toLowerCase();
    const cls = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    const marker = `${tag} ${id} ${cls}`;
    return tag === 'netlify-toolbar' || tag === 'netlify-drawer' || tag === 'netlify-toolbar-button' ||
      marker.includes('netlify-toolbar') || marker.includes('netlify-drawer') || marker.includes('netlify-badge');
  }

  function hideKnownNetlifyOverlay(node) {
    if (!(node instanceof Element)) return;
    if (isNetlifyOverlay(node)) {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
      return;
    }
    node.querySelectorAll?.('netlify-toolbar,netlify-drawer,netlify-toolbar-button,[class*="netlify-toolbar"],[class*="netlify-drawer"],[class*="netlify-badge"]').forEach(hideKnownNetlifyOverlay);
  }

  function sweepKnownNetlifyUi() {
    document.body?.children && [...document.body.children].forEach(hideKnownNetlifyOverlay);
  }

  syncViewport();
  window.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });

  const observer = new MutationObserver(records => {
    for (const record of records) record.addedNodes.forEach(hideKnownNetlifyOverlay);
  });

  window.addEventListener('DOMContentLoaded', () => {
    sweepKnownNetlifyUi();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(sweepKnownNetlifyUi, 250);
    setTimeout(sweepKnownNetlifyUi, 1200);
  });
})();
