(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const files = $('files');
  const drop = $('dropZone');
  const results = $('results');
  let normalized = [];
  let sourceNames = [];

  const num = (...values) => {
    for (const value of values) {
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

  function sourceRows(payload) {
    if (Array.isArray(payload)) return payload;
    for (const key of ['stats','records','events','telemetry','data','attempts']) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    if (payload && typeof payload === 'object') {
      const arrays = Object.values(payload).filter(Array.isArray);
      if (arrays.length === 1) return arrays[0];
    }
    return [];
  }

  function canonicalOutcome(row) {
    const raw = String(row.outcome ?? row.result ?? row.event ?? row.type ?? '').toLowerCase();
    if (row.success === true || /correct|success|guessed/.test(raw)) return 'correct';
    if (/pass|skip/.test(raw)) return 'pass';
    if (/timeout|expired|time-expired|time_expired/.test(raw)) return 'timeout';
    if (row.success === false || /fail|incorrect|miss/.test(raw)) return 'failed';
    return raw || 'unknown';
  }

  function canonicalRoute(row) {
    let route = String(row.route ?? row.selectedRoute ?? row.method ?? row.mode ?? '').toLowerCase();
    const audioMode = String(row.audioMode ?? row.audio_mode ?? '').toLowerCase();
    if (route === 'audio' || route === 'hum' || route === 'sound') {
      if (route === 'sound' || audioMode === 'sound') return 'SOUND';
      return 'HUM';
    }
    if (route.includes('draw')) return 'DRAW';
    if (route.includes('mime') || route.includes('act')) return 'MIME';
    return route ? route.toUpperCase() : 'UNCOMMITTED';
  }

  function normalize(row, fileName, index) {
    const prompt = String(row.prompt ?? row.promptText ?? row.card ?? row.word ?? row.target ?? '').trim().toUpperCase();
    const outcome = canonicalOutcome(row);
    const route = canonicalRoute(row);
    const choiceMs = num(row.choiceMs, row.choiceTimeMs, row.methodChoiceMs, row.choice_time_ms) ?? msBetween(row.promptStartedAt ?? row.revealedAt, row.methodLockedAt ?? row.committedAt);
    const guessMs = num(row.guessMs, row.guessTimeMs, row.guess_time_ms) ?? msBetween(row.methodLockedAt ?? row.committedAt, row.correctAt ?? row.completedAt ?? row.endedAt);
    const points = num(row.points, row.selectedPoints, row.displayedPoints, row.scoreValue);
    return {
      sourceFile:fileName,
      sourceIndex:index,
      gameId:String(row.gameId ?? row.game_id ?? ''),
      recordedAt:row.recordedAt ?? row.timestamp ?? row.at ?? '',
      prompt,
      promptId:String(row.promptId ?? row.prompt_id ?? ''),
      route,
      points,
      outcome,
      correct:outcome === 'correct',
      pass:outcome === 'pass',
      timeout:outcome === 'timeout',
      choiceMs,
      guessMs,
      round:num(row.round, row.roundIndex != null ? Number(row.roundIndex)+1 : null),
      timerSeconds:num(row.turnSeconds, row.timerSeconds, row.timer_seconds),
      timerStart:String(row.timerStartMode ?? row.timer_start ?? ''),
      audioMode:String(row.audioMode ?? row.audio_mode ?? '').toUpperCase(),
      passMode:String(row.passMode ?? row.pass_mode ?? ''),
      appVersion:String(row.appVersion ?? row.version ?? '')
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
        const found = sourceRows(payload);
        if (!found.length) throw new Error('No telemetry array found');
        found.forEach((row, i) => rows.push(normalize(row, file.name, i)));
        names.push(file.name);
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }
    normalized = rows;
    sourceNames = names;
    $('fileStatus').textContent = `${names.length} file${names.length===1?'':'s'} · ${rows.length} normalized record${rows.length===1?'':'s'}`;
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
    const v = values.filter(Number.isFinite).sort((a,b)=>a-b);
    if (!v.length) return null;
    const m = Math.floor(v.length/2);
    return v.length%2 ? v[m] : (v[m-1]+v[m])/2;
  }
  const pct = (a,b) => b ? `${Math.round(a/b*100)}%` : '—';
  const time = ms => Number.isFinite(ms) ? `${(ms/1000).toFixed(ms<10000?1:0)}s` : '—';
  const committed = r => !['UNCOMMITTED',''].includes(r.route) && !r.pass;
  const meaningful = r => r.prompt || r.route !== 'UNCOMMITTED' || r.outcome !== 'unknown';

  function groupBy(rows, keyFn) {
    const map = new Map();
    rows.forEach(row => { const key=keyFn(row); if(!map.has(key)) map.set(key,[]); map.get(key).push(row); });
    return map;
  }

  function kpi(label, value, note) {
    return `<article class="kpi"><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`;
  }

  function routeLabel(row) {
    if (row.route === 'HUM' || row.route === 'SOUND') return row.route;
    return row.route;
  }

  function routeGroups(rows) {
    const map = groupBy(rows.filter(committed), r => routeLabel(r));
    return [...map.entries()].filter(([k])=>k && k!=='UNCOMMITTED').sort((a,b)=>b[1].length-a[1].length);
  }

  function metricRows(groups, mode) {
    const total = groups.reduce((sum,[,rows])=>sum+rows.length,0);
    if (!groups.length) return '<div class="empty-state">No committed route records detected.</div>';
    return `<div class="metric-list">${groups.map(([route,rows])=>{
      const correct=rows.filter(r=>r.correct).length;
      const value=mode==='mix'?rows.length:correct;
      const denominator=mode==='mix'?total:rows.length;
      const width=denominator?Math.max(2,value/denominator*100):0;
      const label=mode==='mix'?`${rows.length} · ${pct(rows.length,total)}`:`${correct}/${rows.length} · ${pct(correct,rows.length)}`;
      return `<div class="metric-row" data-route="${route}"><b>${route}</b><div class="bar"><i style="width:${width}%"></i></div><strong>${label}</strong></div>`;
    }).join('')}</div>`;
  }

  function promptTable(rows) {
    const prompts = [...groupBy(rows.filter(r=>r.prompt), r=>r.prompt).entries()].map(([prompt,items])=>{
      const attempts=items.filter(r=>r.correct || r.timeout || r.outcome==='failed' || committed(r)).length || items.length;
      const correct=items.filter(r=>r.correct).length;
      const bad=items.filter(r=>r.pass||r.timeout).length;
      const routes=groupBy(items.filter(committed),r=>r.route);
      const ordered=[...routes.entries()].sort((a,b)=>b[1].length-a[1].length);
      const top=ordered[0] ? `${ordered[0][0]} ${pct(ordered[0][1].length,items.filter(committed).length)}` : '—';
      const success=attempts?correct/attempts:null;
      const badRate=items.length?bad/items.length:0;
      const topShare=ordered[0]&&items.filter(committed).length?ordered[0][1].length/items.filter(committed).length:0;
      let flag='OK', cls='ok', severity=0;
      if (items.length>=3 && ((success!=null&&success<.35)||badRate>=.5)){flag='DEAD-CARD REVIEW';cls='cut';severity=2;}
      else if (items.length>=4 && topShare>=.75){flag='ROUTE DOMINANCE';cls='review';severity=1;}
      else if (items.length<3){flag='MORE DATA';cls='review';severity=1;}
      return {prompt,items,attempts,correct,bad,success,top,flag,cls,severity};
    }).sort((a,b)=>b.severity-a.severity || (a.success??1)-(b.success??1) || b.items.length-a.items.length);

    return prompts.slice(0,100).map(p=>`<tr><td><strong>${p.prompt}</strong></td><td>${p.attempts}</td><td>${p.correct}</td><td>${p.success==null?'—':Math.round(p.success*100)+'%'}</td><td>${p.bad}</td><td>${p.top}</td><td><span class="flag flag--${p.cls}">${p.flag}</span></td></tr>`).join('') || '<tr><td colspan="7">No prompt-level records detected.</td></tr>';
  }

  function conditions(rows) {
    const defs=[['Audio mode',r=>r.audioMode],['Timer start',r=>r.timerStart],['Pass mode',r=>r.passMode],['Timer seconds',r=>r.timerSeconds],['App version',r=>r.appVersion]];
    const html=defs.map(([label,get])=>{
      const values=groupBy(rows.filter(r=>get(r)!==''&&get(r)!=null),get);
      if(!values.size)return '';
      const parts=[...values.entries()].map(([value,items])=>`${value}: ${items.length}`).join(' · ');
      return `<div class="condition-row"><strong>${label}</strong><span>${parts}</span></div>`;
    }).filter(Boolean).join('');
    return html ? `<div class="condition-list">${html}</div>` : '<div class="empty-state">No experimental-condition fields detected.</div>';
  }

  function qualityWarnings(rows) {
    const warnings=[];
    const modes=new Set(rows.map(r=>r.audioMode).filter(Boolean));
    const timerStarts=new Set(rows.map(r=>r.timerStart).filter(Boolean));
    const passModes=new Set(rows.map(r=>r.passMode).filter(Boolean));
    const versions=new Set(rows.map(r=>r.appVersion).filter(Boolean));
    if(modes.size>1)warnings.push(['Mixed HUM/SOUND cohorts','Do not blend audio-route success rates until separated by audio condition.']);
    if(timerStarts.size>1)warnings.push(['Mixed timer-start cohorts','Choice-time and success comparisons may be confounded by reveal-vs-commit timing.']);
    if(passModes.size>1)warnings.push(['Mixed pass conditions','Prompt failure/pass rates should be segmented by skip availability.']);
    if(versions.size>1)warnings.push(['Multiple app versions','Check whether behavior changed before combining records.']);
    const unknown=rows.filter(r=>r.outcome==='unknown').length;
    if(unknown)warnings.push(['Unknown outcomes detected',`${unknown} record${unknown===1?'':'s'} could not be classified automatically.`]);
    if(!rows.some(r=>Number.isFinite(r.choiceMs)))warnings.push(['No choice-time data','The core differentiator is choice under time pressure; instrument or preserve choice time before balance conclusions.']);
    if(!rows.some(r=>Number.isFinite(r.guessMs)))warnings.push(['No guess-time data','Route difficulty calibration will be weaker without guess-time evidence.']);
    if(!warnings.length)return '<div class="empty-state">No obvious dataset-mixing warning detected.</div>';
    return `<div class="warning-list">${warnings.map(([h,p])=>`<div class="warning"><strong>${h}</strong><p>${p}</p></div>`).join('')}</div>`;
  }

  function recommendationsFor(rows) {
    const rec=[];
    const committedRows=rows.filter(committed);
    const groups=routeGroups(rows);
    if(groups.length>=2&&committedRows.length>=12){
      const top=groups[0], share=top[1].length/committedRows.length;
      if(share>=.6)rec.push(['Investigate route dominance',`${top[0]} represents ${Math.round(share*100)}% of committed choices. Check whether points are influencing behavior or players are defaulting to one route.`]);
    }
    const prompts=[...groupBy(rows.filter(r=>r.prompt),r=>r.prompt).entries()];
    const dead=prompts.filter(([,x])=>x.length>=3&&(x.filter(r=>r.correct).length/x.length<.35 || x.filter(r=>r.pass||r.timeout).length/x.length>=.5));
    if(dead.length)rec.push(['Review weak prompts first',`${dead.length} prompt${dead.length===1?'':'s'} hit the automatic dead-card review threshold. Cut or redesign before adding more deck volume.`]);
    const choice=median(rows.map(r=>r.choiceMs));
    if(Number.isFinite(choice)&&choice>5000)rec.push(['Choice may be too slow',`Median observed choice time is ${time(choice)}. Inspect whether route controls, point comprehension, or prompt ambiguity are slowing commitment.`]);
    const successes=committedRows.filter(r=>r.correct).length;
    if(committedRows.length>=10&&successes/committedRows.length<.45)rec.push(['Overall difficulty looks high',`Observed committed success is ${pct(successes,committedRows.length)}. Do not simply inflate points; find whether failures cluster by route or prompt.`]);
    if(committedRows.length>=10&&successes/committedRows.length>.88)rec.push(['Overall difficulty may be too low',`Observed committed success is ${pct(successes,committedRows.length)}. Check whether route point spreads still create meaningful risk/reward.`]);
    if(!rec.length)rec.push(['Collect more comparable sessions','No strong heuristic intervention is justified yet. Keep conditions stable, add blind sessions, and wait for repeated patterns before locking rules or scores.']);
    return rec.map(([h,p])=>`<div class="recommendation"><strong>${h}</strong><p>${p}</p></div>`).join('');
  }

  function summaryText(rows) {
    const committedRows=rows.filter(committed), correct=committedRows.filter(r=>r.correct).length;
    const groups=routeGroups(rows);
    return [
      'GET THE POINT — Playtest Evidence Summary',
      `Sources: ${sourceNames.join(', ')}`,
      `Normalized records: ${rows.length}`,
      `Committed attempts: ${committedRows.length}`,
      `Success: ${pct(correct,committedRows.length)}`,
      `Passes/skips: ${rows.filter(r=>r.pass).length}`,
      `Timeouts: ${rows.filter(r=>r.timeout).length}`,
      `Median choice time: ${time(median(rows.map(r=>r.choiceMs)))}`,
      `Median guess time: ${time(median(rows.map(r=>r.guessMs)))}`,
      `Route mix: ${groups.map(([route,x])=>`${route} ${pct(x.length,committedRows.length)}`).join(' · ') || 'n/a'}`,
      '',
      'Automatic flags are triage cues only. Unresolved game rules remain NEEDS PLAYTESTING.'
    ].join('\n');
  }

  function render() {
    const rows=normalized.filter(meaningful);
    const committedRows=rows.filter(committed), correct=committedRows.filter(r=>r.correct).length;
    results.hidden=false;
    $('datasetTitle').textContent=`${sourceNames.length} export${sourceNames.length===1?'':'s'} · ${rows.length} records`;
    $('kpis').innerHTML=[
      kpi('Records',rows.length,'normalized rows'),
      kpi('Committed',committedRows.length,'route attempts'),
      kpi('Success',pct(correct,committedRows.length),`${correct} correct`),
      kpi('Pass / skip',rows.filter(r=>r.pass).length,'uncommitted where identifiable'),
      kpi('Choice median',time(median(rows.map(r=>r.choiceMs))),'reveal → commit'),
      kpi('Guess median',time(median(rows.map(r=>r.guessMs))),'commit → correct')
    ].join('');
    const groups=routeGroups(rows);
    $('routeMix').innerHTML=metricRows(groups,'mix');
    $('routeOutcomes').innerHTML=metricRows(groups,'outcome');
    $('promptRows').innerHTML=promptTable(rows);
    $('conditions').innerHTML=conditions(rows);
    $('warnings').innerHTML=qualityWarnings(rows);
    $('recommendations').innerHTML=recommendationsFor(rows);
    results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  function csvEscape(value) {
    const s=value==null?'':String(value);
    return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
  }

  function downloadNormalizedCsv() {
    if(!normalized.length)return;
    const keys=['sourceFile','gameId','recordedAt','prompt','promptId','route','points','outcome','correct','pass','timeout','choiceMs','guessMs','round','timerSeconds','timerStart','audioMode','passMode','appVersion'];
    const text=[keys.join(','),...normalized.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));
    a.download=`get-the-point-normalized-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  files.addEventListener('change',()=>loadFiles(files.files));
  ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('is-over')}));
  ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('is-over')}));
  drop.addEventListener('drop',e=>loadFiles(e.dataTransfer.files));
  $('downloadCsv').addEventListener('click',downloadNormalizedCsv);
  $('copySummary').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(summaryText(normalized));$('copySummary').textContent='Copied';setTimeout(()=>$('copySummary').textContent='Copy summary',1200)}catch{alert(summaryText(normalized));}
  });
})();
