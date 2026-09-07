(() => {
  'use strict';

  const APP_VERSION = '0.3.0-pwa-v2.1';
  const STORAGE_KEY = 'gtp.playtest.state.v3';
  const STATS_KEY = 'gtp.playtest.stats.v2';
  const app = document.getElementById('app');
  if (!app) return;

  const ROUTE_ORDER = ['audio', 'draw', 'mime'];
  const ROUND_SECONDS = [60, 30, 15];

  // Candidate playtest content. The pool is intentionally one-word-heavy, but prompt
  // format is not a locked commercial rule. Points remain editorial estimates until
  // real playtest evidence replaces them.
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

  function routeMeta(route) {
    if (route === 'audio') {
      return {
        id: state.audioMode === 'sound' ? 'sound' : 'hum',
        label: state.audioMode === 'sound' ? 'SOUND' : 'HUM',
        icon: state.audioMode === 'sound' ? '◖))' : '♫',
        className: 'method--hum'
      };
    }
    if (route === 'draw') return { id: 'draw', label: 'DRAW', icon: '✎', className: 'method--draw' };
    return { id: 'mime', label: 'MIME', icon: '◒', className: 'method--mime' };
  }

  function defaultState() {
    return {
      schemaVersion: 3,
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
      promptOrder: shuffle(DECK.map(card => card.id)),
      promptCursor: 0,
      currentPromptId: null,
      selectedRoute: null,
      selectedPoints: 0,
      promptStartedAt: null,
      methodLockedAt: null,
      passMode: 'one',
      passesRemaining: 1,
      gameStartedAt: null,
      gameId: null,
      seenPromptIds: [],
      roundTurnCount: 0
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const saved = JSON.parse(raw);
      const base = defaultState();
      const merged = { ...base, ...saved };
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
      const raw = localStorage.getItem(STATS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

  function setView(view) {
    stopTimer(false);
    state.view = view;
    persist();
    render();
  }

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

  function renderHome() {
    const resume = isInProgress();
    app.innerHTML = `
      <main class="screen screen--center">
        <div>
          <div class="eyebrow">Playtest PWA · v2.1 challenger</div>
          <h1 class="brand"><span class="line">GET THE</span><span class="line">POINT</span></h1>
          <div class="brand-accent" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
        <p class="lede"><strong>One prompt. Three ways to play.</strong><br>Choose the route worth the risk, commit, and get your team to guess before time runs out.</p>
        <div class="panel stack" aria-label="Core mechanic">
          <span class="pill">1 · Reveal the prompt</span>
          <span class="pill">2 · Choose HUM / DRAW / MIME + points</span>
          <span class="pill">3 · One tap commits</span>
          <span class="pill">4 · Correct = score + next prompt</span>
        </div>
        <div class="stack home-actions">
          ${resume ? '<button id="resumeGame" class="btn btn--yellow">Resume playtest</button>' : ''}
          <button id="newGame" class="btn btn--teal">New game</button>
          <div class="grid-2">
            <button id="howTo" class="btn btn--dark">How to play</button>
            <button id="stats" class="btn btn--dark">Playtest data</button>
          </div>
          <button id="install" class="btn btn--ghost" hidden>Install app</button>
        </div>
        <div class="version">Offline-ready · local-only · ${APP_VERSION}</div>
      </main>`;

    bind('newGame', 'click', () => {
      const fresh = defaultState();
      fresh.view = 'setup';
      state = fresh;
      persist();
      render();
    });
    bind('resumeGame', 'click', renderResume);
    bind('howTo', 'click', showHowTo);
    bind('stats', 'click', showStats);
    bind('install', 'click', installApp);
    updateInstallButton();
  }

  function renderResume() {
    if (state.timerRunning && state.timerDeadline && state.timerDeadline <= Date.now()) {
      handleTimeExpired();
      return;
    }
    render();
  }

  function renderSetup() {
    app.innerHTML = `
      <main class="screen">
        <header class="topbar">
          <button id="backHome" class="icon-btn" aria-label="Back to home">←</button>
          <span class="pill">Quick Play</span>
          <span></span>
        </header>
        <section class="stack">
          <div>
            <div class="eyebrow">Team setup</div>
            <h1 class="section-title">Keep setup under two minutes.</h1>
          </div>
          <div id="teamList" class="stack">${teamInputsHtml()}</div>
          <button id="addTeam" class="btn btn--dark btn--small" ${state.teams.length >= 4 ? 'disabled' : ''}>+ Add team</button>
        </section>
        <section class="panel stack">
          <div><span class="field-label">Rounds · test baseline</span><div class="note"><strong>60 → 30 → 15 seconds</strong>. Final round/team structure remains unresolved.</div></div>
          <div><span class="field-label">Audio route · unresolved</span><div class="segmented" role="group" aria-label="Audio route label"><button type="button" data-audio-mode="hum" aria-pressed="${state.audioMode === 'hum'}">HUM challenger</button><button type="button" data-audio-mode="sound" aria-pressed="${state.audioMode === 'sound'}">SOUND comparison</button></div></div>
          <div><span class="field-label">Timer start · unresolved</span><div class="segmented" role="group" aria-label="Timer start condition"><button type="button" data-timer-start="commit" aria-pressed="${state.timerStartMode === 'commit'}">On commit</button><button type="button" data-timer-start="reveal" aria-pressed="${state.timerStartMode === 'reveal'}">On reveal</button></div></div>
          <div><span class="field-label">Pass rule · unresolved</span><div class="segmented" role="group" aria-label="Pass rule"><button type="button" data-pass="one" aria-pressed="${state.passMode === 'one'}">1 pass / turn</button><button type="button" data-pass="none" aria-pressed="${state.passMode === 'none'}">No pass</button></div></div>
          <div class="note">These controls are test conditions, not commercial rules.</div>
        </section>
        <div class="stack" style="margin-top:auto"><button id="startGame" class="btn btn--yellow">Start Round 1 · 60 sec</button></div>
      </main>`;

    bind('backHome', 'click', () => setView('home'));
    bind('addTeam', 'click', () => { if (state.teams.length < 4) { state.teams.push({ name: `Team ${state.teams.length + 1}`, score: 0 }); persist(); render(); } });
    app.querySelectorAll('[data-remove-team]').forEach(btn => btn.addEventListener('click', () => { const index = Number(btn.dataset.removeTeam); if (state.teams.length > 2 && Number.isInteger(index)) { state.teams.splice(index, 1); persist(); render(); } }));
    app.querySelectorAll('[data-team-name]').forEach(input => input.addEventListener('input', () => { const index = Number(input.dataset.teamName); if (state.teams[index]) { state.teams[index].name = input.value.slice(0, 28); persist(); } }));
    app.querySelectorAll('[data-audio-mode]').forEach(btn => btn.addEventListener('click', () => { state.audioMode = btn.dataset.audioMode === 'sound' ? 'sound' : 'hum'; persist(); render(); }));
    app.querySelectorAll('[data-timer-start]').forEach(btn => btn.addEventListener('click', () => { state.timerStartMode = btn.dataset.timerStart === 'reveal' ? 'reveal' : 'commit'; persist(); render(); }));
    app.querySelectorAll('[data-pass]').forEach(btn => btn.addEventListener('click', () => { state.passMode = btn.dataset.pass === 'none' ? 'none' : 'one'; persist(); render(); }));
    bind('startGame', 'click', startNewGame);
  }

  function teamInputsHtml() {
    return state.teams.map((team, index) => `<div class="team-row"><span class="team-dot team-dot--${index + 1}" aria-hidden="true">${index + 1}</span><label><input class="input" data-team-name="${index}" aria-label="Team ${index + 1} name" value="${escapeHtml(team.name)}" maxlength="28"></label><button class="remove-team" data-remove-team="${index}" aria-label="Remove ${escapeHtml(team.name)}" ${state.teams.length <= 2 ? 'disabled' : ''}>×</button></div>`).join('');
  }

  function startNewGame() {
    state.teams = state.teams.map((team, index) => ({ name: team.name.trim() || `Team ${index + 1}`, score: 0 }));
    state.roundIndex = 0; state.teamIndex = 0; state.turnSeconds = ROUND_SECONDS[0]; state.remainingMs = state.turnSeconds * 1000;
    state.timerDeadline = null; state.timerRunning = false; state.promptOrder = shuffle(DECK.map(card => card.id)); state.promptCursor = 0;
    state.currentPromptId = null; state.selectedRoute = null; state.selectedPoints = 0; state.passesRemaining = state.passMode === 'one' ? 1 : 0;
    state.gameStartedAt = new Date().toISOString(); state.gameId = cryptoSafeId(); state.seenPromptIds = []; state.roundTurnCount = 0; state.view = 'handoff';
    persist(); render();
  }

  function cryptoSafeId() { return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `game-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

  function renderHandoff() {
    state.timerRunning = false; state.timerDeadline = null; state.remainingMs = roundSeconds() * 1000; state.turnSeconds = roundSeconds();
    state.currentPromptId = null; state.selectedRoute = null; state.selectedPoints = 0; state.promptStartedAt = null; state.methodLockedAt = null; state.passesRemaining = state.passMode === 'one' ? 1 : 0; persist();
    app.innerHTML = `<main class="screen handoff"><div class="round-badge">Round ${state.roundIndex + 1} · ${roundSeconds()} seconds</div><div class="team-chip"><span class="team-dot team-dot--${state.teamIndex + 1}" style="width:28px;height:28px">${state.teamIndex + 1}</span>${escapeHtml(currentTeam().name)}</div><h1>PASS<br>THE PHONE.</h1><p>${state.timerStartMode === 'commit' ? 'Reveal a prompt, choose a route, and the clock starts when the route is committed.' : 'Start the turn, reveal the prompt, and the clock runs while the player decides.'}</p><div class="panel note"><strong>One tap commits the route.</strong> Current challenger order is ${state.audioMode === 'hum' ? 'HUM' : 'SOUND'} → DRAW → MIME.</div><button id="beginTurn" class="btn btn--yellow">Start ${roundSeconds()}-second turn</button><button id="quitGame" class="btn btn--ghost btn--small">End playtest</button></main>`;
    bind('beginTurn', 'click', beginTurn); bind('quitGame', 'click', confirmQuit);
  }

  function beginTurn() {
    state.view = 'game'; state.remainingMs = roundSeconds() * 1000; state.timerRunning = state.timerStartMode === 'reveal'; state.timerDeadline = state.timerRunning ? Date.now() + state.remainingMs : null; nextPrompt(); persist(); render(); if (state.timerRunning) startTimerLoop();
  }

  function nextPrompt() {
    if (state.promptCursor >= state.promptOrder.length) { state.promptOrder = shuffle(DECK.map(card => card.id)); state.promptCursor = 0; }
    const id = state.promptOrder[state.promptCursor++]; state.currentPromptId = id; if (!state.seenPromptIds.includes(id)) state.seenPromptIds.push(id);
    state.selectedRoute = null; state.selectedPoints = 0; state.promptStartedAt = Date.now(); state.methodLockedAt = null;
  }

  function renderGame() {
    const card = currentCard(); if (!card) { nextPrompt(); persist(); return renderGame(); }
    const team = currentTeam(); const remaining = Math.max(0, state.remainingMs); const timerClass = remaining <= 3000 ? 'timer timer--critical' : remaining <= 10000 ? 'timer timer--urgent' : 'timer';
    app.innerHTML = `<main class="screen game"><header class="game-hud"><div class="hud-team">R${state.roundIndex + 1} · ${escapeHtml(team.name)}</div><div id="timer" class="${timerClass}" role="timer" aria-label="Time remaining">${formatSeconds(remaining)}</div><div class="hud-score">${team.score} pts</div></header><section class="card prompt-card"><div class="prompt-meta"><span>ONE PROMPT</span><span>${state.passMode === 'one' ? `${state.passesRemaining} PASS LEFT` : 'NO PASS'}</span></div><div class="prompt">${escapeHtml(card.prompt)}</div>${state.selectedRoute ? lockedHtml() : methodsHtml(card)}</section></main>`;
    if (state.selectedRoute) bindLockedActions(card); else bindRouteButtons(card); if (state.timerRunning) startTimerLoop();
  }

  function methodsHtml(card) {
    return `<div class="methods" aria-label="Choose a route">${ROUTE_ORDER.map(route => { const meta = routeMeta(route); const pts = card.points[route]; return `<button class="method ${meta.className}" data-route="${route}" aria-label="${meta.label}, ${pts} ${pts === 1 ? 'point' : 'points'}"><span class="method-icon" aria-hidden="true">${meta.icon}</span><span class="method-label">${meta.label}</span><span class="method-points">${pts}<small>PT</small></span></button>`; }).join('')}</div>`;
  }

  function lockedHtml() {
    const meta = routeMeta(state.selectedRoute);
    return `<div class="locked-wrap"><div class="locked-choice ${meta.className}" aria-label="Committed route ${meta.label}, ${state.selectedPoints} points"><span class="method-icon" aria-hidden="true">${meta.icon}</span><strong>${meta.label} · COMMITTED</strong><b>${state.selectedPoints}</b></div>${state.selectedRoute === 'draw' ? '<div class="canvas-wrap"><canvas id="drawCanvas" class="draw-canvas" aria-label="Drawing canvas"></canvas><div class="canvas-toolbar"><button id="undoCanvas" class="btn btn--dark">Undo</button><button id="clearCanvas" class="btn btn--dark">Clear</button></div></div>' : ''}<div class="action-row"><button id="correct" class="btn btn--teal">Correct · +${state.selectedPoints}</button><button id="pass" class="btn btn--dark" ${state.passMode === 'none' || state.passesRemaining <= 0 ? 'disabled' : ''}>Pass</button></div><div class="pass-left">${state.passMode === 'one' ? 'PASS is a playtest rule · maximum one per turn' : 'No pass mode · finish or wait for the clock'}</div></div>`;
  }

  function bindRouteButtons(card) {
    app.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => {
      const route = button.dataset.route; if (!ROUTE_ORDER.includes(route) || state.selectedRoute) return;
      state.selectedRoute = route; state.selectedPoints = card.points[route]; state.methodLockedAt = Date.now();
      if (state.timerStartMode === 'commit' && !state.timerRunning) { state.timerRunning = true; state.timerDeadline = Date.now() + state.remainingMs; }
      persist(); renderGame(); try { navigator.vibrate?.(25); } catch {}
    }));
  }

  function bindLockedActions(card) { bind('correct', 'click', () => resolvePrompt('correct', card)); bind('pass', 'click', () => resolvePrompt('pass', card)); if (state.selectedRoute === 'draw') setupCanvas(); }

  function resolvePrompt(outcome, card) {
    if (!state.selectedRoute) return; const now = Date.now(); const elapsedMs = Math.max(0, now - (state.promptStartedAt || now)); const decisionMs = state.methodLockedAt && state.promptStartedAt ? Math.max(0, state.methodLockedAt - state.promptStartedAt) : null; const awarded = outcome === 'correct' ? state.selectedPoints : 0;
    if (outcome === 'correct') currentTeam().score += awarded; if (outcome === 'pass' && state.passMode === 'one' && state.passesRemaining > 0) state.passesRemaining -= 1;
    const meta = routeMeta(state.selectedRoute); addStat({ gameId: state.gameId, round: state.roundIndex + 1, turnSeconds: state.turnSeconds, team: currentTeam().name, promptId: card.id, prompt: card.prompt, route: state.selectedRoute, methodLabel: meta.label, audioMode: state.audioMode, timerStartMode: state.timerStartMode, pointValue: state.selectedPoints, outcome, awarded, elapsedMs, decisionMs });
    nextPrompt(); persist(); renderGame();
  }

  function setupCanvas() {
    const canvas = document.getElementById('drawCanvas'); if (!(canvas instanceof HTMLCanvasElement)) return; const ctx = canvas.getContext('2d'); if (!ctx) return; const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); let strokes = []; let currentStroke = null;
    const resize = () => { const rect = canvas.getBoundingClientRect(); canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio); redraw(); };
    const configure = () => { ctx.setTransform(ratio,0,0,ratio,0,0); ctx.lineWidth=5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#101112'; };
    const redraw = () => { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); configure(); strokes.forEach(stroke => { if (stroke.length < 2) return; ctx.beginPath(); ctx.moveTo(stroke[0].x,stroke[0].y); stroke.slice(1).forEach(p => ctx.lineTo(p.x,p.y)); ctx.stroke(); }); };
    const point = event => { const rect = canvas.getBoundingClientRect(); return { x:event.clientX-rect.left, y:event.clientY-rect.top }; };
    const down = event => { event.preventDefault(); currentStroke=[point(event)]; strokes.push(currentStroke); canvas.setPointerCapture?.(event.pointerId); };
    const move = event => { if (!currentStroke) return; event.preventDefault(); const next=point(event); const last=currentStroke[currentStroke.length-1]; currentStroke.push(next); configure(); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(next.x,next.y); ctx.stroke(); };
    const up = event => { currentStroke=null; try { canvas.releasePointerCapture?.(event.pointerId); } catch {} };
    canvas.addEventListener('pointerdown',down); canvas.addEventListener('pointermove',move); canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up); resize();
    bind('undoCanvas','click',()=>{ strokes.pop(); redraw(); }); bind('clearCanvas','click',()=>{ strokes=[]; redraw(); });
    canvasCleanup=()=>{ canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointermove',move); canvas.removeEventListener('pointerup',up); canvas.removeEventListener('pointercancel',up); };
  }

  function startTimerLoop() { if (timerId || !state.timerRunning || !state.timerDeadline) return; timerId=window.setInterval(()=>{ if(!state.timerRunning||!state.timerDeadline)return stopTimer(false); const remaining=state.timerDeadline-Date.now(); state.remainingMs=Math.max(0,remaining); updateTimerDom(); if(remaining<=0)handleTimeExpired(); },100); }
  function reconcileTimer(){ if(!state.timerRunning||!state.timerDeadline)return; state.remainingMs=Math.max(0,state.timerDeadline-Date.now()); if(state.remainingMs<=0){state.timerRunning=false;state.timerDeadline=null;} }
  function stopTimer(keepRemaining=true){ if(keepRemaining&&state.timerRunning&&state.timerDeadline)state.remainingMs=Math.max(0,state.timerDeadline-Date.now()); if(timerId){clearInterval(timerId);timerId=null;} state.timerRunning=false;state.timerDeadline=null; }
  function updateTimerDom(){ const timer=document.getElementById('timer'); if(!timer)return; timer.textContent=formatSeconds(state.remainingMs); timer.className=state.remainingMs<=3000?'timer timer--critical':state.remainingMs<=10000?'timer timer--urgent':'timer'; }
  function formatSeconds(ms){ return String(Math.max(0,Math.ceil(ms/1000))).padStart(2,'0'); }

  function handleTimeExpired(){
    if(state.view!=='game')return; const card=currentCard(); if(card&&state.selectedRoute){ const now=Date.now(); const meta=routeMeta(state.selectedRoute); addStat({gameId:state.gameId,round:state.roundIndex+1,turnSeconds:state.turnSeconds,team:currentTeam().name,promptId:card.id,prompt:card.prompt,route:state.selectedRoute,methodLabel:meta.label,audioMode:state.audioMode,timerStartMode:state.timerStartMode,pointValue:state.selectedPoints,outcome:'timeout',awarded:0,elapsedMs:Math.max(0,now-(state.promptStartedAt||now)),decisionMs:state.methodLockedAt&&state.promptStartedAt?Math.max(0,state.methodLockedAt-state.promptStartedAt):null}); }
    stopTimer(false); state.remainingMs=0; state.roundTurnCount+=1; state.teamIndex+=1; if(state.teamIndex>=state.teams.length){state.teamIndex=0;state.view='roundend';}else{state.view='handoff';} persist(); render();
  }

  function renderRoundEnd(){ const completedRound=state.roundIndex+1; app.innerHTML=`<main class="screen screen--center"><div class="eyebrow">Round ${completedRound} complete</div><h1 class="brand" style="font-size:clamp(2.7rem,12vw,5rem)"><span class="line">SCORES</span></h1><div class="score-list">${scoreRowsHtml()}</div>${state.roundIndex<ROUND_SECONDS.length-1?`<button id="nextRound" class="btn btn--yellow">Round ${state.roundIndex+2} · ${ROUND_SECONDS[state.roundIndex+1]} sec</button>`:'<button id="finishGame" class="btn btn--purple">Final results</button>'}<div class="note">This vertical slice uses one timed turn per team per round. Final team/player rotation remains a playtest decision.</div></main>`; bind('nextRound','click',()=>{state.roundIndex+=1;state.teamIndex=0;state.roundTurnCount=0;state.view='handoff';persist();render();}); bind('finishGame','click',()=>{state.view='gameover';persist();render();}); }
  function scoreRowsHtml(){ return [...state.teams].sort((a,b)=>b.score-a.score).map((team,index)=>`<div class="score-row"><span class="team-dot team-dot--${Math.min(index+1,4)}">${index+1}</span><strong>${escapeHtml(team.name)}</strong><b>${team.score}</b></div>`).join(''); }

  function renderGameOver(){ stopTimer(false); const sorted=[...state.teams].sort((a,b)=>b.score-a.score); const winners=sorted.filter(team=>team.score===sorted[0].score); const lastScore=sorted[sorted.length-1].score; const last=sorted.filter(team=>team.score===lastScore); const winnerText=winners.length>1?`${winners.length}-way tie`:winners[0].name; app.innerHTML=`<main class="screen screen--center"><div class="eyebrow">Playtest complete</div><div class="winner"><div class="eyebrow">Top score</div><h2>${escapeHtml(winnerText)}</h2><div style="margin-top:10px;font-weight:900">${winners[0].score} points</div></div><div class="score-list">${scoreRowsHtml()}</div><div class="loser-note">${last.length===1?`${escapeHtml(last[0].name)} finished last. Ice cream is an optional joke, not a mandatory penalty.`:'Last place is tied. The ice-cream hook stays optional.'}</div><div class="stack"><button id="again" class="btn btn--teal">Play again</button><button id="viewStats" class="btn btn--dark">View playtest data</button><button id="home" class="btn btn--ghost">Home</button></div></main>`; bind('again','click',()=>{state.view='setup';state.gameId=null;persist();render();}); bind('viewStats','click',showStats); bind('home','click',()=>{state.gameId=null;state.view='home';persist();render();}); }

  function showHowTo(){ const audio=state.audioMode==='sound'?'SOUND':'HUM'; openModal(`<h2>How to play</h2><p><strong>GET THE POINT</strong> is built around choice under time pressure, not three separate mini-games.</p><ol><li>Reveal one prompt and its three route values.</li><li>Choose <strong>${audio}</strong>, <strong>DRAW</strong>, or <strong>MIME</strong>.</li><li>One tap commits the route for that prompt.</li><li>Teammates guess. Correct earns the selected points and reveals another prompt.</li></ol><p><strong>Test baseline:</strong> 60 sec → 30 sec → 15 sec.</p><p><strong>Still being tested:</strong> HUM vs SOUND, pass/skip behavior, timer start timing, Easy/Hard handling, and final team/round structure.</p><div class="install-hint"><strong>Offline:</strong> once loaded, the app shell and starter pack are cached locally. Game state and playtest metrics stay on this device.</div><div class="modal-actions"><button class="btn btn--dark" data-close-modal>Close</button></div>`); }

  function showStats(){ const rows=loadStats(); const labels=['HUM/SOUND','DRAW','MIME']; const routes=['audio','draw','mime']; const byRoute=routes.map((route,index)=>{const attempts=rows.filter(row=>row.route===route||row.method===route);const correct=attempts.filter(row=>row.outcome==='correct');const success=attempts.length?Math.round(correct.length/attempts.length*100):0;const avgSec=correct.length?(correct.reduce((sum,row)=>sum+(row.elapsedMs||0),0)/correct.length/1000).toFixed(1):'—';return{label:labels[index],attempts:attempts.length,success,avgSec};}); openModal(`<h2>Playtest data</h2><p>${rows.length} prompt attempts recorded locally.</p><table class="stats"><thead><tr><th>Route</th><th>Attempts</th><th>Success</th><th>Avg correct</th></tr></thead><tbody>${byRoute.map(row=>`<tr><td>${row.label}</td><td>${row.attempts}</td><td>${row.success}%</td><td>${row.avgSec}${row.avgSec==='—'?'':'s'}</td></tr>`).join('')}</tbody></table><p class="note" style="color:#676a6b">Captured fields include prompt, route/method label, point value, outcome, decision time, guess time, timer condition, round, and team.</p><div class="modal-actions"><button id="exportStats" class="btn btn--dark">Export JSON</button><button id="clearStats" class="btn" style="background:#ece4d7">Clear local data</button><button class="btn btn--dark" data-close-modal>Close</button></div>`); bind('exportStats','click',exportStats); bind('clearStats','click',()=>{if(!confirm('Clear all locally stored playtest metrics?'))return;localStorage.removeItem(STATS_KEY);closeModal();showStats();}); }

  function exportStats(){ const payload={schema:'get-the-point-playtest-v2',exportedAt:new Date().toISOString(),appVersion:APP_VERSION,sessionConfig:{audioMode:state.audioMode,timerStartMode:state.timerStartMode,passMode:state.passMode},attempts:loadStats()}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=`get-the-point-playtest-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }

  function confirmQuit(){ openModal(`<h2>End this playtest?</h2><p>Your completed attempt metrics stay on this device, but the active game will be discarded.</p><div class="modal-actions"><button id="confirmQuit" class="btn btn--dark">End game</button><button class="btn" data-close-modal>Keep playing</button></div>`); bind('confirmQuit','click',()=>{closeModal();state=defaultState();persist();render();}); }
  function openModal(content){ closeModal(); const backdrop=document.createElement('div'); backdrop.id='modalBackdrop'; backdrop.className='modal-backdrop'; backdrop.innerHTML=`<section class="modal" role="dialog" aria-modal="true">${content}</section>`; document.body.appendChild(backdrop); backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal();}); backdrop.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',closeModal)); const first=backdrop.querySelector('button'); if(first instanceof HTMLElement)first.focus(); }
  function closeModal(){ const existing=document.getElementById('modalBackdrop'); if(existing)existing.remove(); }
  function bind(id,event,handler){ const element=document.getElementById(id); if(element)element.addEventListener(event,handler); }

  function installApp(){ if(deferredInstallPrompt){deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null;updateInstallButton();});return;} const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent); openModal(`<h2>Install app</h2>${isiOS?'<p>On iPhone/iPad Safari: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>':'<p>Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>'}<p>The installed version launches full-screen and keeps the starter playtest available offline after the first successful load.</p><div class="modal-actions"><button class="btn btn--dark" data-close-modal>Got it</button></div>`); }
  function updateInstallButton(){ const button=document.getElementById('install'); if(!button)return; const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; if(!standalone)button.hidden=false; }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;updateInstallButton();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.timerRunning&&state.timerDeadline){const remaining=state.timerDeadline-Date.now();if(remaining<=0)handleTimeExpired();else{state.remainingMs=remaining;persist();updateTimerDom();startTimerLoop();}}});
  window.addEventListener('pagehide',persist);
  if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('Service worker registration failed:',error));});}
  if(state.timerRunning&&state.timerDeadline){if(state.timerDeadline<=Date.now()){state.remainingMs=0;if(state.view==='game')setTimeout(handleTimeExpired,0);}else{state.remainingMs=state.timerDeadline-Date.now();}}
  render();
})();
