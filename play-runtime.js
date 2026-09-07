(() => {
  'use strict';

  const root = document.documentElement;

  function syncViewport() {
    const height = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
    if (height > 0) root.style.setProperty('--game-vh', `${height}px`);
  }

  function hideNetlifyNode(node) {
    if (!(node instanceof Element)) return;
    const tag = node.tagName?.toLowerCase?.() || '';
    const id = (node.id || '').toLowerCase();
    const cls = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    const marker = `${tag} ${id} ${cls}`;
    if (marker.includes('netlify') && (marker.includes('toolbar') || marker.includes('drawer') || marker.includes('badge'))) {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
    }

    if (node instanceof HTMLIFrameElement && /netlify/i.test(node.src || '')) {
      node.style.setProperty('display', 'none', 'important');
    }

    const text = (node.textContent || '').trim();
    if (/Powered by Netlify/i.test(text) && node.getBoundingClientRect) {
      let target = node;
      for (let i = 0; i < 4 && target.parentElement; i += 1) {
        const style = getComputedStyle(target);
        if (style.position === 'fixed' || style.position === 'sticky') break;
        target = target.parentElement;
      }
      target.style.setProperty('display', 'none', 'important');
      target.style.setProperty('visibility', 'hidden', 'important');
      target.style.setProperty('pointer-events', 'none', 'important');
    }

    if (node.shadowRoot) node.shadowRoot.querySelectorAll('*').forEach(hideNetlifyNode);
    node.querySelectorAll?.('netlify-toolbar,netlify-drawer,netlify-toolbar-button,iframe[src*="netlify"],[id*="netlify"],[class*="netlify"]').forEach(hideNetlifyNode);
  }

  function sweepNetlifyUi() {
    document.body?.children && [...document.body.children].forEach(hideNetlifyNode);
  }

  syncViewport();
  window.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => hideNetlifyNode(node));
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    sweepNetlifyUi();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(sweepNetlifyUi, 250);
    setTimeout(sweepNetlifyUi, 1200);
    setTimeout(sweepNetlifyUi, 3000);
  });
})();
