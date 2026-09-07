# GET THE POINT

Physical + digital social/party game prototype centered on **choice under time pressure**.

> Historical project codename: **Decisions, Decisions**

## Core mechanic

**ONE PROMPT → MULTIPLE ROUTES → DIFFERENT RISK/REWARD → PLAYER CHOOSES → COMMITS → TEAM GUESSES**

The current v2.1 challenger presents three routes in this order:

1. **HUM** — teal
2. **DRAW** — yellow
3. **MIME** — purple

The route labels/order/colors are still playtest variables. The core mechanic is not.

## Current web surfaces

Netlify serves a public product/playtest site at `/` and a passcode-gated browser prototype at `/play`.

Private playtest tools:

- `/play` — v0.6 blind-test candidate game shell
- `/diagnostics` — browser/device capability checks and copyable defect report
- `/analysis` — local-only telemetry normalization, triage, and normalized CSV export
- `/feedback` — structured post-game qualitative/session-validity capture

The PWA currently includes:

- pass-and-play team setup
- 60 → 30 → 15 second test baseline
- prompt-specific route points
- one-tap irreversible route commitment
- HUM vs SOUND test condition
- timer-start-on-commit vs timer-start-on-reveal test condition
- provisional pre-commit skip/no-skip condition
- prompt-first **smart-card** active-turn challenger
- deliberate right-swipe-to-score challenger after a correct guess
- existing Correct control retained as an accessible/failsafe scoring path
- drawing canvas with undo + clear; swipe scoring is guarded away from the drawing surface/tools
- automatic score accumulation using the already-selected prompt-specific point value
- local state recovery
- local playtest telemetry + JSON export
- keyboard fallback for scoring and reduced-motion support
- no unnecessary permissions

The smart-card presentation and swipe gesture are **PROPOSED / NEEDS PLAYTESTING**. They remove visible commitment ceremony, not the underlying irreversible commitment rule.

Protected HTML always returns to the network/edge access gate rather than being served from the PWA cache.

### Run locally

```bash
npx netlify dev
```

Then open the local Netlify URL shown in the terminal.

### Verify the release contract

```bash
node scripts/verify-release.mjs
```

GitHub Actions also runs syntax checks and the zero-dependency release verifier on pull requests and pushes to `main`.

## Content evidence pipeline

`content/prompt-candidates-v0.6.csv` contains **150 candidate prompts** for structured testing. These are not a final deck and their point values are initial hypotheses only.

The dataset deliberately keeps separate HUM and SOUND scoring/representability estimates because the audio route remains unresolved. Prompts flagged `HOLD_AUDIO_RISK` are held for closer testing rather than silently promoted or deleted.

See:

- `content/README.md` — prompt promotion/cut discipline
- `PLAYTEST_EVIDENCE_SCHEMA_v0.6.md` — telemetry, session context, human feedback, and derived-metric contract
- `BLIND_TEST_PROTOCOL_v0.6.md` — blind-test facilitation and validity rules
- `PLAYTEST_ACCEPTANCE_v0.6.md` — device/gameplay acceptance gate

No prompt receives `VALIDATED_CORE` from desk review alone.

## Product status

### LOCKED

- Choice under time pressure is the core differentiator.
- The player chooses a prompt-specific risk/reward route before performing.
- Commitment is irreversible once clueing begins.
- Correct answers earn the selected route's points.
- New groups should begin playing in roughly two minutes.

### PROPOSED / NEEDS PLAYTESTING

- HUM / DRAW / MIME production labels
- HUM → DRAW → MIME order
- teal / yellow / purple method signals
- theatrical-mask direction for MIME
- 60 / 30 / 15 timer structure and 15-second tiebreak
- HUM vs broader SOUND
- pass/skip behavior
- Easy/Hard handling
- timer start on reveal vs commitment
- final team/round structure
- prompt-specific point calibration
- smart-card active-turn presentation
- right-swipe-to-score gesture
- hiding the live score during a timed turn

Do not turn unresolved variables into permanent software assumptions.

## Repository structure

- `play.html`, `play.js`, `css/game.css` — canonical PWA vertical slice and game state/UI
- `play-smart-card.js`, `css/game-smart-card.css` — isolated smart-card UX challenger; **PROPOSED / NEEDS PLAYTESTING**
- `play-runtime.js` — viewport/runtime resilience without game-rule ownership
- `playtest-enhancements.js` — blind-test presentation/feedback bridge without changing core rule state
- `diagnostics.html`, `diagnostics.js` — protected device diagnostics
- `analysis.html`, `analysis.js` — protected local telemetry analysis
- `feedback.html` — protected structured post-game Netlify form
- `content/` — candidate prompt pool and content-promotion policy
- `manifest.webmanifest`, `sw.js`, `icon.svg` — install/cache assets
- `netlify/edge-functions/` — public shell response hardening and private-demo access gate
- `netlify.toml` — routing, caching, headers, historical routes
- `scripts/verify-release.mjs` — repository/release invariant checks
- `PRODUCT_TRUTH.md` — repository-level current product truth
- `archive.html` — entry point for historical Tanner creative-direction work
- `creative-direction-*`, `index.html`, `app.js`, legacy thank-you pages — historical research/prototype artifacts

## Historical creative-direction work

The original Tanner questionnaire/studio files remain in the repository for provenance and comparison, but they are **not current product truth**. Use `/archive` to access them.

Old references to **Decisions, Decisions**, old method mappings, or one-word-only prompt rules inside those historical files must not override current product decisions.

## Source authority

When repository artifacts conflict, use this order:

1. current project product truth / master decision register
2. current rules, v2.1 design delta, and iOS PRD
3. current test protocols and datasets
4. manufacturing, economics, legal/rights, and competitive research
5. historical creative-direction files only for provenance

## Commercial note

**GET THE POINT** is the lead commercial-name candidate, not a completed trademark clearance conclusion. Naming preference and legal clearance remain separate workstreams.
