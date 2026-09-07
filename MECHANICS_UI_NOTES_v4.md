# GET THE POINT — Mobile Mechanics/UI v4

Status: prototype implementation. This does **not** lock unresolved commercial rules.

## Goals

- Keep the core differentiator visible at all times: prompt-specific route choice under time pressure.
- Fit the full gameplay decision/action surface inside an iPhone Safari viewport without controls falling behind browser chrome.
- Make the route decision fast: prompt dominates, three route buttons remain large, and one tap commits.
- Keep the timed turn continuous across prompts.
- Make PASS testable without forcing a route commitment first.
- Make scoring feedback immediate without adding confirmation steps.

## Gameplay presentation

1. HUD: team + round, timer, total score.
2. Thin timer rail gives peripheral time pressure without dominating the prompt.
3. Card meta communicates current phase: CHOOSE before commitment, CLUE after commitment.
4. Prompt stays visually dominant.
5. Pre-commit: three large route controls with prompt-specific points.
6. One tap commits; selected route becomes a compact committed banner.
7. Correct is the primary post-commit action; PASS remains secondary when that test condition is enabled.
8. DRAW expands a compact in-card canvas with Undo/Clear.
9. Correct immediately advances to the next prompt while the same turn timer keeps running.
10. End of turn hands off to the next team; one timed turn per team per round remains a prototype structure, not a locked final rule.

## Test variables preserved

- HUM vs SOUND
- timer start on reveal vs commit
- one pass per turn vs no pass
- 60 / 30 / 15 round timing
- final team/round structure

## Telemetry

Continue collecting prompt, route, point value, outcome, decision time, elapsed guess time, timer condition, team, and round. Uncommitted passes are recorded distinctly so pass behavior can be evaluated rather than hidden.