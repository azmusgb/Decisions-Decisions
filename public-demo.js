(() => {
  'use strict';

  // Product invariant: one tap chooses and commits the route.
  const root = document.querySelector('[data-public-demo]');
  if (!root) return;

  const prompts = [
    { prompt: 'VOLCANO', hum: 3, draw: 1, mime: 2 },
    { prompt: 'SNEEZE', hum: 1, draw: 3, mime: 2 },
    { prompt: 'ROBOT', hum: 3, draw: 2, mime: 1 },
    { prompt: 'THUNDER', hum: 1, draw: 2, mime: 3 }
  ];

  const label = { hum: 'HUM', draw: 'DRAW', mime: 'MIME' };
  const card = root.querySelector('[data-teaser-card]');
  const promptNode = root.querySelector('[data-teaser-prompt]');
  const question = root.querySelector('[data-teaser-question]');
  const status = root.querySelector('[data-teaser-status]');
  const next = root.querySelector('[data-teaser-next]');
  const methodButtons = [...root.querySelectorAll('[data-route]')];
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let index = 0;

  function current() {
    return prompts[index % prompts.length];
  }

  function setNextState(committed) {
    if (!(next instanceof HTMLButtonElement)) return;
    next.textContent = committed ? 'Next prompt' : 'New prompt';
    next.classList.toggle('is-ready', committed);
  }

  function paint(reset = true) {
    const item = current();
    promptNode.textContent = item.prompt;
    if (question) {
      question.textContent = `HUM — ${item.hum} ${item.hum === 1 ? 'point' : 'points'}. DRAW — ${item.draw} ${item.draw === 1 ? 'point' : 'points'}. MIME — ${item.mime} ${item.mime === 1 ? 'point' : 'points'}. Which route would you choose?`;
    }

    methodButtons.forEach(button => {
      const route = button.dataset.route;
      const points = item[route];
      const pointsNode = button.querySelector('[data-points]');
      if (pointsNode) pointsNode.textContent = points;
      button.setAttribute('aria-label', `${label[route]}, ${points} ${points === 1 ? 'point' : 'points'}`);
      if (reset) {
        button.classList.remove('is-selected');
        button.setAttribute('aria-pressed', 'false');
        button.removeAttribute('aria-disabled');
        button.removeAttribute('tabindex');
      }
    });

    if (reset) {
      card.classList.remove('is-committed');
      card.removeAttribute('data-selected-route');
      status.innerHTML = '<span>CHOOSE ONE</span><strong>TAP TO CHOOSE</strong>';
      setNextState(false);
    }
  }

  function commit(button) {
    const route = button.dataset.route;
    if (!route || card.classList.contains('is-committed')) return;

    const points = current()[route];
    card.classList.add('is-committed');
    card.dataset.selectedRoute = route;

    methodButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
      item.setAttribute('aria-disabled', 'true');
      if (!selected) item.setAttribute('tabindex', '-1');
    });

    status.innerHTML = `<span>${label[route]} · ${points} ${points === 1 ? 'PT' : 'PTS'}</span><strong>LOCKED · GET THEM TO GUESS</strong>`;
    setNextState(true);
  }

  methodButtons.forEach(button => {
    button.addEventListener('click', () => commit(button));
    button.addEventListener('keydown', event => {
      if (card.classList.contains('is-committed')) return;
      const currentIndex = methodButtons.indexOf(button);
      let targetIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (currentIndex + 1) % methodButtons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (currentIndex - 1 + methodButtons.length) % methodButtons.length;
      if (event.key === 'Home') targetIndex = 0;
      if (event.key === 'End') targetIndex = methodButtons.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      methodButtons[targetIndex]?.focus();
    });
  });

  next?.addEventListener('click', () => {
    index = (index + 1) % prompts.length;
    paint(true);
    if (!reduceMotion) {
      promptNode.animate?.(
        [{ opacity: .2, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 160, easing: 'ease-out' }
      );
    }
  });

  paint(true);
})();
