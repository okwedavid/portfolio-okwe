# Hiring-readiness audit · Okwe David

**Reviewed:** 18 November 2026. **Baseline:** [`d044ac5`](https://github.com/okwedavid/portfolio-okwe/tree/d044ac5dd0e6085f2c40e1acdc3ae3357efb5b42). **Audience:** hiring teams evaluating AI, backend, and frontend engineers.

**Verdict:** the baseline read like a generic web-design services page. The linked work has a much stronger story: routing model requests, turning camera detections into durable events, and separating job completion from financial settlement. The redesign makes those decisions inspectable. The strongest remaining gap for a senior application is **evidence of personal ownership and measured outcomes**, not another visual effect.

## Scope and limits

I inspected this checkout and public repository metadata, source files, package manifests, and architecture/testing documents for the five supplied projects. This is not a penetration test, a code review of every line of those repositories, or verification of their production performance. I did not run their test suites or change those repositories. The Render URLs are the ones supplied for this portfolio, not independently verified uptime claims. The existing hosted portfolio was not deployed over or compared pixel-for-pixel with this older checkout.

## Findings in the baseline → changes here

| Why it matters | Before | Now |
| --- | --- | --- |
| First 10 seconds | “Okwe Dvaid,” only “Web Developer,” repeated generic service text. | Correct name, AI/full-stack positioning, location at country level, remote availability, direct project and GitHub links. |
| Technical credibility | No actual projects, repositories, system decisions, or evidence. | Five case studies with problem, system design, trade-off, stack, and links to implementation evidence. Real source names are preserved; Vision has no invented demo. |
| Recruiter navigation | Placeholder nav/social links, an empty subscribe action, and repeated “Read More.” | Four named sections, a short engineering brief, role filters, accessible project dialogs, and an explicit contact desk. No newsletter pretending to send. |
| Mobile and accessibility | Hero text positioned absolutely, fixed card widths, a floated photo, and drastic font-size reductions. | Responsive grid, normal-flow text, skip link, keyboard focus, Escape/return-focus dialogs, no scroll capture by the globe, reduced-motion and no-WebGL fallbacks. |
| Evidence handoff | A recruiter had no concise artifact to take to a hiring panel. | Printable one-page engineering brief with clickable source, evidence, and demo links. It is a project profile, **not** a fabricated employment résumé. |
| Build and operations | Deprecated native Sass, multiple generated stylesheets, and `live-server` referenced without a declared dependency. | HTML/Sass/Parcel retained; Dart Sass, lockfile, documented commands, local checks and an opt-in CI recipe, production-only static output, and a same-origin preview. |
| Contact credibility | Email input gave no reliable delivery path. | Verified provider webhooks, private single-recipient WhatsApp handoff, persistent duplicate receipts, opt-in live setup, and a visibly local no-send preview. |

## Evidence by hiring track

| Track | A reviewer can inspect now | Add next to reach a stronger senior bar |
| --- | --- | --- |
| **AI engineering** | SAGE’s request pipeline and provider boundary; VisionOps’ CPU detection, tracking, zone rules, and deterministic fixture. These are inspectable design decisions, not generic “AI-powered” labels. | SAGE: a held-out intent set, simple baseline, per-class failures, cost per successful task, and latency. VisionOps: annotated clips, event precision/recall, false alerts and p95 frame time on named hardware. Keep synthetic event tests separate from model accuracy. |
| **Backend engineering** | AgentFinance’s verified-payment → allocation → reward chain; VisionOps’ API/vision/storage boundaries; this portfolio’s authenticated ingress, timeouts, idempotency and failure reporting. | Publish one measured workload (concurrency, input size, warm/cold conditions), p95 latency, and a retry/recovery trace. Explain which invariant survived a failure and how you verified it. |
| **Frontend engineering** | Sky Watch’s stale-data states and globe fallback; Vision’s debounced input and card components; this site’s filters, responsive views, native dialogs and print output. | Capture a low-end-phone trace, measured Web Vitals, keyboard/screen-reader walkthrough and one before/after fix. Show a real loading, empty, and provider-error state rather than only the happy path. |

## Project evidence inspected

These links pin the reviewed revisions. The public case-study links follow the projects’ current branches.

- **[AgentFinance](https://github.com/okwedavid/agentfinance/tree/2fceb16bcbed8152e41e77e147451fff21354987):** frontend/backend manifests, worker/coordinator layout, and [compute/revenue design](https://github.com/okwedavid/agentfinance/blob/2fceb16bcbed8152e41e77e147451fff21354987/PHASE4_COMPUTE_REVENUE_ARCHITECTURE.md). Do not market a job estimate or simulated reward as realized revenue.
- **[SAGE](https://github.com/okwedavid/sage/tree/7658d61bf3b25c404c3560031c51f51654ad5dc8):** README architecture, provider gateway, [testing guide](https://github.com/okwedavid/sage/blob/7658d61bf3b25c404c3560031c51f51654ad5dc8/backend/TESTING.md). Do not turn repository-reported coverage into independently verified model quality.
- **[VisionOps](https://github.com/okwedavid/VisionOPs/tree/cae5e03670e75c874a3f58e628ce8de91589bf54):** README’s ingest/detect/track/zone/event pipeline, API boundaries and [test strategy](https://github.com/okwedavid/VisionOPs/blob/cae5e03670e75c874a3f58e628ce8de91589bf54/docs/TESTING.md). A no-hardware fixture is a reproducibility strength, not proof of real-camera accuracy.
- **[Sky Watch](https://github.com/Snrboi/sky-watch-dashboard/tree/926225670ba85e1414fee164b42630008dead07e):** typed frontend feature tree, FastAPI manifest, [ISS/globe changes](https://github.com/Snrboi/sky-watch-dashboard/blob/926225670ba85e1414fee164b42630008dead07e/UPDATE.md). The source belongs to the `Snrboi` namespace. Credit collaborators and add your specific contribution or PR before claiming sole authorship.
- **[Vision](https://github.com/okwedavid/vision/tree/8d02eba8e9db45fe4f522d54ffc95b206f0766dc):** React movie discovery, TMDB search and an Appwrite trending integration. The implementation does not establish a generative-video model; the portfolio describes the actual frontend.

## Owner actions, in order

1. **Before promoting Vision: rotate its hard-coded TMDB bearer credential.** It is present in the separate repo’s `src/App.jsx`; the value is intentionally not copied here. Replace it with a controlled server-side integration, check provider usage, and address exposed history after rotation. A `VITE_` variable is still public in a browser bundle. Also fix the misspelled results-length check, the argument-less search-count update and the non-OK response branch; verify empty, failing, and rapidly changing queries. This portfolio change cannot fix another repository.
2. **State ownership on each flagship project.** Add one sentence with the exact component you personally designed, dates/team context if verified, and a PR or commit that shows the change. Employment history, clients, years in role, and team leadership were not invented here.
3. **Publish one reproducible evaluation before adding more projects.** Start with VisionOps or SAGE. Include the dataset/fixture and its limitations, environment/commit, command, baseline, result, and one counterexample. A table template: `revision | inputs/hardware | baseline | metric | result | failure example`. Leave results blank until measured.
4. **Walk through the demos as a new visitor.** On a phone and in a clean browser, check cold start, auth, empty data and failure recovery. Provide a short real screen recording or fixture path for gated/sleeping demos. The generated project stills are editorial art, not evidence that a live deployment worked.
5. **Finish contact and application materials.** Configure the private intake destinations in [the runbook](CONTACT-AGENT.md), test delivery with your own opted-in WhatsApp account, and add a verified CV or professional contact address when ready. Use the printable brief in the meantime.

## Checks for this portfolio

- Production Parcel build and Node tests of voice signatures, email authentication, silent calls, model failure, HTML-to-text, destination isolation, template/session behavior, duplicate claims and delivery failure paths.
- Playwright exercises all five case studies, four demos/one source-only case, role filters, contact draft/edit/reset, mobile navigation, focus restoration, reduced motion and no-JS source access.
- Browser inspection at desktop, laptop, tablet and phone sizes; the Earth shader loaded, and the narrower layouts did not produce horizontal overflow. The print stylesheet produced a single A4 page in the Chromium preview.
- Automated axe checks on the landing page, project dialog, contact dialog and engineering brief found no violations in the tested WCAG 2 A/AA, WCAG 2.1 AA and best-practice rules. This is not a claim of a full manual accessibility certification.
- **Not tested live:** receiving a PSTN call, Postmark forwarding, paid model calls, Meta template approval, final WhatsApp delivery, or the remote demo runtimes. Those need configured accounts or external service access.
