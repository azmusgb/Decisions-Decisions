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

## Current live experience

Netlify serves the mobile-first offline playtest PWA at `/` and `/play`.

The PWA currently includes:

- offline-capable installable shell
- pass-and-play team setup
- 60 → 30 → 15 second test baseline
- prompt-specific route points
- one-tap irreversible route commitment
- HUM vs SOUND test condition
- timer-start-on-commit vs timer-start-on-reveal test condition
- provisional pass/no-pass condition
- drawing canvas with undo + clear
- local state recovery
- local playtest telemetry + JSON export
- reduced-motion support and no unnecessary permissions

### Run locally

```bash
npx netlify dev
```

Then open the local Netlify URL shown in the terminal.

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

Do not turn unresolved variables into permanent software assumptions.

## Repository structure

- `play.html`, `play.css`, `play.js` — current PWA vertical slice
- `manifest.webmanifest`, `sw.js`, `icon.svg` — install/offline assets
- `netlify.toml` — root routing, historical routes, headers
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
