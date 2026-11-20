# Okwe David — engineering portfolio

An Earth-backed, project-first portfolio for AI, backend, and frontend roles. The five illustrated case studies lead to the supplied repositories, four demo URLs, and specific engineering evidence. The [engineering brief](engineering-brief.html) is printable as a one-page PDF. No credentials are needed to browse the site or try the contact desk.

## Run

Use Node **22.12+** and npm.

```bash
npm ci
npm start        # build with Parcel, then serve dist/ and /api/contact on port 3000
```

The preview listens on `0.0.0.0`; change `PORT` if needed. For editing, run `npm run watch` in a second terminal and refresh the preview. Browser requests use same-origin paths. The local server serves **only `dist/`**, not the repository or `.env` files.

```bash
npm run build    # static pages and local assets in dist/
npm test         # orbit, projection and intake tests; no live providers
npx playwright install chromium
npm run test:e2e # browser journeys, mobile, keyboard, reduced motion, no-JS content
```

The checks run locally without credentials. For a preinstalled Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. A passing test is not a claim of live phone, email, or WhatsApp delivery.

**Optional GitHub Actions:** [the CI recipe](docs/ci/portfolio-checks.yml) is provided as an inactive template. A maintainer with workflow-write access can install it at `.github/workflows/checks.yml` to run the build and tests on pushes and pull requests. No Actions workflow is installed by this feature branch.

### Viewing on a phone without a live preview URL

`localhost` always means **the device opening the link**. A phone cannot reach an Arena server by opening its own `localhost:3000`. An E2B “Sandbox not found” page is a gateway error; a local HTTP 200 does not establish that the sandbox is publicly reachable.

With dependencies installed, run `npm run preview:offline` to generate `preview-files/Okwe-David-Portfolio.html`. Download or transfer that **single file** and open it in a browser. The 3D bust and its still fallback, project art, fonts, Earth maps, case studies, and engineering brief are embedded. The contact desk is a no-send demo and makes no network requests. Only external GitHub and deployed-project links need internet. No deployment or credentials are necessary.

## What changed in the stack

| Retained | Changed or added | Reason |
| --- | --- | --- |
| Semantic HTML, Sass, Parcel | Dart Sass replaces native `node-sass`; Parcel compiles SCSS directly | One reproducible build; no checked-in generated CSS or missing `live-server` command. |
| Static frontend | Small vanilla JS modules, WebGL/Canvas, native dialogs, local fonts and WebP art | Interactive Earth, filterable 3D-style projects and keyboard-accessible case studies without a frontend framework or 3D engine. |
| Netlify-compatible hosting | Node-based Netlify Function and same-origin local preview | Private webhook secrets never enter the client bundle. Publish `dist`, not the repo root. |
| — | Twilio Voice + WhatsApp, Postmark inbound, optional OpenAI summarization, server-only `html-to-text` | Take an actual call or inbound email, normalize the brief, notify a single configured owner. No always-on server or public send endpoint. |
| — | Netlify Blobs, Node test runner, Playwright, opt-in GitHub Actions recipe | Atomic duplicate suppression, provider-failure tests, and repeatable browser checks. |

## Where to edit

- **`index.html`** — copy, navigation, filters and the five `article.project-card` entries. Each card owns its artwork, repository, optional `data-demo`, stack, and case-study `<template>`. Add or update the matching summary in `engineering-brief.html`.
- **`sass/`** — base tokens, landing sections, dialogs, breakpoints, print styles. `src/main.js` handles navigation, projects, and dialogs; `src/contact.js` runs the local sample desk.
- **`src/solar-motion.js`** — a 1:1 UTC sky, not a time-lapse. Greenwich sidereal rotation takes about **23 h 56 min 4 s**; a low-precision J2000 solar ephemeris solves the slightly eccentric annual orbit and computes right ascension, declination, and geographic solar longitude. The camera initially frames Nigeria and then holds its inertial heading. Opening the site at night really does put Nigeria in shadow. Apparent globe size stays constant. This is a visualization, not a precision observatory or a live satellite feed.
- **`src/earth-material.js`, `src/photosphere.js`, `src/stars.js`, `src/earth.js`** — one solar direction drives the surface lighting, twilight, reflections, atmosphere and visible disc. The illustrative photosphere uses the mean **27.2753-day** Earth-view Carrington rotation, not measured sunspots or a rigid-body model of the Sun. Lens rays do not rotate like spokes. A cached star field with a few gently scintillating stars has its own decorative clock. The full globe updates about once per second; the header control freezes the scene. Resuming or returning to a visible tab reads current UTC, not elapsed tab-open time. Reduced motion and no WebGL get a labeled still (20 March 2026, 19:10 UTC); print omits the sky.
- **`img/portrait/okwe-bust.glb`, `src/portrait.js`** — a local, textured 360° bust with actual depth. The front uses the supplied cutout and offline-fitted facial relief. Unseen geometry and an AI-assisted side texture are approximations, not a scan. Only the finished GLB ships, not fitting software or image references. One demand-driven WebGL renderer feeds About and the pin at **9° N, 8° E**; both use the same yaw. Move horizontally, drag/swipe, or use the labeled keyboard slider and *Face front*. The pin disappears behind the globe. `img/okwe-david.webp` is the transparent fallback. No webcam, permission request, external model service, or 3D framework.
- **`src/github-links.js`** — profile and repository anchors use native top-level navigation. Each project has a direct GitHub action separate from its case study. Restrictive iframe hosts can disallow both top navigation and popups; in that case a selectable URL and copy action remain available. The site never tries to frame GitHub.
- **`img/projects/`** — five generated, optimized concept stills, not product screenshots. Image and font credits are in [the brief](engineering-brief.html#credits).
- **`server/agent.mjs`, `server/receipts.mjs`, `netlify/functions/intake.mjs`** — authenticated provider intake and WhatsApp handoff. The preview is deliberately unable to send real messages.
- **`.env.example`, `netlify.toml`** — blank server-side configuration and deploy settings. Do not commit a populated `.env` or enable production credentials in public PR previews.

## Contact appearance vs. live delivery

**Appearance:** edit `.contact-panel` in `sass/_landing.scss`, the contact desk and form in `sass/_dialogs.scss`, and the `--mint`/text tokens in `sass/_base.scss`. No account or credential is required for styling.

**Delivery:** publish the static build **and** `netlify/functions/`. Use the Functions-scoped settings in [`.env.example`](.env.example), register Twilio Voice (`POST /api/voice`) and Postmark inbound (`POST /api/email` with Basic Auth), and configure an opted-in WhatsApp destination and approved template. Only then set `ENABLE_LIVE_INTAKE=true` and redeploy in a controlled environment. `GET /api/contact` shows only the configured public channels. Never add credentials to source control; the [activation runbook](docs/CONTACT-AGENT.md) includes exact names and a real-device acceptance test.

## Review and launch

1. **[Hiring-readiness audit](docs/PORTFOLIO-AUDIT.md)** — baseline findings, evidence per role, important external-repository fixes, and the next proof to collect.
2. **[Contact agent setup](docs/CONTACT-AGENT.md)** — public voice line, inbound email, WhatsApp opt-in/template, model options, staging acceptance test and troubleshooting.
3. In the site, try **Let’s talk → Use an example → Preview WhatsApp handoff**. This local transformation is clearly labeled; it does not call an AI model, store the inquiry, or send anything.

This checkout does not change the existing Netlify site until you choose to deploy it. A static-only deploy still has the showcase and local handoff preview, but needs Netlify Functions (or an equivalent server adapter) for live intake.
