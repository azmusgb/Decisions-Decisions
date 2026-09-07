# Performance UX v6 — Playtest focus

The implementation intentionally tests one coherent game loop with three dedicated post-commit performance surfaces.

## Observe
- Does HUM feel immediately understandable without microphone functionality?
- Do players naturally obey `MELODY ONLY · NO WORDS`?
- Does MIME free the performer to move rather than stare at the phone?
- Is `NO TALKING · NO MOUTHING` understood without facilitator explanation?
- Does DRAW remain equally fast despite having a canvas/tool layer?
- Do players understand that the other routes disappear because the choice is irreversible?
- Does pre-commit-only skip increase meaningful commitment or create frustration?
- Does the phone become visually quiet enough after commitment?

## Capture
Use the existing telemetry for route, prompt, points, outcome, decision time, elapsed time, timer condition, and `pass-uncommitted` events. Also record facilitator observations for rule questions, awkward failures, phone-handling friction, and whether a teammate naturally takes over score tapping during MIME.

## Decision gate
Do not promote the pre-commit-only skip rule, HUM label, MIME label/icon, or timer-start condition to LOCKED from this implementation alone. Require blind-play evidence.