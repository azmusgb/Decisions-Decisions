(() => {
  'use strict';

  const app = document.getElementById('app');
  if (!app) return;

  const STYLE_ID = 'gtp-smart-card-ux';
  const SWIPE_MIN_PX = 72;
  const SWIPE_DISTANCE_RATIO = 0.22;
  const SWIPE_FAST_MIN_PX = 48;
  const SWIPE_FAST_VELOCITY = 0.72;
  const SCORE_DELAY_MS = 130;

  let gesture = null;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .game {
        gap: 6px;
      }

      .game-hud {
        min-height: 48px;
        padding-inline: 2px;
      }

      .game-hud .hud-team {
        font-size: clamp(.82rem, 3vw, 1rem);
      }

      .game-hud .hud-team small {
        margin-bottom: 4px;
      }

      .game-hud .hud-score {
        visibility: hidden;
      }

      .timer {
        min-width: 74px;
        font-size: clamp(2.25rem, 9.5vw, 3.15rem);
      }

      .timer-rail {
        height: 4px;
        opacity: .74;
      }

      .prompt-card {
        background: var(--gtp-cream);
        border-color: rgba(255,255,255,.38);
        box-shadow: 0 18px 46px rgba(0,0,0,.27);
      }

      .prompt-card::before {
        display: none;
      }

      .game--choose .phase-pill {
        display: none;
      }

      .game--choose .prompt-meta {
        min-height: 24px;
        justify-content: flex-end;
        font-size: .58rem;
      }

      .game--choose .prompt-meta > span:last-child:empty {
        display: none;
      }

      .game--choose .prompt {
        font-size: clamp(3.8rem, 18vw, 7.8rem);
      }

      .methods {
        gap: clamp(9px, 2.5vw, 13px);
      }

      .method {
        min-height: clamp(116px, 16dvh, 140px);
        border-radius: clamp(20px, 4.6vw, 26px);
        box-shadow: inset 0 -2px rgba(0,0,0,.10), 0 6px 14px rgba(0,0,0,.08);
      }

      .method--hum {
        background: var(--gtp-teal);
      }

      .method--draw {
        background: var(--gtp-yellow);
      }

      .method--mime {
        background: var(--gtp-purple);
      }

      .choice-microcopy {
        min-height: 25px;
        font-size: .50rem;
        letter-spacing: .10em;
      }

      .game--perform .prompt-card {
        grid-template-rows: minmax(0, 1fr) auto;
        gap: clamp(12px, 2dvh, 18px);
        touch-action: pan-y;
        will-change: transform, opacity;
      }

      .game--perform .prompt-meta {
        display: none;
      }

      .game--perform .prompt {
        order: 0;
        min-height: 0;
        padding: clamp(14px, 2dvh, 28px) 2px;
        font-size: clamp(3.8rem, 18vw, 7.9rem);
        line-height: .84;
      }

      .game--perform .performance-stack {
        order: 1;
        display: grid;
        grid-template-rows: auto auto;
        gap: 10px;
        min-height: 0;
      }

      .game--perform.game--audio .performance-surface,
      .game--perform.game--mime .performance-surface {
        display: none;
      }

      .game--perform.game--audio .commit-chip,
      .game--perform.game--mime .commit-chip {
        width: min(100%, 260px);
        min-height: 58px;
        margin-inline: auto;
        border-radius: 999px;
        padding-inline: 16px;
      }

      .commit-chip > div small,
      .committed-note {
        display: none !important;
      }

      .commit-chip > div b {
        font-size: .98rem;
      }

      .performance-actions {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 10px;
      }

      .swipe-hint {
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #5f6466;
        font-size: .62rem;
        font-weight: 900;
        letter-spacing: .10em;
        text-transform: uppercase;
      }

      .swipe-hint::after {
        content: '→';
        font-size: 1.15rem;
        line-height: 1;
      }

      .btn--correct {
        min-height: 48px !important;
        padding: 10px 14px !important;
        border-radius: 999px !important;
        font-size: .76rem !important;
        white-space: nowrap;
      }

      .game--draw .performance-stack {
        grid-template-rows: auto minmax(0, 1fr) auto;
      }

      .game--draw .performance-surface {
        min-height: 0;
      }

      .game--draw .prompt {
        padding-block: 4px;
        font-size: clamp(2.6rem, 11.5vw, 4.8rem);
      }

      .game--draw .performance-actions {
        grid-template-columns: 1fr auto;
      }

      .prompt-card.is-dragging {
        transition: none !important;
      }

      .prompt-card.is-scoring-swipe {
        pointer-events: none;
        transition: transform 130ms ease-out, opacity 130ms ease-out !important;
        transform: translateX(118%) rotate(4deg) !important;
        opacity: 0 !important;
      }

      @media (max-height: 700px) {
        .game--choose .prompt {
          font-size: clamp(3rem, 15vw, 6.3rem);
        }

        .method {
          min-height: 104px;
        }

        .game--perform .prompt {
          font-size: clamp(3.2rem, 15vw, 6.5rem);
        }

        .swipe-hint {
          min-height: 38px;
          font-size: .56rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .prompt-card.is-scoring-swipe {
          transition: opacity 70ms linear !important;
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, input, select, textarea, canvas, .canvas-toolbar, [role="button"]'));
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
    const { card } = gesture;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    gesture.dx = dx;
    gesture.dy = dy;

    if (dx <= 0 || Math.abs(dy) > Math.abs(dx) * 1.25) {
      card.style.transform = 'translateX(0)';
      card.style.opacity = '1';
      return;
    }

    const width = Math.max(1, card.getBoundingClientRect().width);
    const clamped = Math.min(dx, width * 0.72);
    const progress = Math.min(1, clamped / (width * 0.72));
    card.style.transform = `translateX(${clamped}px) rotate(${progress * 2.5}deg)`;
    card.style.opacity = String(1 - progress * 0.22);
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
    const deliberateRightSwipe = active.dx >= threshold && Math.abs(active.dy) < Math.max(120, Math.abs(active.dx));
    const quickRightSwipe = active.dx >= SWIPE_FAST_MIN_PX && velocity >= SWIPE_FAST_VELOCITY && Math.abs(active.dy) < 90;

    if (!deliberateRightSwipe && !quickRightSwipe) {
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

  function simplifyRenderedGame(root = app) {
    root.querySelectorAll('.choice-microcopy > span').forEach(node => {
      node.textContent = 'TAP A METHOD AND GO';
    });

    root.querySelectorAll('.handoff-rule strong').forEach(node => {
      node.textContent = 'Tap a method and go.';
    });

    root.querySelectorAll('.game--perform .performance-actions').forEach(actions => {
      if (actions.querySelector('.swipe-hint')) return;
      const hint = document.createElement('div');
      hint.className = 'swipe-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'Swipe right when guessed';
      actions.prepend(hint);
    });

    root.querySelectorAll('.game--perform .prompt-card').forEach(card => {
      card.setAttribute('data-swipe-to-score', 'true');
    });

    root.querySelectorAll('.game--choose .prompt-meta > span:last-child').forEach(node => {
      if ((node.textContent || '').trim() === 'NO SKIP') node.textContent = '';
    });
  }

  function handleKeydown(event) {
    if (event.key !== 'ArrowRight') return;
    if (!(document.querySelector('.game--perform .prompt-card'))) return;
    if (isInteractiveTarget(document.activeElement)) return;
    const correct = document.getElementById('correct');
    if (!(correct instanceof HTMLButtonElement) || correct.disabled) return;
    event.preventDefault();
    correct.click();
  }

  installStyles();
  simplifyRenderedGame();

  app.addEventListener('pointerdown', beginGesture);
  app.addEventListener('pointermove', moveGesture);
  app.addEventListener('pointerup', event => finishGesture(event, false));
  app.addEventListener('pointercancel', event => finishGesture(event, true));
  document.addEventListener('keydown', handleKeydown);

  const observer = new MutationObserver(() => simplifyRenderedGame());
  observer.observe(app, { childList: true, subtree: true });
})();
