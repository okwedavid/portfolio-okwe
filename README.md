# Okwe David portfolio preview

This preview follows the visual language of [okwedavid.netlify.app](https://okwedavid.netlify.app): dark navy background, purple accents, Poppins typography, fixed navigation, vertical hero marker, and rounded cards. The work in this preview focuses on content, navigation, project discovery, and contact usability.

Run it locally with `npm start` and open http://localhost:4174.

## Experience changes

- Replaced generic hero copy with a concise AI and software engineering introduction and direct project/contact actions.
- Replaced template jobs and sample projects with the five projects and live demos supplied by Okwe.
- Added project filters, real repository/demo links, and project-specific vector cover art.
- Replaced generic testimonials with a short description of working approach; the old page included client names and performance claims not substantiated by the project references supplied for this work.
- Added accessible form labels, active section navigation, keyboard-friendly filters, responsive layouts, and reduced-motion handling.
- Added an Earth scene as a real Three.js WebGL canvas with photographic surface, normal, specular, and cloud maps from the Three.js example assets; a procedural map remains as a fallback. Three.js 0.187.0 is pinned in the browser import map, without adding a frontend framework.
- Added a Netlify Forms-ready contact form. In the local preview, submissions are intentionally not sent.

## Making contact intake production-ready

The form is prepared for Netlify Forms, but a web form is not an email inbox and neither the form nor a call is forwarded to WhatsApp yet.

1. After deploying this form through Netlify, enable form detection in the site’s **Forms** settings and add an email notification for verified submissions. Netlify documents the setup at [Forms setup](https://docs.netlify.com/manage/forms/setup/) and [Form notifications](https://docs.netlify.com/manage/forms/notifications/).
2. To receive messages sent to an email address, connect an inbound email provider/webhook (or configure email forwarding) to a server-side function. Normalize those messages with website-form submissions so both paths reach the same notification handler.
3. Create a Meta WhatsApp Business Platform app and configure a WhatsApp sender. Add a server-side notification function that sends the lead summary to your own opted-in WhatsApp number. Keep the access token, phone-number ID, destination number (international E.164 format), and template name in hosting environment variables, never in browser JavaScript. See [Meta’s WhatsApp Business Platform overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview).
4. For phone calls, provision a voice number, point its incoming-call webhook to a server-side voice agent, and route a short call summary to the same WhatsApp function. Twilio describes incoming call webhooks and request validation in its [Voice Webhooks guide](https://www.twilio.com/docs/usage/webhooks/voice-webhooks). Add an opening disclosure, a human handoff, and a voicemail fallback.
5. Set up consent, input validation, rate limits, retention rules, and logging that excludes message contents where possible. Test form, inbound email, and calls using your own accounts before publishing the phone number.

No phone number, destination email, provider credentials, AI voice agent, or WhatsApp forwarding is included in this preview. The local contact form deliberately does not transmit data.

## Deployment source

The public `master` and `new-feature` branches contained an older static page and did not match the live Netlify page inspected for this work. This update is being placed on `new-feature` as requested; it does not change the live Netlify deployment. Confirm that Netlify is connected to this repository and branch before merging or publishing it.
