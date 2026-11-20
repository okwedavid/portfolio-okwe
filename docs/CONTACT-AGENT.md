# Enable the phone/email → WhatsApp contact agent

**Default: off.** All phone numbers and real credentials are blank. `npm start` is intentionally a no-delivery preview, even if your shell contains production keys. To try the experience today, open **Let’s talk**, pick **Email intake** or **Phone intake**, use an example, then **Preview WhatsApp handoff**. This local example is not model-generated and is never posted. Closing the desk clears the draft.

## What goes live

```text
Incoming call → signed Twilio webhook → disclosure → speech gather → short transcript ┐
Inbound email → authenticated Postmark webhook → plain-text brief                    ├→ optional AI summary + original excerpt → Twilio WhatsApp → owner
                                                                                      ┘
```

This is a **message-taking receptionist**. It answers inbound calls, prompts for name/reply detail/brief, and reprompts once for silence. It does not impersonate you, dial visitors, negotiate on your behalf, or record call audio in the portfolio. Postmark receives new emails, not your existing mailbox history. Twilio handles speech recognition. If you enable OpenAI, only the bounded message text and subject are submitted for summarization, without separate sender metadata; the text itself can still contain personal data. Without a key, the actual excerpt is forwarded. No model can set the recipient, send arbitrary replies, or call tools.

## 1. Deploy a staging copy when you are ready

Use a separate HTTPS Netlify site or controlled staging context before changing your existing public site. `netlify.toml` specifies Node 22, `npm run build`, `dist/`, and the Functions directory. Deploy the function **as well as** the static files. Netlify supplies its Blobs context automatically for the modern Functions runtime. No additional database account is needed.

Copy the names from [`.env.example`](../.env.example) into Netlify’s **server-side environment settings with Functions scope**. Do not put secrets in HTML, client JS, `netlify.toml`, query parameters on public pages, `VITE_`/`PUBLIC_` build-time substitutions, or a committed `.env`. Scope credentials to the chosen environment, not all preview builds.

| Variable | Set it to |
| --- | --- |
| `PUBLIC_SITE_URL` | The exact public **HTTPS origin** that Twilio will call, e.g. your staging site. Use the same domain in the provider console. |
| `ENABLE_LIVE_INTAKE` | Leave `false` during setup; change to `true` only when ready to make a real, possibly billable, test. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Credentials for the account/subaccount that owns the voice line and WhatsApp sender. The Auth Token also validates voice webhook signatures. |
| `TWILIO_WHATSAPP_FROM` | Your approved WhatsApp sender or Twilio sandbox sender, in E.164 format. No `whatsapp:` prefix. |
| `OWNER_WHATSAPP_TO` | **Your private, opted-in receiving number**, in E.164 format. Not the number shown on the portfolio. |
| `TWILIO_CONTENT_SID` | An approved WhatsApp Content template SID (`HX…`) with exactly the three fields below. This is the normal production path. |
| `ALLOW_SESSION_MESSAGES` | `false` normally. Set `true` with an empty template SID **only** to test within an open WhatsApp customer-service window. |
| `PUBLIC_VOICE_NUMBER` | The voice-capable Twilio number visitors can call. Leave empty to disable calls. |
| `PUBLIC_INBOUND_EMAIL` | The address or alias that actually routes to your Postmark inbound stream. Leave empty to disable email. |
| `POSTMARK_WEBHOOK_USER`, `POSTMARK_WEBHOOK_PASSWORD` | A dedicated username and random URL-safe password (at least 24 characters). This is **not** your mailbox password. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional server-only summarization key and a Chat Completions-compatible model (`gpt-4o-mini` by default). Set a provider budget. |

You can enable one inbound channel without the other. Both require a valid WhatsApp sender, owner destination, and template or explicitly enabled session mode. After changing function environment variables, redeploy to apply the settings.

## 2. Set up the WhatsApp destination first

- **Sandbox test:** enable Twilio’s WhatsApp sandbox. From **your own receiving phone**, send the join text shown in Twilio’s console to its sandbox number. Open a service window by messaging that sender. Use the console’s sandbox sender as `TWILIO_WHATSAPP_FROM`; use your own opted-in number as `OWNER_WHATSAPP_TO`. Keep the template SID blank and set `ALLOW_SESSION_MESSAGES=true` for this test only. Sandbox enrollment and trial limits apply.
- **Production:** register a WhatsApp Business sender through Twilio, obtain the recipient’s opt-in, and get a suitable template approved. Business-initiated notifications outside the 24-hour customer-service window require a permitted template. An inbound phone call or a Postmark email does **not** open a WhatsApp session with the owner.
- Template variables are `{{1}}` = `Phone`/`Email`, `{{2}}` = sender/callback detail, `{{3}}` = brief (subject, optional summary, original excerpt). Example wording to submit for review: **“New portfolio inquiry. Channel: {{1}}. Reply detail: {{2}}. Brief: {{3}}. Please review before replying.”** Approval and category are decided by the provider. Use the resulting `HX…` SID, disable session mode, and verify the approved template language and sender.

All routes fix the `To` address on the server. The website, email body, caller and model cannot choose another WhatsApp destination.

## 3. Connect calls

