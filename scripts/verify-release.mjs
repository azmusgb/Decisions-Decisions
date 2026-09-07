import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let failures = 0;
let warnings = 0;

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function exists(file) {
  return fs.existsSync(path.join(root, file));
}
function ok(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else { console.error(`FAIL  ${message}`); failures += 1; }
}
function warn(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else { console.warn(`WARN  ${message}`); warnings += 1; }
}
function parseCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      out.push(value);
      value = '';
    } else {
      value += ch;
    }
  }
  out.push(value);
  return out;
}

console.log('GET THE POINT — release verification\n');

const requiredFiles = [
  'play.html','play.js','play-runtime.js','playtest-enhancements.js','sw.js','manifest.webmanifest',
  'demo-access.html','diagnostics.html','diagnostics.js','analysis.html','analysis.js','feedback.html',
  'site-nav.js','netlify.toml','netlify/edge-functions/demo-access.ts','netlify/edge-functions/site-shell.ts',
  'PLAYTEST_ACCEPTANCE_v0.6.md','BLIND_TEST_PROTOCOL_v0.6.md','PLAYTEST_EVIDENCE_SCHEMA_v0.6.md',
  'content/prompt-candidates-v0.6.csv','content/README.md'
];
requiredFiles.forEach(file => ok(exists(file), `required file exists: ${file}`));

const play = read('play.html');
const game = read('play.js');
const sw = read('sw.js');
const nav = read('site-nav.js');
const edge = read('netlify/edge-functions/demo-access.ts');
const config = read('netlify.toml');
const feedback = read('feedback.html');
const analysis = read('analysis.html');
const analysisJs = read('analysis.js');
const enhancement = read('playtest-enhancements.js');

