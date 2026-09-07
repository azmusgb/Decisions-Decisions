(() => {
  'use strict';

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

  function paint(reset = true) {
    const item = current();
    promptNode.textContent = item.prompt;
    if (question) {
      question.textContent = `Would you hum ${item.prompt} for ${item.hum} ${item.hum === 1 ? 'point' : 'points'}—or draw it for ${item.draw}?`;
    }
    methodButtons.forEach(button => {
      const route = button.dataset.route;
      const points = item[route];
      button.querySelector('[data-points]').textContent = points;
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
      status.innerHTML = '<span>TAP A ROUTE</span><strong>ONE TAP COMMITS</strong>';
    }
  }

  methodButtons.forEach(button => {
    button.addEventListener('click', () => {
      const route = button.dataset.route;
      if (!route || card.classList.contains('is-committed')) return;
      const points = current()[route];
      card.classList.add('is-committed');
      methodButtons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
        item.setAttribute('aria-disabled', 'true');
        if (!selected) item.setAttribute('tabindex', '-1');
      });
      status.innerHTML = `<span>${label[route]} COMMITTED</span><strong>+${points} ${points === 1 ? 'POINT' : 'POINTS'} IF THEY GUESS IT</strong>`;
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