1. Provision a **voice-capable** Twilio number; confirm trial, number availability, and local calling restrictions for your account.
2. Set `PUBLIC_VOICE_NUMBER` to that number including `+` and country code.
3. In the number’s voice configuration, set **A call comes in → Webhook → HTTP POST → `https://<your-site>/api/voice`**. Use the same scheme and host as `PUBLIC_SITE_URL`, with no trailing slash or URL shortener. The handler generates the speech callback URL.
4. A caller hears the automated-intake and WhatsApp disclosure before the speech prompt. A silent call gets one retry, then ends without a notification. The assistant gives a confirmation only after the message is accepted by Twilio; an uncertain handoff gets a different spoken response.

## 4. Connect inbound email

1. Create a Postmark inbound message stream. Use its inbound address, route a dedicated domain/subdomain according to Postmark’s instructions, **or forward a dedicated alias** to that address. This does not require giving the app access to your personal inbox.
2. Set `PUBLIC_INBOUND_EMAIL` to the address visitors should use. Set the private webhook username/password in the function environment.
3. Configure the stream’s inbound webhook to **POST JSON to `/api/email` with HTTP Basic authentication**. For Postmark’s URL credential form, enter `https://<encoded-user>:<encoded-password>@<your-site>/api/email` **only in its private provider settings**. URL-encode reserved characters. Do not share a populated URL in chat, screenshots, logs or Git.
4. Forward **new inbound messages**, not delivery/open/tracking events. The handler prefers `StrippedTextReply`, then `TextBody`, then bounded HTML converted to text without fetching remote content. Attachments are never forwarded. For an attachment-only message, it sends sender/subject and a note to reply for details. Sender fields are reply hints, not verified identities.

## 5. Acceptance test (real providers; only after opt-in)

1. Set `ENABLE_LIVE_INTAKE=true` in staging and redeploy. Open `https://<your-site>/api/contact`. It should return exactly two keys: `voice` and `email`, containing only the **public** configured addresses or `null`. Never the private WhatsApp number or keys.
2. In **Let’s talk**, the configured channel should change from **Preview mode** to **Channel connected** with a `tel:` or `mailto:` action. The example form stays local; it is **not** a web-to-WhatsApp send endpoint.
3. Call the public line yourself. Leave a synthetic message such as “This is a test inquiry about a dashboard project; reply by email.” Expect one `Phone` handoff on your selected WhatsApp account. A silent test call should create none.
4. Send a short, plain-text email with a unique test subject to the public alias. Expect one `Email` handoff with the correct reply address and brief. Use Postmark’s retry for the **same MessageID**; a completed handoff must not be sent a second time.
5. Confirm **final delivery on the phone and in Twilio Messaging Logs**. API acceptance/queueing is not delivery. Inspect Postmark activity and Twilio’s call debugger if a message is missing. A successful local test or a `200` from the configuration endpoint is not an end-to-end delivery test.
6. Try a missing/disabled model key: a readable original excerpt should still arrive. With AI enabled, manually compare the summary with the source for omitted deadlines or invented facts before relying on it.

## Failure handling, privacy and operating limits

| Symptom | What to check |
| --- | --- |
| Preview remains off | Live delivery is deliberately disabled under `npm start`. On Netlify, check Functions scope, deploy context, required fields, fresh deploy, public E.164 formatting, template/session mode. |
| Twilio `403` | Check the account/subaccount token, public voice number, configured canonical URL and HTTP POST method. Do not turn off signature validation to debug. |
| Postmark `401` / `413` | Check Basic Auth on the **inbound** webhook; the endpoint caps the complete JSON event at 512 KiB. Large attachments can exceed the cap: resend without them. |
| Accepted, not delivered | Check Twilio message SID/status/error, approved sender/template, owner opt-in, trial/sandbox membership and service window. There is no delivery-status callback or claim that David read the message. |
| A retry says unconfirmed | Netlify Blobs makes an atomic reservation keyed by channel + a SHA-256 hash of CallSid/MessageID. Completed events are not resent. Definite provider 4xx rejects release the reservation. A timeout/5xx or interrupted receipt write is ambiguous: it stays `pending` to avoid duplicate messages. |

**Reconcile a pending receipt:** compare the provider event time and Twilio Messaging Logs before taking action. If Twilio accepted the notification, mark the receipt `accepted` with the confirmed message SID. If you can establish it was never accepted, remove that pending receipt and retry the original provider event. Do not blindly delete it and replay. There is no persistent content queue or automatic recovery of lost call audio. An unresolved voice handoff tells the caller it could not be confirmed.

The receipt store `portfolio-intake-receipts` keeps only hashed event keys, timestamps, state and accepted provider SIDs. The app does not log transcripts, addresses, auth headers or model prompts. Providers and WhatsApp may retain message contents under their own settings; review their retention policies, local privacy requirements and notices before enabling live intake. Limit access to the owner account. Review old receipts periodically; keep them past the provider replay window (deleting one permits a later replay). Inspect Postmark spam filtering and set provider spend alerts/limits before publishing public contact endpoints.

**Off switch:** set `ENABLE_LIVE_INTAKE=false` and redeploy, disable the provider webhooks and revoke/rotate credentials if needed. The portfolio and local sample desk continue to work.
