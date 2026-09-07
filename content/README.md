# GET THE POINT — Content Candidate Pipeline

Status: **PROPOSED / NEEDS PLAYTESTING**

This directory is a candidate-content workspace, not a final commercial deck.

## Current pool

`prompt-candidates-v0.6.csv` contains **150 generic prompt candidates** across nine broad categories. Every row is a desk-review hypothesis designed to be tested, not a validated score.

### Candidate fields

- `hum_points`, `sound_points`, `draw_points`, `mime_points` — initial difficulty estimates only. Higher = harder.
- `*_fit` — expected route representability: `H`, `M`, or `L`.
- `representability` — desk-review screen, not observed success.
- `clear_target` — whether the word itself appears to have a reasonably unambiguous target.
- `audience_fit` — provisional mainstream/mixed-group suitability.
- `rights_safety` — `GENERIC_TERM` means the prompt itself is generic and does not intentionally depend on licensed IP.
- `accidental_giveaway` — must still be checked in real play.
- `status` — `PROPOSED_CORE` or `HOLD_AUDIO_RISK`.

## Important HUM/SOUND constraint

The audio route is unresolved. A prompt can be strong for SOUND and weak for HUM, or vice versa. The dataset therefore keeps separate HUM and SOUND hypotheses instead of pretending one score fits both.

`HOLD_AUDIO_RISK` does **not** mean a prompt is permanently rejected. It means the desk review found enough uncertainty in HUM representability that the prompt should not silently enter a final core deck.

## Required promotion gate

A prompt should move toward validated core content only after playtest evidence supports all of the following:

1. Representability through every active route.
2. Clear target / guess convergence.
3. Audience and cultural fit for the intended pack.
4. Scoring creates a real risk/reward choice.
5. No accidental giveaway caused by prompt wording or route instructions.
6. Rights-safe prompt/content usage.
7. No persistent dead-card, pass, or dominant-route pattern.

Do not rescue weak prompts by merely increasing points. Remove or redesign them.

## Data to join back to prompts

For every attempt, retain when available:

- prompt ID / prompt text,
- route selected,
- displayed points,
- success/failure,
- choice time,
- guess time,
- uncommitted skip/pass,
- timeout,
- round/timer condition,
- HUM vs SOUND condition,
- rule question / facilitator rescue,
- dead-card reaction,
- strong positive reaction,
- replay interest at the session level.

## Promotion labels

- **PROPOSED_CORE** — suitable for formal testing, not validated.
- **HOLD_AUDIO_RISK** — audio-route representability needs special attention.
- **VALIDATED_CORE** — reserved for prompts supported by sufficient playtest evidence; none are assigned by desk review.
- **CUT** — remove from the working pool when evidence shows the card is weak, confusing, culturally brittle, or unbalanced.
