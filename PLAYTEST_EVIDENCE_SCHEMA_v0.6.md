# GET THE POINT — Playtest Evidence Contract v0.6

Status: **PROPOSED / NEEDS PLAYTESTING**

This document defines the evidence we want to preserve while the rules remain experimental. It does **not** promote any unresolved mechanic to LOCKED.

## Why this exists

GET THE POINT succeeds or fails on observable behavior:

> **Do players notice the risk/reward choice, make different choices under time pressure, perform successfully often enough to stay engaged, and want another game?**

The evidence model therefore separates three layers:

1. **Attempt telemetry** — what happened on each prompt.
2. **Session context** — which experimental rules were active.
3. **Human observation / debrief** — what players understood, felt, and said.

Do not collapse these layers into one score.

---

## 1. Attempt telemetry

Preferred fields for every revealed prompt:

| Field | Purpose |
|---|---|
| `gameId` | Join attempts from one game/session. |
| `recordedAt` | Ordering and troubleshooting. |
| `promptId` | Stable content identity. |
| `prompt` | Human-readable target. |
| `round` | 60 / 30 / 15 comparison. |
| `teamIndex` / team ID | Rotation and team-level checks. |
| `audioMode` | HUM vs SOUND cohort separation. |
| `timerStartMode` | Reveal vs commit cohort separation. |
| `passMode` | One pre-commit skip vs none. |
| `route` | HUM/SOUND, DRAW, or MIME. |
| `displayedPoints` | Risk/reward presented to player. |
| `promptStartedAt` | Choice-time origin. |
| `methodLockedAt` | Commitment timestamp. |
| `choiceMs` | Derived reveal → commitment duration. |
| `outcome` | `correct`, `failed`, `timeout`, `pass-uncommitted`. |
| `correctAt` | Guess-time endpoint when successful. |
| `guessMs` | Derived commitment → correct duration. |
| `remainingMs` | Clock pressure at outcome where available. |
| `appVersion` | Prevent incompatible build mixing. |

### Required interpretation

- **Pass before commitment is not a route failure.** Log it separately.
- **Timeout after commitment is evidence against the selected route/prompt combination**, but should still be segmented from an explicit incorrect result if such a state is later introduced.
- **Choice time is first-class evidence.** The product differentiator is choice under time pressure; losing this field would weaken the most important behavioral analysis.
- **Displayed points must be retained.** Route selection without the offered point values cannot tell us whether risk/reward influenced behavior.

---

## 2. Session context

Each game/session should retain:

- build/app version,
- player count,
- group type when voluntarily recorded,
- HUM vs SOUND condition,
- timer-start condition,
- skip/pass condition,
- timer structure,
- facilitator rescue count,
- rule-question count,
- session validity.

### Session validity

Use the blind-test protocol. Mark a session **INVALID / DO NOT MIX WITH PRIMARY DATA** when a material build failure, facilitator coaching, mid-session condition change, or rule ambiguity changes the behavior being measured.

Invalid sessions remain useful for defect discovery and qualitative insight. They must not be blended into balance estimates.

---

## 3. Human observation / debrief

Capture immediately after the game, before explaining design intent:

1. In one sentence, what is this game?
2. What was the most fun part?
3. What was confusing?
4. Did the point values change what you chose?
5. Was there a route you avoided? Why?
6. Which prompt felt impossible or unfair?
7. Would you play again?
8. Who would you play this with?

Also capture:

- strong laughter/reaction moments,
- accidental rule violations,
- attempts to switch after commitment,
- facilitator rescues,
- dead-card comments,
- spontaneous risk/reward discussion.

---

## Derived metrics

The browser analysis tool may calculate these as **triage signals**, not final conclusions:

### Choice behavior

- route share,
- route share by point value,
- median choice time,
- route switching across prompts within a player/team if identity is available,
- dominant-route rate.

### Performance

- success rate by route,
- success rate by prompt × route,
- median guess time by route,
- timeout rate,
- pre-commit pass rate.

### Content health

- prompt success rate,
- prompt pass/timeout rate,
- dominant route per prompt,
- prompt-specific dead-card flags,
- repeated “impossible/unfair” mentions.

### Product health

- time to meaningful play when observed,
- rule questions,
- facilitator rescues,
- replay intent,
- unaided description of the mechanic.

---

## Heuristic review thresholds

These are deliberately conservative and remain **PROPOSED**:

- Fewer than **3** observations on a prompt → `MORE DATA`, not a balance conclusion.
- At least **3** observations and <35% observed success or ≥50% pass/timeout → `DEAD-CARD REVIEW`.
- At least **4** committed observations and ≥75% routed through one method → `ROUTE DOMINANCE REVIEW`.
- Dataset with multiple HUM/SOUND, timer-start, pass, or materially different build conditions → warn and segment before comparing.

These thresholds exist to prioritize review. They are not automatic deletion, scoring, or rules decisions.

---

## Promotion rule for content

No prompt receives `VALIDATED_CORE` from desk review alone.

Promotion requires repeated playtest evidence supporting:

- representability,
- clear guess convergence,
- audience/cultural fit,
- meaningful point-driven choice,
- acceptable success/guess-time behavior,
- no persistent accidental giveaway,
- rights-safe use,
- no persistent dead-card or dominant-route failure.

Prefer cutting a weak prompt over preserving deck size.

---

## Privacy / scope

The current prototype keeps gameplay telemetry in the browser until the tester explicitly exports it. `/analysis` processes selected telemetry files locally in the browser. The structured `/feedback` form intentionally submits only the responses entered into that form.

No camera, microphone, recording, voice recognition, pose recognition, or automatic answer judging is required for this evidence model.
