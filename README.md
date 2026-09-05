# Decisions, Decisions

Creative-direction studio and early product-development site for **Decisions, Decisions**.

## Current live experience

The default site is the **v3 guided creative-direction flow** for Tanner. It is intentionally organized as five focused phases rather than one long survey:

1. **Set the Target** — audience, first reaction, brand character
2. **Choose the Look** — visual territory, palette, typography, logo behavior
3. **Design the Product** — card system, third-method label, box story, iPhone direction
4. **Make It Sell** — marketing hook, prototype assets, references and uploads
5. **Lock the Brief** — prototype order, priorities, review, must-survive / free-to-change notes

The form captures enough direction to build a coherent prototype family for:

- logo and identity
- card system
- physical game box
- iPhone screens
- marketing / Kickstarter assets
- future visual-system extensions

## Netlify

This site uses Netlify static hosting and Netlify Forms.

### Current form

```text
tanner-creative-direction-v3
```

Netlify Forms handles submissions and optional reference-image uploads; no custom backend is required.

### Routes

- `/` or `/v3` — current guided v3 studio
- `/v2` — previous studio version
- `/v1` — original long-form questionnaire
- `/thank-you` — current confirmation page

### Build settings

- Build command: none
- Publish directory: `.`
- Configuration: `netlify.toml`

### Local development

```bash
npx netlify dev
```

## Current files

- `creative-direction-v3.html` — five-phase guided questionnaire
- `creative-direction-v3.css` — responsive flow, stepper, prototype previews, review UI
- `creative-direction-v3.js` — phase navigation, autosave, completion tracking, live brief, review, uploads
- `thank-you-v3.html` — v3 submission confirmation
- `netlify.toml` — current routing and headers

Older v1/v2 files remain in the repository for comparison.

## Product principle

Protect the core differentiator: **one prompt, multiple communication methods, prompt-specific risk/reward, and a committed choice under time pressure.** The core deck currently uses **one-word prompts**.
