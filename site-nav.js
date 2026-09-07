(() => {
  'use strict';

  const PRIMARY = [
    ['How it works', '/how'],
    ['Playtest', '/playtest'],
    ['About', '/about'],
    ['FAQ', '/faq'],
    ['Private demo', '/play']
  ];

  const MORE = [
    ['Press', '/press'],
    ['Launch', '/launch'],
    ['Partners', '/partners'],
    ['Retail', '/retail'],
    ['Manufacturing', '/manufacturing'],
    ['Contact', '/contact']
  ];

  const MOBILE_PRIMARY = [['Home', '/'], ...PRIMARY];

  function ensureStyles() {
    if (document.querySelector('link[href*="navigation.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/navigation.css?v=12';
    document.head.appendChild(link);
  }

  function moreMarkup() {
    return `<details class="site-more"><summary>More</summary><div class="site-more-menu">${MORE.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div></details>`;
  }

  function navMarkup() {
    return `<div class="site-nav-primary">${PRIMARY.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}${moreMarkup()}</div><a class="button button--primary site-nav-cta" href="/playtest#signup">Join a playtest</a>`;
  }

  function drawerMarkup() {
    const privatePaths = new Set(['/play', '/diagnostics', '/analysis', '/feedback']);
    const currentPath = (location.pathname.replace(/\.html$/, '') || '/').replace(/\/$/, '') || '/';
    const privateArea = privatePaths.has(currentPath);
    const demoTools = privateArea
      ? '<span class="site-drawer-label">PLAYTEST TOOLS</span><a href="/play">Play demo</a><a href="/diagnostics">Device diagnostics</a><a href="/analysis">Analyze telemetry</a><a href="/feedback">Session feedback</a><a class="site-drawer-private" href="/demo-access?logout=1">Lock demo on this device</a>'
      : '';

    return `<div class="site-drawer-backdrop" data-site-drawer-backdrop hidden></div><aside class="site-drawer" data-site-drawer aria-hidden="true" aria-label="Site menu"><div class="site-drawer-head"><a class="brand" href="/">GET THE POINT</a><button class="site-drawer-close" type="button" aria-label="Close menu">×</button></div><nav aria-label="Site menu"><span class="site-drawer-label">PLAY + LEARN</span>${MOBILE_PRIMARY.map(([label, href]) => `<a href="${href}"${href === '/play' ? ' class="site-drawer-private"' : ''}>${label}</a>`).join('')}<span class="site-drawer-label">PROJECT + BUSINESS</span>${MORE.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}<a class="site-drawer-feature" href="/playtest#signup">Join a playtest</a>${demoTools}</nav><div class="site-drawer-foot"><span>ONE PROMPT. THREE WAYS TO PLAY.</span></div></aside>`;
  }

  function setupHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const nav = header.querySelector('.nav');
    if (!nav) return;

    let links = nav.querySelector('.nav-links');
    if (!links) {
      links = document.createElement('nav');
      links.className = 'nav-links';
      links.setAttribute('aria-label', 'Main navigation');
      nav.appendChild(links);
    }

    // Active pages ship canonical nav markup. Older pages get the same markup at runtime.
    if (!links.querySelector('.site-nav-primary')) links.innerHTML = navMarkup();

    if (!nav.querySelector('.site-menu-toggle')) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'site-menu-toggle';
      toggle.setAttribute('aria-label', 'Open site menu');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span></span><span></span><span></span>';
      nav.appendChild(toggle);
    }
  }

  function setupGameMenu() {
    if (!document.getElementById('app') || document.querySelector('.site-header')) return;
    if (document.querySelector('.game-site-menu')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-site-menu';
    button.setAttribute('aria-label', 'Open site menu');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(button);
  }

  function focusableWithin(root) {
    return [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
      .filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
  }

  function setupDrawer() {
    if (!document.querySelector('[data-site-drawer]')) document.body.insertAdjacentHTML('beforeend', drawerMarkup());
    const drawer = document.querySelector('[data-site-drawer]');
    const backdrop = document.querySelector('[data-site-drawer-backdrop]');
    const toggles = [...document.querySelectorAll('.site-menu-toggle,.game-site-menu')];
    const close = drawer?.querySelector('.site-drawer-close');
    const header = document.querySelector('.site-header');
    const main = document.querySelector('main');
    const footer = document.querySelector('.footer');
    let opener = null;

    const setBackgroundInert = inert => {
      [header, main, footer].filter(Boolean).forEach(node => {
        if (node === drawer || node.contains(drawer)) return;
        if (inert) node.setAttribute('inert', '');
        else node.removeAttribute('inert');
      });
    };

    const setOpen = open => {
      if (!drawer || !backdrop) return;
      if (open) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      backdrop.hidden = !open;
      document.body.classList.toggle('site-menu-open', open);
      toggles.forEach(btn => btn.setAttribute('aria-expanded', String(open)));
      setBackgroundInert(open);
      if (open) close?.focus();
      else opener?.focus?.();
    };

    toggles.forEach(btn => btn.addEventListener('click', () => setOpen(true)));
    close?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));
    drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', event => {
      if (!drawer?.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableWithin(drawer);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function setupMoreMenu() {
    const more = document.querySelector('.site-more');
    if (!more) return;
    document.addEventListener('click', event => {
      if (more.open && !more.contains(event.target)) more.removeAttribute('open');
    });
    more.querySelectorAll('a').forEach(a => a.addEventListener('click', () => more.removeAttribute('open')));
  }

  function markCurrent() {
    const path = location.pathname.replace(/\.html$/, '') || '/';
    document.querySelectorAll('.site-nav-primary a,.site-drawer a').forEach(a => {
      const target = new URL(a.href, location.origin).pathname.replace(/\.html$/, '') || '/';
      if (target === path) a.setAttribute('aria-current', 'page');
    });
    if (MORE.some(([, href]) => href === path)) document.querySelector('.site-more summary')?.classList.add('is-current');
  }

  window.addEventListener('DOMContentLoaded', () => {
    ensureStyles();
    setupHeader();
    setupGameMenu();
    setupDrawer();
    setupMoreMenu();
    markCurrent();
  });
})();
