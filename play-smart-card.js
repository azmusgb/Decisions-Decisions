(() => {
  'use strict';

  const app = document.getElementById('app');
  if (!app) return;

  const SWIPE_MIN_PX = 72;
  const SWIPE_DISTANCE_RATIO = 0.22;
  const SWIPE_FAST_MIN_PX = 48;
  const SWIPE_FAST_VELOCITY = 0.72;
  const SCORE_DELAY_MS = 130;

  let gesture = null;

  function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button,input,select,textarea,canvas,.canvas-toolbar,[role="button"]'));
  }

  function committedCardFromTarget(target) {
    if (!(target instanceof Element)) return null;
    const card = target.closest('.game--perform .prompt-card');
    return card instanceof HTMLElement ? card : null;
  }

  function resetCard(card) {
    if (!(card instanceof HTMLElement)) return;
    card.classList.remove('is-dragging');
    card.style.removeProperty('transform');
    card.style.removeProperty('opacity');
  }

  function beginGesture(event) {
    if (!event.isPrimary || event.button > 0) return;
    const card = committedCardFromTarget(event.target);
    if (!card || isInteractiveTarget(event.target)) return;

    gesture = {
      pointerId: event.pointerId,
      card,
      startX: event.clientX,
      startY: event.clientY,
      startAt: performance.now(),
      dx: 0,
      dy: 0
    };

    card.classList.add('is-dragging');
    try { card.setPointerCapture(event.pointerId); } catch {}
  }

  function moveGesture(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    gesture.dx = dx;
    gesture.dy = dy;

    if (dx <= 0 || Math.abs(dy) > Math.abs(dx) * 1.25) {
      gesture.card.style.transform = 'translateX(0)';
      gesture.card.style.opacity = '1';
      return;
    }

    const width = Math.max(1, gesture.card.getBoundingClientRect().width);
    const clamped = Math.min(dx, width * 0.72);
    const progress = Math.min(1, clamped / (width * 0.72));
    gesture.card.style.transform = `translateX(${clamped}px) rotate(${progress * 2.5}deg)`;
    gesture.card.style.opacity = String(1 - progress * 0.22);
  }

  function finishGesture(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const active = gesture;
    gesture = null;
    try { active.card.releasePointerCapture(event.pointerId); } catch {}

    if (cancelled) {
      resetCard(active.card);
      return;
    }

    const elapsed = Math.max(1, performance.now() - active.startAt);
    const velocity = active.dx / elapsed;
    const width = Math.max(1, active.card.getBoundingClientRect().width);
    const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_DISTANCE_RATIO);
    const deliberate = active.dx >= threshold && Math.abs(active.dy) < Math.max(120, Math.abs(active.dx));
    const quick = active.dx >= SWIPE_FAST_MIN_PX && velocity >= SWIPE_FAST_VELOCITY && Math.abs(active.dy) < 90;

    if (!deliberate && !quick) {
      resetCard(active.card);
      return;
    }

    active.card.classList.remove('is-dragging');
    active.card.style.removeProperty('transform');
    active.card.style.removeProperty('opacity');
    active.card.classList.add('is-scoring-swipe');

    try { navigator.vibrate?.(18); } catch {}

    window.setTimeout(() => {
      const correct = document.getElementById('correct');
      if (correct instanceof HTMLButtonElement && !correct.disabled) correct.click();
    }, SCORE_DELAY_MS);
  }

  function setTextIfDifferent(node, text) {
    if (!(node instanceof Element)) return;
    if ((node.textContent || '') !== text) node.textContent = text;
  }

  function simplifyRenderedGame(root = app) {
    root.querySelectorAll('.choice-microcopy > span').forEach(node => {
      setTextIfDifferent(node, 'TAP A METHOD AND GO');
    });

    root.querySelectorAll('.handoff-rule strong').forEach(node => {
      setTextIfDifferent(node, 'Tap a method and go.');
    });

    root.querySelectorAll('.game--perform .performance-actions').forEach(actions => {
      if (actions.querySelector('.swipe-hint')) return;
      const hint = document.createElement('div');
      hint.className = 'swipe-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'GUESSED IT? SWIPE RIGHT';
      actions.prepend(hint);
    });

    root.querySelectorAll('.game--perform .prompt-card').forEach(card => {
      if (!card.hasAttribute('data-swipe-to-score')) card.setAttribute('data-swipe-to-score', 'true');
      card.setAttribute('aria-description', 'When your team guesses correctly, use the Correct button. Swipe right is an optional shortcut.');
    });

    root.querySelectorAll('.game--choose .prompt-meta > span:last-child').forEach(node => {
      if ((node.textContent || '').trim() === 'NO SKIP') node.textContent = '';
    });
  }

  function handleKeydown(event) {
    if (event.key !== 'ArrowRight') return;
    if (!document.querySelector('.game--perform .prompt-card')) return;
    if (isInteractiveTarget(document.activeElement)) return;

    const correct = document.getElementById('correct');
    if (!(correct instanceof HTMLButtonElement) || correct.disabled) return;

    event.preventDefault();
    correct.click();
  }

  simplifyRenderedGame();
  app.addEventListener('pointerdown', beginGesture);
  app.addEventListener('pointermove', moveGesture);
  app.addEventListener('pointerup', event => finishGesture(event, false));
  app.addEventListener('pointercancel', event => finishGesture(event, true));
  document.addEventListener('keydown', handleKeydown);

  const observer = new MutationObserver(() => simplifyRenderedGame());
  observer.observe(app, { childList: true, subtree: true });
})();
