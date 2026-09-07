(() => {
  'use strict';

  const APP_VERSION = '0.4.0-pwa-v2.1';
  const STORAGE_KEY = 'gtp.playtest.state.v4';
  const LEGACY_STORAGE_KEYS = ['gtp.playtest.state.v3'];
  const STATS_KEY = 'gtp.playtest.stats.v2';
  const app = document.getElementById('app');
  if (!app) return;

  const ROUTE_ORDER = ['audio', 'draw', 'mime'];
  const ROUND_SECONDS = [60, 30, 15];

  const DECK = [
    ['VOLCANO',2,1,3],['SNEEZE',1,3,2],['ROBOT',3,2,1],['THUNDER',1,2,3],['CAT',3,1,2],['DOG',3,2,1],
    ['CLOCK',2,1,3],['TRAIN',1,2,3],['HELICOPTER',3,1,2],['BEE',1,2,3],['DRUM',2,1,3],['BABY',3,2,1],
    ['GHOST',3,1,2],['MONKEY',3,2,1],['LION',1,2,3],['PIANO',2,1,3],['SIREN',1,2,3],['POPCORN',3,1,2],
    ['RAIN',2,1,3],['WIND',3,2,1],['FIREWORKS',1,2,3],['SNAKE',3,1,2],['HORSE',3,2,1],['FROG',1,2,3],
    ['CHICKEN',3,1,2],['ALARM',1,2,3],['ROCKET',2,1,3],['MOTORCYCLE',1,2,3],['DOORBELL',1,2,3],['HAMMER',3,1,2],
    ['VACUUM',1,2,3],['CAMERA',3,1,2],['BALLOON',3,2,1],['ZIPPER',2,1,3],['MICROWAVE',1,2,3],['BLENDER',1,2,3],
    ['TELEPHONE',3,1,2],['KEYBOARD',3,2,1],['PRINTER',2,1,3],['HICCUP',1,3,2],['COUGH',1,3,2],['LAUGH',3,2,1],
    ['CRYING',3,2,1],['WHISTLE',1,3,2],['APPLAUSE',2,3,1],['SNORING',1,3,2],['BUBBLES',2,1,3],['ECHO',1,3,2],
    ['WOLF',1,2,3],['OWL',1,2,3],['DUCK',3,2,1],['COW',3,2,1],['SHEEP',3,2,1],['MOUSE',3,1,2],
    ['ELEPHANT',3,1,2],['GORILLA',3,2,1],['PENGUIN',3,1,2],['DOLPHIN',1,2,3],['SEAL',1,2,3],['WHALE',1,2,3],
    ['TRUMPET',2,1,3],['GUITAR',3,1,2],['VIOLIN',2,1,3],['MARACAS',2,1,3],['TROMBONE',2,1,3],['KAZOO',1,2,3],
    ['TOILET',3,1,2],['SHOWER',2,1,3],['KETTLE',1,2,3],['TOASTER',3,1,2],['FAN',1,2,3],['ENGINE',1,2,3]
  ].map(([prompt, audio, draw, mime], id) => ({ id, prompt, points: { audio, draw, mime } }));

  let deferredInstallPrompt = null;
  let timerId = null;
  let canvasCleanup = null;
  let feedbackTimer = null;

  function defaultState() {
    return {
      schemaVersion: 4,
      view: 'home',
      teams: [{ name: 'Team 1', score: 0 }, { name: 'Team 2', score: 0 }],
      roundIndex: 0,
      teamIndex: 0,
      turnSeconds: ROUND_SECONDS[0],
      remainingMs: ROUND_SECONDS[0] * 1000,
      timerDeadline: null,
      timerRunning: false,
      timerStartMode: 'commit',
      audioMode: 'hum',
      passMode: 'one',
      passesRemaining: 1,
      promptOrder: shuffle(DECK.map(card => card.id)),
      promptCursor: 0,
      currentPromptId: null,
      selectedRoute: null,
      selectedPoints: 0,
      promptStartedAt: null,
      methodLockedAt: null,
      gameStartedAt: null,
      gameId: null,
      seenPromptIds: [],
      turnCorrectCount: 0,
      turnAttemptCount: 0,
      turnStartScore: 0,
      lastTurnSummary: null
    };
  }

  function routeMeta(route) {
    if (route === 'audio') return {
      label: state.audioMode === 'sound' ? 'SOUND' : 'HUM',
      icon: state.audioMode === 'sound' ? ')))' : '♫',
      className: 'method--hum'
    };
    if (route === 'draw') return { label: 'DRAW', icon: '✎', className: 'method--draw' };
    return { label: 'MIME', icon: '◒', className: 'method--mime' };
  }

  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (const key of LEGACY_STORAGE_KEYS) {
          raw = localStorage.getItem(key);
          if (raw) break;
        }
      }
      if (!raw) return defaultState();
      const saved = JSON.parse(raw);
      const base = defaultState();
      const merged = { ...base, ...saved, schemaVersion: 4 };
      if (!Array.isArray(merged.teams) || merged.teams.length < 2) merged.teams = base.teams;
      if (!Array.isArray(merged.promptOrder) || merged.promptOrder.length !== DECK.length) merged.promptOrder = shuffle(DECK.map(card => card.id));
      if (!['commit', 'reveal'].includes(merged.timerStartMode)) merged.timerStartMode = 'commit';
      if (!['hum', 'sound'].includes(merged.audioMode)) merged.audioMode = 'hum';
      if (!['one', 'none'].includes(merged.passMode)) merged.passMode = 'one';
      return merged;
    } catch (error) {
      console.warn('State restore failed:', error);
      return defaultState();
    }
  }

  let state = loadState();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn('State save failed:', error); }
  }

  function loadStats() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function addStat(record) {
    const rows = loadStats();
    rows.push({ recordedAt: new Date().toISOString(), appVersion: APP_VERSION, ...record });
    try { localStorage.setItem(STATS_KEY, JSON.stringify(rows)); }
    catch (error) { console.warn('Stats save failed:', error); }
  }

  function shuffle(values) {
    const array = [...values];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  }

  function currentTeam() { return state.teams[state.teamIndex]; }
  function currentCard() { return DECK.find(card => card.id === state.currentPromptId) || null; }
  function roundSeconds() { return ROUND_SECONDS[state.roundIndex] || 15; }
  function isInProgress() { return Boolean(state.gameId) && !['home', 'gameover'].includes(state.view); }
  function cryptoSafeId() { return globalThis.crypto?.randomUUID?.() || `game-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function formatSeconds(ms) { return String(Math.max(0, Math.ceil(ms / 1000))).padStart(2, '0'); }

  function render() {
    if (canvasCleanup) { canvasCleanup(); canvasCleanup = null; }
    if (state.timerRunning && state.timerDeadline) reconcileTimer();
    switch (state.view) {
      case 'setup': renderSetup(); break;
      case 'handoff': renderHandoff(); break;
      case 'game': renderGame(); break;
      case 'roundend': renderRoundEnd(); break;
      case 'gameover': renderGameOver(); break;
      default: renderHome(); break;
    }
  }

  function setView(view) {
    stopTimer(false);
    state.view = view;
    persist();
    render();
  }

  function renderHome() {
    const resume = isInProgress();
    app.innerHTML = `<main class="screen screen--center home-screen">
      <section class="home-brand">
        <div class="eyebrow">PLAYTEST BUILD · v2.1 CHALLENGER</div>
        <h1 class="brand"><span class="line">GET THE</span><span class="line">POINT</span></h1>
        <div class="brand-accent" aria-hidden="true"><i></i><i></i><i></i></div>
        <p class="lede"><strong>One prompt. Three routes. Your call.</strong><br>Choose the risk, commit, and get your team to the answer before time runs out.</p>
      </section>
      <div class="core-loop" aria-label="Core game loop"><span>SEE</span><i>→</i><span>CHOOSE</span><i>→</i><span>COMMIT</span><i>→</i><span>GUESS</span></div>
      <div class="stack home-actions">
        ${resume ? '<button id="resumeGame" class="btn btn--yellow btn--hero">Resume game</button>' : ''}
        <button id="newGame" class="btn btn--teal btn--hero">Quick Play</button>
        <div class="grid-2"><button id="howTo" class="btn btn--dark">How to play</button><button id="stats" class="btn btn--dark">Playtest data</button></div>
        <button id="install" class="btn btn--ghost btn--small" hidden>Install app</button>
      </div>
      <div class="version">Offline-ready · local-only · ${APP_VERSION}</div>
    </main>`;
    bind('newGame', 'click', () => { state = defaultState(); state.view = 'setup'; persist(); render(); });
    bind('resumeGame', 'click', renderResume);
    bind('howTo', 'click', showHowTo);
    bind('stats', 'click', showStats);
    bind('install', 'click', installApp);
    updateInstallButton();
  }

  function renderResume() {
    if (state.timerRunning && state.timerDeadline && state.timerDeadline <= Date.now()) return handleTimeExpired();
    render();
  }

  function renderSetup() {
    app.innerHTML = `<main class="screen setup-screen">
      <header class="topbar"><button id="backHome" class="icon-btn" aria-label="Back">←</button><span class="pill">QUICK PLAY</span><span></span></header>
      <section class="setup-primary stack">
        <div><div class="eyebrow">TEAMS</div><h1 class="section-title">Who's playing?</h1></div>
        <div id="teamList" class="stack">${teamInputsHtml()}</div>
        <button id="addTeam" class="btn btn--dark btn--small" ${state.teams.length >= 4 ? 'disabled' : ''}>+ Add team</button>
      </section>
      <details class="test-controls">
        <summary>Playtest controls <span>optional</span></summary>
        <div class="panel stack">
          <div><span class="field-label">Audio route · unresolved</span><div class="segmented"><button type="button" data-audio-mode="hum" aria-pressed="${state.audioMode === 'hum'}">HUM</button><button type="button" data-audio-mode="sound" aria-pressed="${state.audioMode === 'sound'}">SOUND</button></div></div>
          <div><span class="field-label">Timer start · unresolved</span><div class="segmented"><button type="button" data-timer-start="commit" aria-pressed="${state.timerStartMode === 'commit'}">On commit</button><button type="button" data-timer-start="reveal" aria-pressed="${state.timerStartMode === 'reveal'}">On reveal</button></div></div>
          <div><span class="field-label">Pass rule · unresolved</span><div class="segmented"><button type="button" data-pass="one" aria-pressed="${state.passMode === 'one'}">1 per turn</button><button type="button" data-pass="none" aria-pressed="${state.passMode === 'none'}">No pass</button></div></div>
          <div class="note">Round baseline: <strong>60 → 30 → 15 sec</strong>. These are test conditions, not final rules.</div>
        </div>
      </details>
      <button id="startGame" class="btn btn--yellow btn--hero setup-start">Start Round 1 · 60 sec</button>
    </main>`;

    bind('backHome', 'click', () => setView('home'));
    bind('addTeam', 'click', () => { if (state.teams.length < 4) { state.teams.push({ name: `Team ${state.teams.length + 1}`, score: 0 }); persist(); render(); } });
    app.querySelectorAll('[data-remove-team]').forEach(btn => btn.addEventListener('click', () => { const i = Number(btn.dataset.removeTeam); if (state.teams.length > 2 && Number.isInteger(i)) { state.teams.splice(i, 1); persist(); render(); } }));
    app.querySelectorAll('[data-team-name]').forEach(input => input.addEventListener('input', () => { const i = Number(input.dataset.teamName); if (state.teams[i]) { state.teams[i].name = input.value.slice(0, 28); persist(); } }));
    app.querySelectorAll('[data-audio-mode]').forEach(btn => btn.addEventListener('click', () => { state.audioMode = btn.dataset.audioMode === 'sound' ? 'sound' : 'hum'; persist(); render(); }));
    app.querySelectorAll('[data-timer-start]').forEach(btn => btn.addEventListener('click', () => { state.timerStartMode = btn.dataset.timerStart === 'reveal' ? 'reveal' : 'commit'; persist(); render(); }));
    app.querySelectorAll('[data-pass]').forEach(btn => btn.addEventListener('click', () => { state.passMode = btn.dataset.pass === 'none' ? 'none' : 'one'; persist(); render(); }));
    bind('startGame', 'click', startNewGame);
  }

  function teamInputsHtml() {
    return state.teams.map((team, i) => `<div class="team-row"><span class="team-dot team-dot--${i + 1}">${i + 1}</span><label><input class="input" data-team-name="${i}" aria-label="Team ${i + 1} name" value="${escapeHtml(team.name)}" maxlength="28"></label><button class="remove-team" data-remove-team="${i}" aria-label="Remove ${escapeHtml(team.name)}" ${state.teams.length <= 2 ? 'disabled' : ''}>×</button></div>`).join('');
  }

  function startNewGame() {
    state.teams = state.teams.map((team, i) => ({ name: team.name.trim() || `Team ${i + 1}`, score: 0 }));
    Object.assign(state, {
      roundIndex: 0, teamIndex: 0, turnSeconds: 60, remainingMs: 60000, timerDeadline: null, timerRunning: false,
      promptOrder: shuffle(DECK.map(card => card.id)), promptCursor: 0, currentPromptId: null, selectedRoute: null, selectedPoints: 0,
      passesRemaining: state.passMode === 'one' ? 1 : 0, gameStartedAt: new Date().toISOString(), gameId: cryptoSafeId(), seenPromptIds: [],
      turnCorrectCount: 0, turnAttemptCount: 0, turnStartScore: 0, lastTurnSummary: null, view: 'handoff'
    });
    persist(); render();
  }

  function renderHandoff() {
    state.timerRunning = false;
    state.timerDeadline = null;
    state.remainingMs = roundSeconds() * 1000;
    state.turnSeconds = roundSeconds();
    state.currentPromptId = null;
    state.selectedRoute = null;
    state.selectedPoints = 0;
    state.promptStartedAt = null;
    state.methodLockedAt = null;
    state.passesRemaining = state.passMode === 'one' ? 1 : 0;
    state.turnCorrectCount = 0;
    state.turnAttemptCount = 0;
    state.turnStartScore = currentTeam().score;
    persist();

    const summary = state.lastTurnSummary;
    app.innerHTML = `<main class="screen handoff">
      ${summary ? `<div class="turn-summary"><span>TIME</span><strong>${escapeHtml(summary.team)}</strong><b>+${summary.points} pts · ${summary.correct} correct</b></div>` : ''}
      <div class="round-badge">ROUND ${state.roundIndex + 1} · ${roundSeconds()} SEC</div>
      <div class="team-chip"><span class="team-dot team-dot--${state.teamIndex + 1}">${state.teamIndex + 1}</span>${escapeHtml(currentTeam().name)}</div>
      <h1>PASS<br>THE PHONE.</h1>
      <p>${state.timerStartMode === 'commit' ? 'The clock starts on the first route choice.' : 'The clock starts as soon as the first prompt appears.'}</p>
      <div class="handoff-rule"><strong>One tap commits.</strong><span>${state.audioMode === 'hum' ? 'HUM' : 'SOUND'} → DRAW → MIME</span></div>
      <button id="beginTurn" class="btn btn--yellow btn--hero">Ready · Start turn</button>
      <button id="quitGame" class="btn btn--ghost btn--small">End playtest</button>
    </main>`;
    state.lastTurnSummary = null; persist();
    bind('beginTurn', 'click', beginTurn);
    bind('quitGame', 'click', confirmQuit);
  }

  function beginTurn() {
    state.view = 'game';
    state.remainingMs = roundSeconds() * 1000;
    state.timerRunning = state.timerStartMode === 'reveal';
    state.timerDeadline = state.timerRunning ? Date.now() + state.remainingMs : null;
    nextPrompt(); persist(); render(); if (state.timerRunning) startTimerLoop();
  }

  function nextPrompt() {
    if (state.promptCursor >= state.promptOrder.length) {
      state.promptOrder = shuffle(DECK.map(card => card.id));
      state.promptCursor = 0;
    }
    const id = state.promptOrder[state.promptCursor++];
    state.currentPromptId = id;
    if (!state.seenPromptIds.includes(id)) state.seenPromptIds.push(id);
    state.selectedRoute = null;
    state.selectedPoints = 0;
    state.promptStartedAt = Date.now();
    state.methodLockedAt = null;
  }

  function renderGame() {
    const card = currentCard();
    if (!card) { nextPrompt(); persist(); return renderGame(); }
    const team = currentTeam();
    const remaining = Math.max(0, state.remainingMs);
    const timerClass = remaining <= 3000 ? 'timer timer--critical' : remaining <= 10000 ? 'timer timer--urgent' : 'timer';
    const progress = Math.max(0, Math.min(100, (remaining / (roundSeconds() * 1000)) * 100));
    const phase = state.selectedRoute ? 'CLUE' : 'CHOOSE';
    app.innerHTML = `<main class="screen game">
      <header class="game-hud"><div class="hud-team"><small>R${state.roundIndex + 1}</small>${escapeHtml(team.name)}</div><div id="timer" class="${timerClass}" role="timer">${formatSeconds(remaining)}</div><div class="hud-score"><small>SCORE</small>${team.score}</div></header>
      <div class="timer-rail" aria-hidden="true"><i id="timerProgress" style="width:${progress}%"></i></div>
      <section class="card prompt-card ${state.selectedRoute ? 'prompt-card--committed' : ''}">
        <div class="prompt-meta"><span class="phase-pill">${phase}</span><span>${state.passMode === 'one' ? `${state.passesRemaining} PASS` : 'NO PASS'}</span></div>
        <div class="prompt">${escapeHtml(card.prompt)}</div>
        ${state.selectedRoute ? lockedHtml() : choiceHtml(card)}
      </section>
    </main>`;
    if (state.selectedRoute) bindLockedActions(card); else bindChoiceActions(card);
    if (state.timerRunning) startTimerLoop();
  }

  function choiceHtml(card) {
    return `<div class="choice-zone"><div class="methods" aria-label="Choose a route">${ROUTE_ORDER.map(route => {
      const meta = routeMeta(route); const pts = card.points[route];
      return `<button class="method ${meta.className}" data-route="${route}" aria-label="${meta.label}, ${pts} ${pts === 1 ? 'point' : 'points'}"><span class="method-icon" aria-hidden="true">${meta.icon}</span><span class="method-label">${meta.label}</span><span class="method-points">${pts}<small>${pts === 1 ? 'PT' : 'PTS'}</small></span></button>`;
    }).join('')}</div>${state.passMode === 'one' && state.passesRemaining > 0 ? '<button id="passPrompt" class="precommit-pass">Pass this prompt</button>' : ''}</div>`;
  }

  function lockedHtml() {
    const meta = routeMeta(state.selectedRoute);
    const draw = state.selectedRoute === 'draw' ? '<div class="canvas-wrap"><canvas id="drawCanvas" class="draw-canvas" aria-label="Drawing canvas"></canvas><div class="canvas-toolbar"><button id="undoCanvas" class="btn btn--dark btn--small">Undo</button><button id="clearCanvas" class="btn btn--dark btn--small">Clear</button></div></div>' : `<div class="perform-zone"><span>${meta.icon}</span><b>GO!</b></div>`;
    return `<div class="locked-wrap"><div class="locked-choice ${meta.className}"><span class="method-icon">${meta.icon}</span><strong>${meta.label}<small>COMMITTED</small></strong><b>${state.selectedPoints}<small>PTS</small></b></div>${draw}<div class="action-row"><button id="correct" class="btn btn--teal btn--correct">✓ Correct · +${state.selectedPoints}</button><button id="pass" class="btn btn--dark" ${state.passMode === 'none' || state.passesRemaining <= 0 ? 'disabled' : ''}>Pass</button></div></div>`;
  }

  function bindChoiceActions(card) {
    app.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => {
      if (state.selectedRoute) return;
      const route = button.dataset.route;
      if (!ROUTE_ORDER.includes(route)) return;
      state.selectedRoute = route;
      state.selectedPoints = card.points[route];
      state.methodLockedAt = Date.now();
      state.turnAttemptCount += 1;
      if (state.timerStartMode === 'commit' && !state.timerRunning) {
        state.timerRunning = true;
        state.timerDeadline = Date.now() + state.remainingMs;
      }
      persist(); renderGame(); haptic(25);
    }));
    bind('passPrompt', 'click', () => passUncommitted(card));
  }

  function passUncommitted(card) {
    if (state.passMode !== 'one' || state.passesRemaining <= 0 || state.selectedRoute) return;
    const now = Date.now();
    state.passesRemaining -= 1;
    state.turnAttemptCount += 1;
    addStat({ gameId: state.gameId, round: state.roundIndex + 1, turnSeconds: state.turnSeconds, team: currentTeam().name, promptId: card.id, prompt: card.prompt, route: null, methodLabel: null, audioMode: state.audioMode, timerStartMode: state.timerStartMode, pointValue: 0, outcome: 'pass-uncommitted', awarded: 0, elapsedMs: Math.max(0, now - (state.promptStartedAt || now)), decisionMs: Math.max(0, now - (state.promptStartedAt || now)) });
    nextPrompt(); persist(); renderGame(); showFeedback('PASS', 'neutral'); haptic(12);
  }

  function bindLockedActions(card) {
    bind('correct', 'click', () => resolvePrompt('correct', card));
    bind('pass', 'click', () => resolvePrompt('pass', card));
    if (state.selectedRoute === 'draw') setupCanvas();
  }

  function resolvePrompt(outcome, card) {
    if (!state.selectedRoute) return;
    if (outcome === 'pass' && (state.passMode === 'none' || state.passesRemaining <= 0)) return;
    const now = Date.now();
    const elapsedMs = Math.max(0, now - (state.promptStartedAt || now));
    const decisionMs = state.methodLockedAt && state.promptStartedAt ? Math.max(0, state.methodLockedAt - state.promptStartedAt) : null;
    const awarded = outcome === 'correct' ? state.selectedPoints : 0;
    if (outcome === 'correct') { currentTeam().score += awarded; state.turnCorrectCount += 1; }
    if (outcome === 'pass') state.passesRemaining -= 1;
    const meta = routeMeta(state.selectedRoute);
    addStat({ gameId: state.gameId, round: state.roundIndex + 1, turnSeconds: state.turnSeconds, team: currentTeam().name, promptId: card.id, prompt: card.prompt, route: state.selectedRoute, methodLabel: meta.label, audioMode: state.audioMode, timerStartMode: state.timerStartMode, pointValue: state.selectedPoints, outcome, awarded, elapsedMs, decisionMs });
    nextPrompt(); persist(); renderGame();
    showFeedback(outcome === 'correct' ? `+${awarded}` : 'PASS', outcome === 'correct' ? 'score' : 'neutral');
    haptic(outcome === 'correct' ? [20, 30, 20] : 12);
  }

  function showFeedback(text, tone) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    const node = document.createElement('div');
    node.className = `score-pop score-pop--${tone}`;
    node.textContent = text;
    document.body.appendChild(node);
    feedbackTimer = setTimeout(() => node.remove(), 420);
  }

  function haptic(pattern) { try { navigator.vibrate?.(pattern); } catch {} }

  function setupCanvas() {
    const canvas = document.getElementById('drawCanvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let strokes = []; let currentStroke = null;
    const configure = () => { ctx.setTransform(ratio,0,0,ratio,0,0); ctx.lineWidth=5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#101112'; };
    const redraw = () => { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); configure(); strokes.forEach(stroke => { if (stroke.length < 2) return; ctx.beginPath(); ctx.moveTo(stroke[0].x,stroke[0].y); stroke.slice(1).forEach(p => ctx.lineTo(p.x,p.y)); ctx.stroke(); }); };
    const resize = () => { const rect = canvas.getBoundingClientRect(); canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio); redraw(); };
    const point = event => { const rect = canvas.getBoundingClientRect(); return { x:event.clientX-rect.left, y:event.clientY-rect.top }; };
    const down = event => { event.preventDefault(); currentStroke=[point(event)]; strokes.push(currentStroke); canvas.setPointerCapture?.(event.pointerId); };
    const move = event => { if (!currentStroke) return; event.preventDefault(); const next=point(event); const last=currentStroke[currentStroke.length-1]; currentStroke.push(next); configure(); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(next.x,next.y); ctx.stroke(); };
    const up = event => { currentStroke=null; try { canvas.releasePointerCapture?.(event.pointerId); } catch {} };
    canvas.addEventListener('pointerdown',down); canvas.addEventListener('pointermove',move); canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up); resize();
    bind('undoCanvas','click',()=>{ strokes.pop(); redraw(); });
    bind('clearCanvas','click',()=>{ strokes=[]; redraw(); });
    canvasCleanup=()=>{ canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointermove',move); canvas.removeEventListener('pointerup',up); canvas.removeEventListener('pointercancel',up); };
  }

  function startTimerLoop() {
    if (timerId || !state.timerRunning || !state.timerDeadline) return;
    timerId = window.setInterval(() => {
      if (!state.timerRunning || !state.timerDeadline) return stopTimer(false);
      state.remainingMs = Math.max(0, state.timerDeadline - Date.now());
      updateTimerDom();
      if (state.remainingMs <= 0) handleTimeExpired();
    }, 100);
  }

  function reconcileTimer() {
    if (!state.timerRunning || !state.timerDeadline) return;
    state.remainingMs = Math.max(0, state.timerDeadline - Date.now());
    if (state.remainingMs <= 0) { state.timerRunning = false; state.timerDeadline = null; }
  }

  function stopTimer(keepRemaining = true) {
    if (keepRemaining && state.timerRunning && state.timerDeadline) state.remainingMs = Math.max(0, state.timerDeadline - Date.now());
    if (timerId) { clearInterval(timerId); timerId = null; }
    state.timerRunning = false; state.timerDeadline = null;
  }

  function updateTimerDom() {
    const timer = document.getElementById('timer');
    if (timer) {
      timer.textContent = formatSeconds(state.remainingMs);
      timer.className = state.remainingMs <= 3000 ? 'timer timer--critical' : state.remainingMs <= 10000 ? 'timer timer--urgent' : 'timer';
    }
    const rail = document.getElementById('timerProgress');
    if (rail) rail.style.width = `${Math.max(0, Math.min(100, (state.remainingMs / (roundSeconds() * 1000)) * 100))}%`;
  }

  function handleTimeExpired() {
    if (state.view !== 'game') return;
    const card = currentCard();
    if (card && state.selectedRoute) {
      const now = Date.now(); const meta = routeMeta(state.selectedRoute);
      addStat({ gameId:state.gameId, round:state.roundIndex+1, turnSeconds:state.turnSeconds, team:currentTeam().name, promptId:card.id, prompt:card.prompt, route:state.selectedRoute, methodLabel:meta.label, audioMode:state.audioMode, timerStartMode:state.timerStartMode, pointValue:state.selectedPoints, outcome:'timeout', awarded:0, elapsedMs:Math.max(0,now-(state.promptStartedAt||now)), decisionMs:state.methodLockedAt&&state.promptStartedAt?Math.max(0,state.methodLockedAt-state.promptStartedAt):null });
    }
    const team = currentTeam();
    state.lastTurnSummary = { team: team.name, points: team.score - state.turnStartScore, correct: state.turnCorrectCount };
    stopTimer(false); state.remainingMs = 0;
    state.teamIndex += 1;
    if (state.teamIndex >= state.teams.length) { state.teamIndex = 0; state.view = 'roundend'; }
    else state.view = 'handoff';
    persist(); render(); haptic([80,40,80]);
  }

  function renderRoundEnd() {
    const completedRound = state.roundIndex + 1;
    app.innerHTML = `<main class="screen screen--center results-screen"><div class="eyebrow">ROUND ${completedRound} COMPLETE</div><h1 class="brand"><span class="line">SCORES</span></h1><div class="score-list">${scoreRowsHtml()}</div>${state.roundIndex < ROUND_SECONDS.length - 1 ? `<button id="nextRound" class="btn btn--yellow btn--hero">Round ${state.roundIndex + 2} · ${ROUND_SECONDS[state.roundIndex + 1]} sec</button>` : '<button id="finishGame" class="btn btn--purple btn--hero">Final results</button>'}<div class="note">Current prototype: one timed turn per team per round. Final team/round structure remains unresolved.</div></main>`;
    bind('nextRound','click',()=>{ state.roundIndex += 1; state.teamIndex = 0; state.lastTurnSummary = null; state.view = 'handoff'; persist(); render(); });
    bind('finishGame','click',()=>{ state.view='gameover'; persist(); render(); });
  }

  function scoreRowsHtml() {
    return [...state.teams].sort((a,b)=>b.score-a.score).map((team,index)=>`<div class="score-row"><span class="team-dot team-dot--${Math.min(index+1,4)}">${index+1}</span><strong>${escapeHtml(team.name)}</strong><b>${team.score}</b></div>`).join('');
  }

  function renderGameOver() {
    stopTimer(false);
    const sorted=[...state.teams].sort((a,b)=>b.score-a.score);
    const winners=sorted.filter(team=>team.score===sorted[0].score);
    const winnerText=winners.length>1?`${winners.length}-way tie`:winners[0].name;
    app.innerHTML=`<main class="screen screen--center results-screen"><div class="eyebrow">PLAYTEST COMPLETE</div><div class="winner"><div class="eyebrow">TOP SCORE</div><h2>${escapeHtml(winnerText)}</h2><div class="winner-score">${winners[0].score} points</div></div><div class="score-list">${scoreRowsHtml()}</div><div class="stack"><button id="again" class="btn btn--teal btn--hero">Play again</button><button id="viewStats" class="btn btn--dark">View playtest data</button><button id="home" class="btn btn--ghost">Home</button></div></main>`;
    bind('again','click',()=>{ state.view='setup'; state.gameId=null; persist(); render(); });
    bind('viewStats','click',showStats);
    bind('home','click',()=>{ state.gameId=null; state.view='home'; persist(); render(); });
  }

  function showHowTo() {
    const audio=state.audioMode==='sound'?'SOUND':'HUM';
    openModal(`<h2>How to play</h2><ol><li>Reveal one prompt and three prompt-specific route values.</li><li>Choose <strong>${audio}</strong>, <strong>DRAW</strong>, or <strong>MIME</strong>.</li><li><strong>One tap commits.</strong> No second confirmation.</li><li>Teammates guess. Correct scores the selected points and immediately reveals the next prompt while time keeps running.</li></ol><p><strong>Test baseline:</strong> 60 → 30 → 15 sec.</p><p><strong>Still being tested:</strong> HUM vs SOUND, pass behavior, timer start timing, Easy/Hard handling, and final team/round structure.</p><div class="install-hint"><strong>Offline:</strong> the starter playtest, game state, and metrics stay on this device.</div><div class="modal-actions"><button class="btn btn--dark" data-close-modal>Close</button></div>`);
  }

  function showStats() {
    const rows=loadStats(); const labels=['HUM/SOUND','DRAW','MIME']; const routes=['audio','draw','mime'];
    const byRoute=routes.map((route,index)=>{const attempts=rows.filter(row=>row.route===route);const correct=attempts.filter(row=>row.outcome==='correct');return{label:labels[index],attempts:attempts.length,success:attempts.length?Math.round(correct.length/attempts.length*100):0,avgSec:correct.length?(correct.reduce((sum,row)=>sum+(row.elapsedMs||0),0)/correct.length/1000).toFixed(1):'—'};});
    const uncommittedPasses=rows.filter(row=>row.outcome==='pass-uncommitted').length;
    openModal(`<h2>Playtest data</h2><p>${rows.length} prompt events recorded locally · ${uncommittedPasses} pre-commit passes.</p><table class="stats"><thead><tr><th>Route</th><th>Attempts</th><th>Success</th><th>Avg correct</th></tr></thead><tbody>${byRoute.map(row=>`<tr><td>${row.label}</td><td>${row.attempts}</td><td>${row.success}%</td><td>${row.avgSec}${row.avgSec==='—'?'':'s'}</td></tr>`).join('')}</tbody></table><div class="modal-actions"><button id="exportStats" class="btn btn--dark">Export JSON</button><button id="clearStats" class="btn">Clear local data</button><button class="btn btn--dark" data-close-modal>Close</button></div>`);
    bind('exportStats','click',exportStats);
    bind('clearStats','click',()=>{if(!confirm('Clear all locally stored playtest metrics?'))return;localStorage.removeItem(STATS_KEY);closeModal();showStats();});
  }

  function exportStats() {
    const payload={schema:'get-the-point-playtest-v3',exportedAt:new Date().toISOString(),appVersion:APP_VERSION,sessionConfig:{audioMode:state.audioMode,timerStartMode:state.timerStartMode,passMode:state.passMode},attempts:loadStats()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=`get-the-point-playtest-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  function confirmQuit() { openModal(`<h2>End this playtest?</h2><p>Completed metrics stay on this device, but the active game will be discarded.</p><div class="modal-actions"><button id="confirmQuit" class="btn btn--dark">End game</button><button class="btn" data-close-modal>Keep playing</button></div>`); bind('confirmQuit','click',()=>{closeModal();state=defaultState();persist();render();}); }
  function openModal(content){ closeModal(); const backdrop=document.createElement('div'); backdrop.id='modalBackdrop'; backdrop.className='modal-backdrop'; backdrop.innerHTML=`<section class="modal" role="dialog" aria-modal="true">${content}</section>`; document.body.appendChild(backdrop); backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal();}); backdrop.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',closeModal)); backdrop.querySelector('button')?.focus(); }
  function closeModal(){ document.getElementById('modalBackdrop')?.remove(); }
  function bind(id,event,handler){ document.getElementById(id)?.addEventListener(event,handler); }

  function installApp(){ if(deferredInstallPrompt){deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null;updateInstallButton();});return;} const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent); openModal(`<h2>Install app</h2>${isiOS?'<p>On iPhone/iPad Safari: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>':'<p>Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>'}<p>The installed version launches full-screen and keeps the starter playtest available offline.</p><div class="modal-actions"><button class="btn btn--dark" data-close-modal>Got it</button></div>`); }
  function updateInstallButton(){ const button=document.getElementById('install'); if(!button)return; const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; if(!standalone)button.hidden=false; }

  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;updateInstallButton();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.timerRunning&&state.timerDeadline){const remaining=state.timerDeadline-Date.now();if(remaining<=0)handleTimeExpired();else{state.remainingMs=remaining;persist();updateTimerDom();startTimerLoop();}}});
  window.addEventListener('pagehide',persist);
  if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('Service worker registration failed:',error));});}
  if(state.timerRunning&&state.timerDeadline){if(state.timerDeadline<=Date.now()){state.remainingMs=0;if(state.view==='game')setTimeout(handleTimeExpired,0);}else state.remainingMs=state.timerDeadline-Date.now();}
  render();
})();
