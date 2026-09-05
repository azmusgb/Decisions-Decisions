# Decisions, Decisions

Creative-direction questionnaire and early product-development site for **Decisions, Decisions**.

## Current site

The repository currently contains a static, mobile-friendly creative-direction questionnaire intended for Tanner. It captures enough direction to create image prototypes for:

- logo and identity
- card system
- physical game box
- iPhone screens
- marketing / Kickstarter assets
- future expansion-pack visual system

## Netlify

This site is designed for Netlify static hosting and Netlify Forms.

### Form

Netlify form name:

```text
tanner-creative-direction
```

Submissions are handled by Netlify Forms; no custom backend is required.

### Build settings

- Build command: none
- Publish directory: `.`
- Configuration: `netlify.toml`

### Local development

```bash
npx netlify dev
```

## Files

- `index.html` — fillable questionnaire
- `styles.css` — responsive visual system
- `app.js` — local autosave, answer export, print support, choice limits, progress indicator
- `thank-you.html` — submission confirmation
- `netlify.toml` — deployment configuration

## Product principle

The game should protect its core differentiator: **one prompt, multiple communication methods, prompt-specific risk/reward, and a committed choice under time pressure.**
