# GET THE POINT — Performance UX v6

Status: **PROPOSED / NEEDS PLAYTESTING** except where core commitment behavior is already locked.

## Core interaction

`PROMPT → CHOOSE → COMMIT → PERFORM → CORRECT → NEXT`

One tap on a route commits immediately. After commitment the other route choices disappear so the player is no longer visually invited to reconsider.

## Dedicated performance surfaces

- **HUM** — teal performance surface, animated notes/waveform, `HUM THE MELODY`, `MELODY ONLY · NO WORDS`.
- **SOUND comparison** — same audio surface but `MAKE THE SOUND`, `NO WORDS`.
- **DRAW** — yellow performance surface with large drawing canvas, undo, clear, and scoring control.
- **MIME** — purple performance surface, kinetic mask/motion treatment, `ACT IT OUT`, `NO TALKING · NO MOUTHING`.

No microphone, camera, recording, recognition, or automatic judging is introduced.

## Pass test condition

The current v6 test condition moves ordinary pass to **pre-commit only**. This separates a prompt-skip decision from failure after accepting a route.

- Pre-commit skip event: `pass-uncommitted`
- Post-commit: correct or timeout; ordinary pass is unavailable.

This is **NEEDS PLAYTESTING**, not a final commercial rule.

## UX intent

The phone should be highly informative during choice, then become quiet and performance-oriented after commitment. HUM and MIME should feel as deliberately designed as DRAW while remaining the same game loop rather than separate mini-games.