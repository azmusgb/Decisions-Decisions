(() => {
  'use strict';

  const PRIMARY = [
    ['Home','/'],
    ['How it works','/how'],
    ['Demo','/play'],
    ['About','/about'],
    ['FAQ','/faq']
  ];
  const MORE = [
    ['Press','/press'],
    ['Launch','/launch'],
    ['Partners','/partners'],
    ['Retail','/retail'],
    ['Manufacturing','/manufacturing'],
    ['Contact','/contact']
  ];
  const ALL_LINKS = [...PRIMARY, ...MORE];

  function ensureStyles() {
    if (document.querySelector('link[href*="navigation.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/navigation.css?v=9';
    document.head.appendChild(link);
  }

  function navMarkup() {
    const primary = PRIMARY.map(([label,href])=>`<a href="${href}">${label}</a>`).join('');
    const more = MORE.map(([label,href])=>`<a href="${href}">${label}</a>`).join('');
    return `<div class="site-nav-primary">${primary}<details class="site-more"><summary>More</summary><div class="site-more-menu">${more}</div></details></div><a class="button button--primary site-nav-cta" href="/playtest">Join a playtest</a>`;
  }

  function drawerMarkup() {
    const demoControl = location.pathname.startsWith('/play')
      ? '<a href="/demo-access?logout=1">Lock demo on this device</a>'
      : '';
    return `<div class="site-drawer-backdrop" data-site-drawer-backdrop hidden></div><aside class="site-drawer" data-site-drawer aria-hidden="true"><div class="site-drawer-head"><a class="brand" href="/">GET THE POINT</a><button class="site-drawer-close" type="button" aria-label="Close menu">×</button></div><nav aria-label="Site menu"><span class="site-drawer-label">PLAY + LEARN</span>${PRIMARY.map(([label,href])=>`<a href="${href}">${label}</a>`).join('')}<span class="site-drawer-label">PROJECT + BUSINESS</span>${MORE.map(([label,href])=>`<a href="${href}">${label}</a>`).join('')}<a class="site-drawer-feature" href="/playtest">Join a playtest</a>${demoControl}</nav><div class="site-drawer-foot"><span>ONE PROMPT. THREE WAYS TO PLAY.</span></div></aside>`;
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
      links.setAttribute('aria-label','Main navigation');
      nav.appendChild(links);
    }
    links.innerHTML = navMarkup();
    if (!nav.querySelector('.site-menu-toggle')) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'site-menu-toggle';
      toggle.setAttribute('aria-label','Open site menu');
      toggle.setAttribute('aria-expanded','false');
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
    button.setAttribute('aria-label','Open site menu');
    button.setAttribute('aria-expanded','false');
    button.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(button);
  }

  function setupDrawer() {
    if (!document.querySelector('[data-site-drawer]')) document.body.insertAdjacentHTML('beforeend', drawerMarkup());
    const drawer = document.querySelector('[data-site-drawer]');
    const backdrop = document.querySelector('[data-site-drawer-backdrop]');
    const toggles = document.querySelectorAll('.site-menu-toggle,.game-site-menu');
    const close = drawer?.querySelector('.site-drawer-close');
    const setOpen = open => {
      if (!drawer || !backdrop) return;
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      backdrop.hidden = !open;
      document.body.classList.toggle('site-menu-open', open);
      toggles.forEach(btn => btn.setAttribute('aria-expanded', String(open)));
      if (open) close?.focus();
    };
    toggles.forEach(btn => btn.addEventListener('click', () => setOpen(true)));
    close?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));
    drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
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
    const path = location.pathname.replace(/\.html$/,'') || '/';
    document.querySelectorAll('.site-nav-primary a,.site-drawer a').forEach(a => {
      const target = new URL(a.href, location.origin).pathname.replace(/\.html$/,'') || '/';
      if (target === path) a.setAttribute('aria-current','page');
    });
    if (MORE.some(([,href]) => href === path)) document.querySelector('.site-more summary')?.classList.add('is-current');
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
