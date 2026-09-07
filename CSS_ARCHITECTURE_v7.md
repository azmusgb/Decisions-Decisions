# GET THE POINT CSS Architecture — v7

## Active product CSS

- `css/tokens.css` — canonical product colors, spacing, radii, shadows, type stack, compatibility aliases.
- `css/site.css` — public marketing/prelaunch site only.
- `css/game.css` — canonical PWA/game styling, including setup, handoff, choice, HUM/SOUND, DRAW, MIME, results, modals and responsive states.
- `css/game-smart-card.css` — isolated **PROPOSED / NEEDS PLAYTESTING** active-turn challenger layered after `css/game.css` for the current smart-card experiment.

Compatibility entrypoints:
- `site.css` imports the active public files so existing public HTML does not need duplicate stylesheet tags.
- `play.css` imports the canonical game files for old links/bookmarks.
- `play-polish.css` and `play-performance.css` are intentionally retired. Do not add rules to them.

## Experimental-layer rule

The smart-card layer is an explicit exception to the normal no-override rule because the interaction is still under controlled playtest. It must remain:

1. narrowly scoped to active-turn presentation/gesture affordance;
2. clearly labeled **PROPOSED / NEEDS PLAYTESTING**;
3. free of canonical game-state ownership;
4. removable without rewriting `play.js`; and
5. either folded into `css/game.css` or deleted once the interaction decision is settled.

Do not create additional dated/stacked override files around it.

## Historical CSS

`styles.css`, `creative-direction-v2.css`, `creative-direction-v3.css`, and `creative-direction-round2.css` belong to archived creative-direction artifacts. They are provenance, not active design sources. Do not import them from current public or game pages.

## Rules

1. One authoritative declaration per active component whenever practical; do not append dated override blocks.
2. Product tokens come from `css/tokens.css`.
3. Keep unresolved game mechanics configurable in JavaScript; CSS must not imply a rule is LOCKED.
4. Use `--app-height` as the single dynamic viewport-height variable. `play-runtime.js` owns updates from `visualViewport`.
5. Netlify overlay handling must target known toolbar/drawer/badge surfaces only. Do not hide generic Netlify iframes or broad `[data-netlify-*]` content.
6. Mobile navigation remains available via horizontally scrollable links; do not hide navigation destinations on narrow screens.
7. Use `:focus-visible` for interactive controls and preserve reduced-motion behavior.
8. Prefer `font-weight:900` for heavy display text with the system font stack; do not rely on synthetic weight 1000.
9. Canonical HUM/DRAW/MIME styling belongs in `css/game.css`; smart-card-specific challenger deltas belong only in `css/game-smart-card.css` while that experiment is active.
10. Do not create another override stylesheet. Refactor the owning canonical component or extend the existing explicitly sanctioned challenger layer.
11. Experimental UI must not create alternate scoring, timer, persistence, or route-selection state paths.
