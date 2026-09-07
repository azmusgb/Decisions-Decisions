# GET THE POINT — v0.6 Staged Condition Plan

Status: **PROPOSED / NEEDS PLAYTESTING**

Purpose: isolate the largest unresolved rules without changing several variables at once or creating an underpowered eight-cell experiment.

## Freeze rule

During a block:

- use the same deployed build,
- do not change prompt scoring between valid sessions,
- do not change a test condition after the first timed turn,
- do not teach strategy,
- preserve invalid sessions for defect discovery but exclude them from primary comparisons.

If a material game/rule fix is deployed, start a new build cohort rather than silently mixing pre-fix and post-fix sessions.

## Control condition

For this v0.6 plan, the **test control** is:

- audio: **HUM**
- timer start: **COMMIT**
- skip: **1 PRE-COMMIT**
- timer structure: **60 → 30 → 15**
- MIME mask challenger: **shown**

This is a test control, **not a LOCKED commercial rule**.

---

## Block A — HUM vs SOUND

Hold timer start and skip constant. Compare only the audio-route instruction.

| Session | Audio | Timer start | Skip |
|---|---|---|---|
| A1 | HUM | Commit | 1 pre-commit |
| A2 | SOUND | Commit | 1 pre-commit |
| A3 | SOUND | Commit | 1 pre-commit |
| A4 | HUM | Commit | 1 pre-commit |

Primary observations:

- audio route choice share,
- audio success rate,
- audio choice time,
- prompt-level audio failures,
- “impossible” reactions,
- whether SOUND becomes a generic sound-effect shortcut,
- whether HUM creates song-recall friction unrelated to the core risk/reward decision.

Do not pick a winner from one or two sessions. If signal is mixed, replicate rather than forcing a decision.

---

## Block B — timer starts on commit vs reveal

Hold HUM and one pre-commit skip constant.

| Session | Audio | Timer start | Skip |
|---|---|---|---|
| B1 | HUM | Commit | 1 pre-commit |
| B2 | HUM | Reveal | 1 pre-commit |
| B3 | HUM | Reveal | 1 pre-commit |
| B4 | HUM | Commit | 1 pre-commit |

Primary observations:

- choice time,
- visible urgency before commitment,
- accidental rushed route taps,
- route diversity,
- total successful prompts per turn,
- whether reveal-start makes the decision itself exciting or merely punitive.

The desired outcome is not automatically the faster condition. The decision should feel urgent **and meaningful**.

---

## Block C — one pre-commit skip vs no skip

Hold HUM and commit-start constant.

| Session | Audio | Timer start | Skip |
|---|---|---|---|
| C1 | HUM | Commit | 1 pre-commit |
| C2 | HUM | Commit | None |
| C3 | HUM | Commit | None |
| C4 | HUM | Commit | 1 pre-commit |

Primary observations:

- dead-card exposure,
- frustration vs funny failure,
- skip utilization,
- time spent evaluating an impossible-looking prompt,
- whether skip becomes an automatic optimization rather than a safety valve,
- replay interest.

A skip rule should not hide weak content. Continue logging the skipped prompt so the content can be cut if necessary.

---

## Variables held constant in v0.6

### MIME mask

The theatrical-mask icon remains the v0.6 **challenger**, not a locked production icon. Observe unaided comprehension and capture confusion. Do not add a second icon system inside the same game session.

### 60 → 30 → 15

Keep this baseline fixed while Blocks A–C run. Separately observe whether shorter rounds increase energy or create confusion. A dedicated timer-structure study can follow once the higher-impact interaction variables are clearer.

### Point values

Treat displayed points as hypotheses. Do not re-score after every session. Accumulate repeated prompt × route evidence first, then make a deliberate calibration pass.

---

## Minimum evidence before a rule decision

There is no automatic sample-size claim here. Use these as practical gates before even considering a lock:

1. At least two valid blind sessions per condition.
2. No material build defect contaminating the comparison.
3. Attempt-level telemetry is available for the relevant behavior.
4. Participant debrief does not directly contradict the behavioral signal without investigation.
5. The same pattern appears across more than one group type before making a commercial rule permanent.

If evidence is weak or contradictory, status remains **NEEDS PLAYTESTING**.

## Stop conditions

Stop a block and fix the product if:

- the prototype prevents completion,
- the same rule needs repeated facilitator rescue,
- one condition creates obvious humiliation or sustained discomfort,
- route controls are misunderstood so frequently that the test is measuring UI failure instead of game behavior,
- the prompt pool itself is too weak to test the intended variable.
