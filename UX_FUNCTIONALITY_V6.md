# GET THE POINT — Performance UX v6

Status: **PROPOSED / NEEDS PLAYTESTING** except the already-locked one-tap commitment behavior.

## Core loop
`PROMPT → CHOOSE → COMMIT → PERFORM → CORRECT → NEXT`

## Dedicated post-commit surfaces
- **HUM**: teal, animated audio bars, `HUM THE MELODY`, `MELODY ONLY · NO WORDS`.
- **SOUND comparison**: same audio surface, `MAKE THE SOUND`, `NO WORDS`.
- **DRAW**: yellow drawing surface, large canvas, undo, clear, `NO WORDS · LETTERS · NUMBERS`.
- **MIME**: purple kinetic surface, `ACT IT OUT`, `NO TALKING · NO MOUTHING`.

No microphone, camera, recording, recognition, or automatic judging.

## Skip condition
The v6 test makes ordinary skip **pre-commit only** when enabled. `pass-uncommitted` remains separately logged. After commitment the selected route stays locked until Correct or timeout.

Do not promote skip behavior, HUM vs SOUND, MIME labeling/iconography, timer start, or final round structure to LOCKED without blind-play evidence.