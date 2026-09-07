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
  'home.html','how.html','playtest.html','about.html','faq.html','press.html','partners.html','retail.html','manufacturing.html','launch.html','contact.html','privacy.html','thanks.html',
  'public-demo.js','css/tokens.css','css/site.css','css/navigation.css','site-nav.js',
  'play.html','play.js','play-runtime.js','playtest-enhancements.js','play-smart-card.js','css/game.css','css/game-smart-card.css','sw.js','manifest.webmanifest',
  'demo-access.html','diagnostics.html','diagnostics.js','analysis.html','analysis.js','feedback.html',
  'netlify.toml','netlify/edge-functions/demo-access.ts','netlify/edge-functions/site-shell.ts',
  'PLAYTEST_ACCEPTANCE_v0.6.md','BLIND_TEST_PROTOCOL_v0.6.md','PLAYTEST_EVIDENCE_SCHEMA_v0.6.md',
  'PRODUCT_TRUTH.md','CSS_ARCHITECTURE_v7.md',
  'content/prompt-candidates-v0.6.csv','content/README.md'
];
requiredFiles.forEach(file => ok(exists(file), `required file exists: ${file}`));

const home = read('home.html');
const how = read('how.html');
const playtest = read('playtest.html');
const publicPages = ['home.html','how.html','playtest.html','about.html','faq.html','press.html','partners.html','retail.html','manufacturing.html','launch.html','contact.html','privacy.html']
  .map(read)
  .join('\n');
const siteCss = read('css/site.css');
const tokens = read('css/tokens.css');
const navCss = read('css/navigation.css');
const publicDemo = read('public-demo.js');
const siteNav = read('site-nav.js');
const shell = read('netlify/edge-functions/site-shell.ts');

ok(/\/css\/tokens\.css\?v=12/.test(home) && /\/css\/site\.css\?v=12/.test(home) && /\/css\/navigation\.css\?v=12/.test(home), 'homepage loads direct public site v2 styles');
ok(/public-demo\.js\?v=2/.test(home), 'homepage loads the current public mechanic teaser');
ok(!/<iframe[^>]+\/play(?:\.html)?/i.test(home), 'homepage does not embed the protected demo');
ok(/data-public-demo/.test(home) && /data-route="hum"/.test(home) && /data-route="draw"/.test(home) && /data-route="mime"/.test(home), 'homepage visibly demonstrates the three-route choice');
ok(/data-teaser-question/.test(home) && /role="status"/.test(home) && /aria-live="polite"/.test(home), 'public teaser keeps prompt copy and commitment status accessible');
ok(/is-committed/.test(publicDemo) && /ONE TAP COMMITS/.test(publicDemo), 'public mechanic teaser demonstrates irreversible commitment');
ok(/aria-pressed/.test(publicDemo) && /aria-disabled/.test(publicDemo), 'public teaser exposes committed route state to assistive technology');
ok(/prefers-reduced-motion/.test(publicDemo), 'public teaser respects reduced-motion preference');
ok(/Private demo/.test(siteNav) && /Join a playtest/.test(siteNav), 'navigation distinguishes private demo from public playtest CTA');
ok(/overflow-y:\s*auto/.test(navCss) && /setAttribute\('inert'/.test(siteNav), 'mobile drawer is scrollable and backgrounds become inert');
ok(/aria-modal="true"/.test(siteNav) && /\sinert>/.test(siteNav) && /toggleAttribute\('inert'/.test(siteNav), 'closed drawer is removed from focus order and open drawer behaves as a modal');
ok(/--gtp-teal-dark:\s*#0b756f/i.test(tokens), 'accessible dark teal token exists for light surfaces');
ok(/section--cream \.eyebrow/.test(siteCss) && /var\(--gtp-teal-dark\)/.test(siteCss), 'light surfaces use the accessible teal variant');
ok(/section--cream \.choice-callout/.test(navCss) && /gtp-text-on-light/.test(navCss), 'light-surface choice callouts preserve readable contrast');
ok(!publicPages.includes('◒'), 'active public pages do not expose the stale MIME placeholder icon');
ok(!publicPages.includes('WORKING COMMERCIAL TITLE'), 'consumer pages avoid internal working-title jargon in primary presentation');
ok(!home.includes('CURRENT v2.1 CHALLENGER'), 'homepage avoids version-register language in the main consumer flow');
ok(/NAV_VERSION = "12"/.test(shell), 'Edge site shell is aligned to navigation v12');
ok(!/demo-access\?embed=1/.test(shell), 'Edge shell no longer replaces homepage gameplay with the passcode screen');
ok(/#signup/.test(playtest), 'playtest page exposes a direct recruitment anchor');
ok(/faq-group/.test(read('faq.html')), 'FAQ is grouped into scan-friendly categories');
ok(/PROOF BEFORE PROMISES/.test(read('launch.html')), 'launch page uses positive milestone-based framing');
ok(/THE CHOICE IS THE GAME/.test(how), 'how-it-works page leads with the differentiator');

const play = read('play.html');
const game = read('play.js');
const smartCard = read('play-smart-card.js');
const smartCardCss = read('css/game-smart-card.css');
const productTruth = read('PRODUCT_TRUTH.md');
const sw = read('sw.js');
const nav = read('site-nav.js');
const edge = read('netlify/edge-functions/demo-access.ts');
const config = read('netlify.toml');
const feedback = read('feedback.html');
const analysis = read('analysis.html');
const analysisJs = read('analysis.js');
const enhancement = read('playtest-enhancements.js');

ok(/playtest-enhancements\.js\?v=11/.test(play), 'play shell references current enhancement asset');
ok(/site-nav\.js\?v=12/.test(play) && /navigation\.css\?v=12/.test(play), 'play shell references shared navigation v12 assets');
ok(/game-smart-card\.css\?v=1/.test(play) && /play-smart-card\.js\?v=1/.test(play), 'play shell loads the isolated smart-card challenger assets');
ok(/gtp-pwa-v16-smart-card/.test(sw), 'service-worker cache generation is current');
ok(/site-nav\.js\?v=12/.test(sw) && /navigation\.css\?v=12/.test(sw), 'service worker caches shared navigation v12 assets');
ok(/playtest-enhancements\.js\?v=11/.test(sw), 'service worker caches current enhancement asset');
ok(/game-smart-card\.css\?v=1/.test(sw) && /play-smart-card\.js\?v=1/.test(sw), 'service worker caches smart-card challenger assets');
ok(!/['"]\/play(?:\.html)?['"]/.test(sw.split('const CORE =')[1]?.split('];')[0] || ''), 'protected play HTML is not precached');
ok(/event\.request\.mode === 'navigate'/.test(sw) && /fetch\(event\.request\)/.test(sw), 'navigation reaches network/edge access gate');

ok(/document\.getElementById\('correct'\)/.test(smartCard) && /correct\.click\(\)/.test(smartCard), 'swipe-to-score delegates to the canonical Correct action');
ok(/canvas/.test(smartCard) && /canvas-toolbar/.test(smartCard), 'smart-card gesture guard excludes drawing canvas and tools');
ok(/prefers-reduced-motion:\s*reduce/.test(smartCardCss), 'smart-card challenger respects reduced motion');
ok(/SMART-CARD UX CHALLENGER — PROPOSED \/ NEEDS PLAYTESTING/.test(productTruth), 'repository product truth keeps smart-card UX explicitly test-only');
ok(/Commitment is irreversible once clueing begins/.test(productTruth), 'repository product truth preserves irreversible commitment');

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
