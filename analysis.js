(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const files = $('files');
  const drop = $('dropZone');
  const results = $('results');
  let normalized = [];
  let sourceNames = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  const num = (...values) => {
    for (const value of values) {
      if (value === '' || value == null) continue;
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  function msBetween(a, b) {
    if (!a || !b) return null;
    const x = Date.parse(a), y = Date.parse(b);
    return Number.isFinite(x) && Number.isFinite(y) && y >= x ? y - x : null;
  }

  function extractPayload(payload) {
    if (Array.isArray(payload)) return { rows: payload, context: {} };
    if (!payload || typeof payload !== 'object') return { rows: [], context: {} };

    let rows = [];
    for (const key of ['attempts','stats','records','events','telemetry','data']) {
      if (Array.isArray(payload[key])) {
        rows = payload[key];
        break;
      }
    }
    if (!rows.length) {
      const arrays = Object.entries(payload).filter(([, value]) => Array.isArray(value));
      if (arrays.length === 1) rows = arrays[0][1];
    }

    const sessionConfig = payload.sessionConfig && typeof payload.sessionConfig === 'object' ? payload.sessionConfig : {};
    return {
      rows,
      context: {
        schema: String(payload.schema ?? ''),
        exportedAt: payload.exportedAt ?? '',
        appVersion: String(payload.appVersion ?? payload.version ?? ''),
        audioMode: String(sessionConfig.audioMode ?? payload.audioMode ?? ''),
        timerStartMode: String(sessionConfig.timerStartMode ?? payload.timerStartMode ?? ''),
        passMode: String(sessionConfig.passMode ?? payload.passMode ?? ''),
        postCommitPass: sessionConfig.postCommitPass ?? payload.postCommitPass ?? null
      }
    };
  }

  function canonicalOutcome(row) {
    const raw = String(row.outcome ?? row.result ?? row.event ?? row.type ?? '').toLowerCase();
    if (row.success === true || /correct|success|guessed/.test(raw)) return 'correct';
    if (/pass|skip/.test(raw)) return 'pass';
    if (/timeout|expired|time-expired|time_expired/.test(raw)) return 'timeout';
    if (row.success === false || /fail|incorrect|miss/.test(raw)) return 'failed';
    return raw || 'unknown';
  }

  function canonicalRoute(row, context) {
    let route = String(row.route ?? row.selectedRoute ?? row.method ?? row.mode ?? '').toLowerCase();
    const audioMode = String(row.audioMode ?? row.audio_mode ?? context.audioMode ?? '').toLowerCase();
    if (route === 'audio' || route === 'hum' || route === 'sound') {
      if (route === 'sound' || audioMode === 'sound') return 'SOUND';
      return 'HUM';
    }
    if (route.includes('draw')) return 'DRAW';
    if (route.includes('mime') || route.includes('act')) return 'MIME';
    return route ? route.toUpperCase() : 'UNCOMMITTED';
  }

  function normalize(row, context, fileName, index) {
    const prompt = String(row.prompt ?? row.promptText ?? row.card ?? row.word ?? row.target ?? '').trim().toUpperCase();
    const outcome = canonicalOutcome(row);
    const route = canonicalRoute(row, context);

    const choiceMs = num(
      row.decisionMs,
      row.choiceMs,
      row.choiceTimeMs,
      row.methodChoiceMs,
      row.choice_time_ms
    ) ?? msBetween(row.promptStartedAt ?? row.revealedAt, row.methodLockedAt ?? row.committedAt);

    const elapsedMs = num(row.elapsedMs, row.totalMs, row.elapsed_time_ms);
    let guessMs = num(row.guessMs, row.guessTimeMs, row.guess_time_ms)
      ?? msBetween(row.methodLockedAt ?? row.committedAt, row.correctAt ?? row.completedAt ?? row.endedAt);
    if (!Number.isFinite(guessMs) && Number.isFinite(elapsedMs) && Number.isFinite(choiceMs) && route !== 'UNCOMMITTED' && outcome !== 'pass') {
      guessMs = Math.max(0, elapsedMs - choiceMs);
    }

    return {
      sourceFile: fileName,
      sourceIndex: index,
      schema: context.schema,
      gameId: String(row.gameId ?? row.game_id ?? ''),
      recordedAt: row.recordedAt ?? row.timestamp ?? row.at ?? '',
      prompt,
      promptId: String(row.promptId ?? row.prompt_id ?? ''),
      route,
      methodLabel: String(row.methodLabel ?? row.method_label ?? ''),
      points: num(row.pointValue, row.points, row.selectedPoints, row.displayedPoints, row.scoreValue),
      outcome,
      correct: outcome === 'correct',
      pass: outcome === 'pass',
      timeout: outcome === 'timeout',
      elapsedMs,
      choiceMs,
      guessMs,
      awarded: num(row.awarded, row.pointsAwarded, row.scoreAwarded),
      round: num(row.round, row.roundIndex != null ? Number(row.roundIndex) + 1 : null),
      timerSeconds: num(row.turnSeconds, row.timerSeconds, row.timer_seconds),
      timerStart: String(row.timerStartMode ?? row.timer_start ?? context.timerStartMode ?? '').toLowerCase(),
      audioMode: String(row.audioMode ?? row.audio_mode ?? context.audioMode ?? '').toUpperCase(),
      passMode: String(row.passMode ?? row.pass_mode ?? context.passMode ?? '').toLowerCase(),
      postCommitPass: row.postCommitPass ?? context.postCommitPass,
      appVersion: String(row.appVersion ?? row.version ?? context.appVersion ?? '')
    };
  }

  async function loadFiles(list) {
    const incoming = [...list];
    if (!incoming.length) return;
    const rows = [];
    const names = [];
    const errors = [];

    for (const file of incoming) {
      try {
        const payload = JSON.parse(await file.text());
        const { rows: found, context } = extractPayload(payload);
        if (!found.length) throw new Error('No telemetry array found');
        found.forEach((row, i) => rows.push(normalize(row, context, file.name, i)));
        names.push(file.name);
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    normalized = rows;
    sourceNames = names;
    $('fileStatus').textContent = `${names.length} file${names.length === 1 ? '' : 's'} · ${rows.length} normalized record${rows.length === 1 ? '' : 's'}`;
    document.querySelector('.analysis-error')?.remove();
    if (errors.length) {
      const box = document.createElement('div');
      box.className = 'analysis-error';
      box.textContent = errors.join(' · ');
      drop.appendChild(box);
    }
    if (rows.length) render();
  }

  function median(values) {
    const v = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  const pct = (a, b) => b ? `${Math.round(a / b * 100)}%` : '—';
  const time = ms => Number.isFinite(ms) ? `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s` : '—';
  const committed = row => !['UNCOMMITTED', ''].includes(row.route) && !row.pass;
  const meaningful = row => row.prompt || row.route !== 'UNCOMMITTED' || row.outcome !== 'unknown';

  function groupBy(rows, keyFn) {
    const map = new Map();
    rows.forEach(row => {
      const key = keyFn(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return map;
  }

  function kpi(label, value, note) {
    return `<article class="kpi"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></article>`;
  }

  function routeGroups(rows) {
    const map = groupBy(rows.filter(committed), row => row.route);
    return [...map.entries()].filter(([key]) => key && key !== 'UNCOMMITTED').sort((a, b) => b[1].length - a[1].length);
  }

  function metricRows(groups, mode) {
    const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);
    if (!groups.length) return '<div class="empty-state">No committed route records detected.</div>';
    return `<div class="metric-list">${groups.map(([route, rows]) => {
      const correct = rows.filter(row => row.correct).length;
      const value = mode === 'mix' ? rows.length : correct;
      const denominator = mode === 'mix' ? total : rows.length;
      const width = denominator ? Math.max(2, value / denominator * 100) : 0;
      const label = mode === 'mix' ? `${rows.length} · ${pct(rows.length, total)}` : `${correct}/${rows.length} · ${pct(correct, rows.length)}`;
      return `<div class="metric-row" data-route="${esc(route)}"><b>${esc(route)}</b><div class="bar"><i style="width:${width}%"></i></div><strong>${esc(label)}</strong></div>`;
    }).join('')}</div>`;
  }

  function promptTable(rows) {
    const prompts = [...groupBy(rows.filter(row => row.prompt), row => row.prompt).entries()].map(([prompt, items]) => {
      const committedItems = items.filter(committed);
      const attempts = items.filter(row => row.correct || row.timeout || row.outcome === 'failed' || committed(row)).length || items.length;
      const correct = items.filter(row => row.correct).length;
      const bad = items.filter(row => row.pass || row.timeout).length;
      const routes = groupBy(committedItems, row => row.route);
      const ordered = [...routes.entries()].sort((a, b) => b[1].length - a[1].length);
      const top = ordered[0] ? `${ordered[0][0]} ${pct(ordered[0][1].length, committedItems.length)}` : '—';
      const success = attempts ? correct / attempts : null;
      const badRate = items.length ? bad / items.length : 0;
      const topShare = ordered[0] && committedItems.length ? ordered[0][1].length / committedItems.length : 0;
      let flag = 'OK', cls = 'ok', severity = 0;
      if (items.length >= 3 && ((success != null && success < .35) || badRate >= .5)) {
        flag = 'DEAD-CARD REVIEW'; cls = 'cut'; severity = 2;
      } else if (items.length >= 4 && topShare >= .75) {
        flag = 'ROUTE DOMINANCE'; cls = 'review'; severity = 1;
      } else if (items.length < 3) {
        flag = 'MORE DATA'; cls = 'review'; severity = 1;
      }
      return { prompt, items, attempts, correct, bad, success, top, flag, cls, severity };
    }).sort((a, b) => b.severity - a.severity || (a.success ?? 1) - (b.success ?? 1) || b.items.length - a.items.length);

    return prompts.slice(0, 100).map(item => `<tr><td><strong>${esc(item.prompt)}</strong></td><td>${item.attempts}</td><td>${item.correct}</td><td>${item.success == null ? '—' : Math.round(item.success * 100) + '%'}</td><td>${item.bad}</td><td>${esc(item.top)}</td><td><span class="flag flag--${item.cls}">${esc(item.flag)}</span></td></tr>`).join('') || '<tr><td colspan="7">No prompt-level records detected.</td></tr>';
  }

  function conditionBlock(rows) {
    const defs = [
      ['Audio mode', row => row.audioMode],
      ['Timer start', row => row.timerStart],
      ['Pass mode', row => row.passMode],
      ['Timer seconds', row => row.timerSeconds],
      ['App version', row => row.appVersion],
      ['Export schema', row => row.schema]
    ];
    const html = defs.map(([label, get]) => {
      const values = groupBy(rows.filter(row => get(row) !== '' && get(row) != null), get);
      if (!values.size) return '';
      const parts = [...values.entries()].map(([value, items]) => `${value}: ${items.length}`).join(' · ');
      return `<div class="condition-row"><strong>${esc(label)}</strong><span>${esc(parts)}</span></div>`;
    }).filter(Boolean).join('');
    return html ? `<div class="condition-list">${html}</div>` : '<div class="empty-state">No experimental-condition fields detected.</div>';
  }

  function qualityWarnings(rows) {
    const warnings = [];
    const modes = new Set(rows.map(row => row.audioMode).filter(Boolean));
    const timerStarts = new Set(rows.map(row => row.timerStart).filter(Boolean));
    const passModes = new Set(rows.map(row => row.passMode).filter(Boolean));
    const versions = new Set(rows.map(row => row.appVersion).filter(Boolean));
    const schemas = new Set(rows.map(row => row.schema).filter(Boolean));

    if (modes.size > 1) warnings.push(['Mixed HUM/SOUND cohorts', 'Do not blend audio-route success rates until separated by audio condition.']);
    if (timerStarts.size > 1) warnings.push(['Mixed timer-start cohorts', 'Choice-time and success comparisons may be confounded by reveal-vs-commit timing.']);
    if (passModes.size > 1) warnings.push(['Mixed pass conditions', 'Prompt failure/pass rates should be segmented by skip availability.']);
    if (versions.size > 1) warnings.push(['Multiple app versions', 'Check whether behavior changed before combining records.']);
    if (schemas.size > 1) warnings.push(['Multiple export schemas', 'Normalize cautiously before combining evidence from different telemetry contracts.']);

    const unknown = rows.filter(row => row.outcome === 'unknown').length;
    if (unknown) warnings.push(['Unknown outcomes detected', `${unknown} record${unknown === 1 ? '' : 's'} could not be classified automatically.`]);
    if (!rows.some(row => Number.isFinite(row.choiceMs))) warnings.push(['No choice-time data', 'The core differentiator is choice under time pressure; preserve decisionMs/choice timing before balance conclusions.']);
    if (!rows.some(row => Number.isFinite(row.guessMs))) warnings.push(['No guess-time data', 'Route difficulty calibration will be weaker without guess-time evidence.']);
    if (!rows.some(row => Number.isFinite(row.points))) warnings.push(['No point-value data', 'Risk/reward analysis requires the displayed point value for each committed route.']);
    if (!rows.some(row => row.passMode)) warnings.push(['No pass-mode context', 'Skip-condition comparisons require the export sessionConfig.passMode field.']);

    if (!warnings.length) return '<div class="empty-state">No obvious dataset-mixing warning detected.</div>';
    return `<div class="warning-list">${warnings.map(([heading, body]) => `<div class="warning"><strong>${esc(heading)}</strong><p>${esc(body)}</p></div>`).join('')}</div>`;
  }

  function recommendationsFor(rows) {
    const rec = [];
    const committedRows = rows.filter(committed);
    const groups = routeGroups(rows);

    if (groups.length >= 2 && committedRows.length >= 12) {
      const top = groups[0];
      const share = top[1].length / committedRows.length;
      if (share >= .6) rec.push(['Investigate route dominance', `${top[0]} represents ${Math.round(share * 100)}% of committed choices. Check whether points are influencing behavior or players are defaulting to one route.`]);
    }

    const prompts = [...groupBy(rows.filter(row => row.prompt), row => row.prompt).entries()];
    const dead = prompts.filter(([, items]) => items.length >= 3 && (items.filter(row => row.correct).length / items.length < .35 || items.filter(row => row.pass || row.timeout).length / items.length >= .5));
    if (dead.length) rec.push(['Review weak prompts first', `${dead.length} prompt${dead.length === 1 ? '' : 's'} hit the automatic dead-card review threshold. Cut or redesign before adding more deck volume.`]);

    const choice = median(rows.map(row => row.choiceMs));
    if (Number.isFinite(choice) && choice > 5000) rec.push(['Choice may be too slow', `Median observed choice time is ${time(choice)}. Inspect route controls, point comprehension, and prompt ambiguity before changing the timer.`]);

    const successes = committedRows.filter(row => row.correct).length;
    if (committedRows.length >= 10 && successes / committedRows.length < .45) rec.push(['Overall difficulty looks high', `Observed committed success is ${pct(successes, committedRows.length)}. Find whether failures cluster by prompt or route before changing points.`]);
    if (committedRows.length >= 10 && successes / committedRows.length > .88) rec.push(['Overall difficulty may be too low', `Observed committed success is ${pct(successes, committedRows.length)}. Check whether route point spreads still create meaningful risk/reward.`]);

    const audioModes = new Set(rows.map(row => row.audioMode).filter(Boolean));
    if (audioModes.size > 1) rec.push(['Separate HUM and SOUND first', 'The current experiment should compare audio conditions as separate cohorts before any global audio-route conclusion.']);

    if (!rec.length) rec.push(['Collect more comparable sessions', 'No strong heuristic intervention is justified yet. Keep conditions stable and wait for repeated patterns before locking rules or scores.']);
    return rec.map(([heading, body]) => `<div class="recommendation"><strong>${esc(heading)}</strong><p>${esc(body)}</p></div>`).join('');
  }

  function summaryText(rows) {
    const committedRows = rows.filter(committed);
    const correct = committedRows.filter(row => row.correct).length;
    const groups = routeGroups(rows);
    return [
      'GET THE POINT — Playtest Evidence Summary',
      `Sources: ${sourceNames.join(', ')}`,
      `Normalized records: ${rows.length}`,
      `Committed attempts: ${committedRows.length}`,
      `Success: ${pct(correct, committedRows.length)}`,
      `Passes/skips: ${rows.filter(row => row.pass).length}`,
      `Timeouts: ${rows.filter(row => row.timeout).length}`,
      `Median choice time: ${time(median(rows.map(row => row.choiceMs)))}`,
      `Median guess time: ${time(median(rows.map(row => row.guessMs)))}`,
      `Route mix: ${groups.map(([route, items]) => `${route} ${pct(items.length, committedRows.length)}`).join(' · ') || 'n/a'}`,
      '',
      'Automatic flags are triage cues only. Unresolved game rules remain NEEDS PLAYTESTING.'
    ].join('\n');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadCsv(rows) {
    const fields = ['sourceFile','sourceIndex','schema','gameId','recordedAt','promptId','prompt','route','methodLabel','points','outcome','awarded','choiceMs','guessMs','elapsedMs','round','timerSeconds','timerStart','audioMode','passMode','postCommitPass','appVersion'];
    const csv = [fields.join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `get-the-point-normalized-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function render() {
    const rows = normalized.filter(meaningful);
    const committedRows = rows.filter(committed);
    const correct = committedRows.filter(row => row.correct).length;
    const pointValues = committedRows.map(row => row.points).filter(Number.isFinite);
    results.hidden = false;

    $('datasetTitle').textContent = `${sourceNames.length} export${sourceNames.length === 1 ? '' : 's'} · ${rows.length} records`;
    $('kpis').innerHTML = [
      kpi('Committed attempts', committedRows.length, 'route chosen'),
      kpi('Observed success', pct(correct, committedRows.length), `${correct} correct`),
      kpi('Median choice', time(median(rows.map(row => row.choiceMs))), 'reveal → commit'),
      kpi('Median guess', time(median(rows.map(row => row.guessMs))), 'commit → correct/observed completion'),
      kpi('Pass / skip', rows.filter(row => row.pass).length, 'uncommitted events'),
      kpi('Avg displayed points', pointValues.length ? (pointValues.reduce((sum, n) => sum + n, 0) / pointValues.length).toFixed(2) : '—', 'committed attempts')
    ].join('');

    const groups = routeGroups(rows);
    $('routeMix').innerHTML = metricRows(groups, 'mix');
    $('routeOutcomes').innerHTML = metricRows(groups, 'outcome');
    $('promptRows').innerHTML = promptTable(rows);
    $('conditions').innerHTML = conditionBlock(rows);
    $('warnings').innerHTML = qualityWarnings(rows);
    $('recommendations').innerHTML = recommendationsFor(rows);
  }

  async function copySummary() {
    const text = summaryText(normalized.filter(meaningful));
    try {
      await navigator.clipboard.writeText(text);
      $('copySummary').textContent = 'Copied';
      setTimeout(() => { $('copySummary').textContent = 'Copy summary'; }, 1200);
    } catch {
      window.prompt('Copy summary:', text);
    }
  }

  files?.addEventListener('change', event => loadFiles(event.target.files));
  drop?.addEventListener('dragover', event => {
    event.preventDefault();
    drop.classList.add('is-dragging');
  });
  drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
  drop?.addEventListener('drop', event => {
    event.preventDefault();
    drop.classList.remove('is-dragging');
    loadFiles(event.dataTransfer.files);
  });
  $('copySummary')?.addEventListener('click', copySummary);
  $('downloadCsv')?.addEventListener('click', () => downloadCsv(normalized.filter(meaningful)));
})();