ok(/playtest-enhancements\.js\?v=11/.test(play), 'play shell references current enhancement asset');
ok(/site-nav\.js\?v=11/.test(play), 'play shell references current navigation asset');
ok(/gtp-pwa-v12-evidence-pipeline/.test(sw), 'service-worker cache generation is current');
ok(/playtest-enhancements\.js\?v=11/.test(sw), 'service worker caches current enhancement asset');
ok(!/['"]\/play(?:\.html)?['"]/.test(sw.split('const CORE =')[1]?.split('];')[0] || ''), 'protected play HTML is not precached');
ok(/event\.request\.mode === 'navigate'/.test(sw) && /fetch\(event\.request\)/.test(sw), 'navigation reaches network/edge access gate');

['/play','/diagnostics','/analysis','/feedback'].forEach(route => {
  ok(edge.includes(`"${route}"`) || edge.includes(`'${route}'`), `edge gate protects ${route}`);
  ok(config.includes(`from = "${route}"`), `Netlify route configured: ${route}`);
});

ok(nav.includes('Analyze telemetry'), 'private navigation exposes telemetry analysis');
ok(nav.includes('Session feedback'), 'private navigation exposes session feedback');
ok(nav.includes('Device diagnostics'), 'private navigation exposes diagnostics');
ok(enhancement.includes("href = '/feedback'"), 'game-over flow exposes structured feedback');

ok(/name="playtest-session-feedback"/.test(feedback), 'structured feedback form has stable Netlify form name');
ok(/data-netlify="true"/.test(feedback), 'structured feedback form is discoverable by Netlify');
ok(/netlify-honeypot="bot-field"/.test(feedback) && /name="bot-field"/.test(feedback), 'structured feedback form has spam honeypot');
ok(/name="session_validity"/.test(feedback), 'feedback captures session validity');
ok(/name="points_influenced_choice"/.test(feedback), 'feedback captures point-value influence');
ok(/files are not uploaded/i.test(analysis), 'analysis page explicitly states local-only file processing');

// Keep the analyzer compatible with the telemetry fields emitted by the current game build.
ok(/decisionMs/.test(game) && /elapsedMs/.test(game), 'game telemetry emits decision and elapsed timing fields');
ok(/pointValue/.test(game), 'game telemetry emits displayed point value');
ok(/sessionConfig/.test(game) && /passMode/.test(game), 'game export envelope carries experimental session configuration');
ok(/row\.decisionMs/.test(analysisJs), 'analysis consumes current decisionMs timing field');
ok(/row\.elapsedMs/.test(analysisJs) && /elapsedMs - choiceMs/.test(analysisJs), 'analysis derives guess time from current elapsed/decision timing');
ok(/row\.pointValue/.test(analysisJs), 'analysis consumes current pointValue field');
ok(/context\.passMode/.test(analysisJs) && /sessionConfig/.test(analysisJs), 'analysis inherits pass mode from export sessionConfig');
const appVersionMatch = game.match(/const APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
warn(Boolean(appVersionMatch && /^0\.6\./.test(appVersionMatch[1])), `telemetry app version identifies v0.6 (${appVersionMatch?.[1] || 'not found'})`);

const csvText = read('content/prompt-candidates-v0.6.csv').trim();
const lines = csvText.split(/\r?\n/);
const expectedHeader = [
  'id','prompt','category','hum_points','sound_points','draw_points','mime_points',
  'hum_fit','sound_fit','draw_fit','mime_fit','representability','clear_target',
  'audience_fit','rights_safety','accidental_giveaway','status','notes'
];
const header = parseCsvLine(lines.shift());
ok(header.length === expectedHeader.length, `prompt CSV has ${expectedHeader.length} columns`);
ok(header.join('|') === expectedHeader.join('|'), 'prompt CSV header matches the documented evidence schema');
ok(lines.length === 150, 'prompt pool contains exactly 150 candidate rows');

const index = Object.fromEntries(expectedHeader.map((name, i) => [name, i]));
const ids = new Set();
const prompts = new Set();
const validStatuses = new Set(['PROPOSED_CORE','HOLD_AUDIO_RISK']);
const validFits = new Set(['H','M','L']);
let badRows = 0;
let proposed = 0;
let holds = 0;
for (const [lineIndex, line] of lines.entries()) {
  const rowNumber = lineIndex + 2;
  const cols = parseCsvLine(line);
  if (cols.length !== expectedHeader.length) {
    console.error(`FAIL  candidate row ${rowNumber} has ${cols.length} columns`);
    badRows += 1;
    continue;
  }

  const id = cols[index.id].trim();
  const prompt = cols[index.prompt].trim();
  const status = cols[index.status].trim();

  if (!/^C\d{3}$/.test(id)) {
    console.error(`FAIL  candidate row ${rowNumber} has invalid id: ${id || '(blank)'}`);
    badRows += 1;
  }
  if (!prompt) {
    console.error(`FAIL  candidate row ${rowNumber} has a blank prompt`);
    badRows += 1;
  }
  if (ids.has(id) || prompts.has(prompt)) {
    console.error(`FAIL  candidate row ${rowNumber} duplicates an id or prompt`);
    badRows += 1;
  }
  ids.add(id);
  prompts.add(prompt);

  for (const field of ['hum_points','sound_points','draw_points','mime_points']) {
    const n = Number(cols[index[field]]);
    if (!Number.isInteger(n) || n < 1 || n > 3) {
      console.error(`FAIL  candidate row ${rowNumber} has invalid ${field}: ${cols[index[field]]}`);
      badRows += 1;
    }
  }
  for (const field of ['hum_fit','sound_fit','draw_fit','mime_fit']) {
    if (!validFits.has(cols[index[field]])) {
      console.error(`FAIL  candidate row ${rowNumber} has invalid ${field}: ${cols[index[field]]}`);
      badRows += 1;
    }
  }
  if (!validStatuses.has(status)) {
    console.error(`FAIL  candidate row ${rowNumber} has unrecognized status: ${status}`);
    badRows += 1;
  }
  if (!cols[index.notes].trim()) {
    console.error(`FAIL  candidate row ${rowNumber} has blank review notes`);
    badRows += 1;
  }
  if (status === 'PROPOSED_CORE') proposed += 1;
  if (status === 'HOLD_AUDIO_RISK') holds += 1;
}
ok(badRows === 0, 'candidate rows have valid IDs, unique prompts, 1–3 point hypotheses, route-fit values, statuses, and notes');
ok(ids.size === 150 && prompts.size === 150, 'candidate IDs and prompt strings are unique');
warn(proposed >= 90, `candidate pool retains broad formal-test coverage (${proposed} PROPOSED_CORE)`);
warn(holds >= 1, `candidate pipeline visibly preserves uncertainty (${holds} HOLD_AUDIO_RISK)`);

const unresolvedDocs = [read('README.md'), read('BLIND_TEST_PROTOCOL_v0.6.md'), read('PLAYTEST_EVIDENCE_SCHEMA_v0.6.md')].join('\n');
ok(/HUM vs SOUND/i.test(unresolvedDocs), 'HUM vs SOUND remains explicitly unresolved');
ok(/timer.start/i.test(unresolvedDocs), 'timer-start condition remains explicitly unresolved');
ok(/skip|pass/i.test(unresolvedDocs), 'skip/pass condition remains explicitly unresolved');
ok(/NEEDS PLAYTESTING/.test(unresolvedDocs), 'evidence documents preserve NEEDS PLAYTESTING status language');

console.log(`\n${failures ? 'FAILED' : 'VERIFIED'} · ${failures} failure(s) · ${warnings} warning(s)`);
process.exitCode = failures ? 1 : 0;
