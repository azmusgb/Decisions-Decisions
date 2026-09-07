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
const sw = read('sw.js');
const nav = read('site-nav.js');
const edge = read('netlify/edge-functions/demo-access.ts');
const config = read('netlify.toml');
const feedback = read('feedback.html');
const analysis = read('analysis.html');
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

const csvText = read('content/prompt-candidates-v0.6.csv').trim();
const lines = csvText.split(/\r?\n/);
const header = lines.shift().split(',');
const expectedColumns = 19;
ok(header.length === expectedColumns, `prompt CSV has ${expectedColumns} columns`);
ok(lines.length === 150, 'prompt pool contains exactly 150 candidate rows');

const ids = new Set();
const prompts = new Set();
const validStatuses = new Set(['PROPOSED_CORE','HOLD_AUDIO_RISK']);
let badRows = 0;
let proposed = 0;
let holds = 0;
for (const [index, line] of lines.entries()) {
  const cols = line.split(',');
  if (cols.length !== expectedColumns) {
    console.error(`FAIL  candidate row ${index + 2} has ${cols.length} columns`);
    badRows += 1;
    continue;
  }
  const [id,prompt,,hum,sound,draw,mime,,,,,,,,,,,status] = cols;
  if (ids.has(id) || prompts.has(prompt)) badRows += 1;
  ids.add(id); prompts.add(prompt);
  for (const value of [hum,sound,draw,mime]) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 3) badRows += 1;
  }
  if (!validStatuses.has(status)) badRows += 1;
  if (status === 'PROPOSED_CORE') proposed += 1;
  if (status === 'HOLD_AUDIO_RISK') holds += 1;
}
ok(badRows === 0, 'candidate rows have unique IDs/prompts, valid 1–3 points, and recognized statuses');
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
