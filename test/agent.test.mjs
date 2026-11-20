import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { handleAgent } from '../server/agent.mjs';
import { blobReceipts } from '../server/receipts.mjs';

// All identifiers, addresses, speech, and providers below are synthetic. No network access.
const site = 'https://portfolio.example.invalid',
  account = 'AC' + 'a'.repeat(32),
  call = 'CA' + 'b'.repeat(32),
  sid = 'SM' + 'c'.repeat(32);
const sampleEnv = {
  ENABLE_LIVE_INTAKE: 'true',
  PUBLIC_SITE_URL: site,
  TWILIO_ACCOUNT_SID: account,
  TWILIO_AUTH_TOKEN: 'unit-test-secret',
  TWILIO_WHATSAPP_FROM: '+12025550111',
  OWNER_WHATSAPP_TO: '+12025550112',
  PUBLIC_VOICE_NUMBER: '+12025550113',
  TWILIO_CONTENT_SID: 'HX' + 'd'.repeat(32),
  PUBLIC_INBOUND_EMAIL: 'desk@example.invalid',
  POSTMARK_WEBHOOK_USER: 'postmark',
  POSTMARK_WEBHOOK_PASSWORD: 'only-for-automated-tests-never-a-real-secret',
};
function harness(envOverrides = {}, respond = () => Response.json({ sid }, { status: 201 })) {
  const env = { ...sampleEnv, ...envOverrides },
    records = new Map(),
    requests = [];
  const store = {
    async setJSON(k, v, o) {
      if (o?.onlyIfNew && records.has(k)) return { modified: false };
      records.set(k, v);
      return { modified: true };
    },
    async get(k) {
      return records.get(k);
    },
    async delete(k) {
      records.delete(k);
    },
  };
  const deps = {
    env,
    receipts: blobReceipts(() => store),
    fetcher: async (url, opts) => {
      requests.push({ url, opts });
      return respond(url, opts);
    },
  };
  return { env, requests, records, run: (r) => handleAgent(r, deps) };
}
function inbound(change = {}, headers = {}) {
  return new Request(site + '/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(
          sampleEnv.POSTMARK_WEBHOOK_USER + ':' + sampleEnv.POSTMARK_WEBHOOK_PASSWORD,
        ).toString('base64'),
      ...headers,
    },
    body: JSON.stringify({
      MessageID: 'fixture-1',
      FromFull: { Email: 'alex@example.invalid' },
      Subject: 'Engineering role',
      TextBody: 'We would like to discuss a camera-event dashboard.',
      ...change,
    }),
  });
}
function voice(step = '', change = {}, signature) {
  const url = site + '/api/voice' + (step ? '?step=' + step : '');
  const body = {
    AccountSid: account,
    CallSid: call,
    To: sampleEnv.PUBLIC_VOICE_NUMBER,
    From: '+12025550114',
    ...change,
  };
  const data =
    url +
    Object.keys(body)
      .sort()
      .map((k) => k + body[k])
      .join('');
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-twilio-signature':
        signature ?? createHmac('sha1', sampleEnv.TWILIO_AUTH_TOKEN).update(data).digest('base64'),
    },
    body: new URLSearchParams(body),
  });
}

test('preview exposes no private configuration and makes no provider calls', async () => {
  const h = harness({ ENABLE_LIVE_INTAKE: 'false' });
  assert.deepEqual(await (await h.run(new Request(site + '/api/contact'))).json(), {
    voice: null,
    email: null,
  });
  assert.equal((await h.run(inbound())).status, 503);
  assert.equal((await h.run(voice())).status, 503);
  assert.equal(h.requests.length, 0);
});
test('public status includes only explicitly published, ready channels', async () => {
  const h = harness();
  const res = await h.run(new Request(site + '/api/contact'));
  assert.deepEqual(await res.json(), {
    voice: sampleEnv.PUBLIC_VOICE_NUMBER,
    email: sampleEnv.PUBLIC_INBOUND_EMAIL,
  });
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});
test('a missing sender, invalid owner, or missing approved template fails closed', async () => {
  for (const change of [
    { TWILIO_WHATSAPP_FROM: '' },
    { OWNER_WHATSAPP_TO: 'not a number' },
    { TWILIO_CONTENT_SID: '' },
    { PUBLIC_SITE_URL: 'http://example.invalid' },
  ]) {
    const h = harness(change);
    assert.equal((await h.run(inbound())).status, 503);
    assert.equal(h.requests.length, 0);
  }
});
test('voice checks provider signature and account/line before asking for speech', async () => {
  const h = harness();
  for (const req of [
    voice('', {}, 'unsigned'),
    voice('', { To: '+12025550199' }),
    voice('', { AccountSid: 'AC' + 'f'.repeat(32) }),
  ])
    assert.equal((await h.run(req)).status, 403);
  assert.equal(h.requests.length, 0);
});
test('voice greeting discloses transcription + WhatsApp and uses the canonical callback', async () => {
  const h = harness();
  const r = await h.run(voice());
  assert.match(r.headers.get('content-type'), /xml/);
  const text = await r.text();
  assert.match(text, /<Gather input="speech"/);
  assert.match(text, /WhatsApp/);
  assert.match(text, /transcribed/);
  assert.ok(text.includes(site + '/api/voice?step=message'));
  assert.equal(h.requests.length, 0);
});
test('silence gets one reprompt, then hangs up without an empty notification', async () => {
  const h = harness();
  assert.match(await (await h.run(voice('message'))).text(), /step=retry/);
  assert.match(await (await h.run(voice('retry'))).text(), /No message was taken/);
  assert.equal(h.requests.length, 0);
});
test('speech forwards only to the configured owner and replays are idempotent', async () => {
  const h = harness();
  for (let i = 0; i < 2; i++) {
    const r = await h.run(
      voice('message', { SpeechResult: 'Please call me about a frontend role.' }),
    );
    assert.match(await r.text(), /accepted for forwarding/);
  }
  assert.equal(h.requests.length, 1);
  const data = h.requests[0].opts.body;
  assert.equal(data.get('To'), 'whatsapp:' + sampleEnv.OWNER_WHATSAPP_TO);
  const values = JSON.parse(data.get('ContentVariables'));
  assert.equal(values['1'], 'Phone');
  assert.match(values['3'], /frontend role/);
  assert.equal(h.records.size, 1);
  assert.doesNotMatch(JSON.stringify([...h.records]), /frontend|1202555|CA[b]{32}/);
});
test('Postmark checks authentication before parsing the message', async () => {
  const h = harness();
  assert.equal((await h.run(inbound({}, { Authorization: 'wrong' }))).status, 401);
  assert.equal(h.requests.length, 0);
});
test('authenticated email uses reply text, ignores attachments and visitor-supplied recipients', async () => {
  const h = harness();
  const r = await h.run(
    inbound({
      StrippedTextReply: 'Could we talk about a backend role?',
      To: 'someone-else@example.invalid',
      HtmlBody: 'HTML_CONTENT',
      Attachments: [{ Content: 'ATTACHMENT_CONTENT' }],
    }),
  );
  assert.equal(r.status, 200);
  const data = h.requests[0].opts.body,
    values = JSON.parse(data.get('ContentVariables'));
  assert.equal(values['1'], 'Email');
  assert.equal(values['2'], 'alex@example.invalid');
  assert.match(values['3'], /backend role/);
  assert.equal(data.get('To'), 'whatsapp:' + sampleEnv.OWNER_WHATSAPP_TO);
  assert.doesNotMatch(data.toString(), /ATTACHMENT_CONTENT|HTML_CONTENT|someone-else/);
});
test('concurrent retries reserve once and a completed replay never calls the provider again', async () => {
  const h = harness();
  const results = await Promise.all([h.run(inbound()), h.run(inbound())]);
  assert.ok(results.some((r) => r.status === 200));
  assert.equal(h.requests.length, 1);
  assert.equal((await h.run(inbound())).status, 200);
  assert.equal(h.requests.length, 1);
});
test('a definite rejection releases the receipt for a later provider retry', async () => {
  let reject = true;
  const h = harness({}, () =>
    reject ? new Response(null, { status: 429 }) : Response.json({ sid }),
  );
  assert.equal((await h.run(inbound())).status, 503);
  assert.equal(h.records.size, 0);
  reject = false;
  assert.equal((await h.run(inbound())).status, 200);
  assert.equal(h.requests.length, 2);
});
test('an ambiguous provider timeout is not reported as success or automatically resent', async () => {
  const h = harness({}, () => {
    throw new Error('timeout');
  });
  assert.equal((await h.run(inbound())).status, 503);
  assert.equal((await h.run(inbound())).status, 503);
  assert.equal(h.requests.length, 1);
  assert.equal([...h.records.values()][0].state, 'pending');
});
test('voice cannot claim successful forwarding on provider errors', async () => {
  const h = harness({}, () => new Response(null, { status: 400 }));
  const r = await h.run(voice('message', { SpeechResult: 'Please get in touch.' }));
  assert.match(await r.text(), /cannot confirm/);
});
test('optional model produces a bounded summary and preserves an original excerpt', async () => {
  const h = harness({ OPENAI_API_KEY: 'unit-test-only' }, (url) =>
    url.includes('openai.com')
      ? Response.json({ choices: [{ message: { content: 'An engineering inquiry.' } }] })
      : Response.json({ sid }),
  );
  assert.equal((await h.run(inbound())).status, 200);
  assert.equal(h.requests.length, 2);
  const llm = JSON.parse(h.requests[0].opts.body);
  assert.equal(llm.store, false);
  assert.equal(llm.tools, undefined);
  assert.doesNotMatch(h.requests[0].opts.body, /alex@|1202555/);
  const content = JSON.parse(h.requests[1].opts.body.get('ContentVariables'))['3'];
  assert.match(content, /AI summary: An engineering inquiry/);
  assert.match(content, /Original excerpt: We would like/);
});
test('model failure falls back to the real brief; no fabricated summary', async () => {
  const h = harness({ OPENAI_API_KEY: 'unit-test-only' }, (url) =>
    url.includes('openai.com') ? new Response(null, { status: 503 }) : Response.json({ sid }),
  );
  assert.equal((await h.run(inbound())).status, 200);
  const content = JSON.parse(h.requests[1].opts.body.get('ContentVariables'))['3'];
  assert.match(content, /Message: We would/);
  assert.doesNotMatch(content, /AI summary/);
});
test('free-form sandbox messages require explicit session-window opt-in', async () => {
  const h = harness({ TWILIO_CONTENT_SID: '', ALLOW_SESSION_MESSAGES: 'true' });
  assert.equal((await h.run(inbound())).status, 200);
  assert.match(h.requests[0].opts.body.get('Body'), /Portfolio inquiry · Email/);
  assert.equal(h.requests[0].opts.body.has('ContentSid'), false);
});
test('intake bounds bodies and rejects bad envelopes', async () => {
  const h = harness();
  assert.equal((await h.run(inbound({ TextBody: 'a'.repeat(520 * 1024) }))).status, 413);
  assert.equal((await h.run(inbound({ MessageID: '' }))).status, 422);
  assert.equal((await h.run(inbound({}, { 'Content-Type': 'text/html' }))).status, 415);
  assert.equal(h.requests.length, 0);
});
test('read-only status, method checks, and unknown routes', async () => {
  const h = harness();
  assert.equal((await h.run(new Request(site + '/api/voice'))).status, 405);
  assert.equal((await h.run(new Request(site + '/api/contact', { method: 'POST' }))).status, 405);
  assert.equal((await h.run(new Request(site + '/api/missing'))).status, 404);
});

test('HTML-only email becomes readable text without loading images, following links, or forwarding markup', async () => {
  const h = harness();
  const r = await h.run(
    inbound({
      TextBody: '',
      HtmlBody:
        '<p>Hello <b>David</b> &amp; team. A frontend opening.</p><img src="https://ignored.example.invalid/photo"><a href="https://ignored.example.invalid/link">Details</a>',
    }),
  );
  assert.equal(r.status, 200);
  assert.equal(h.requests.length, 1);
  const text = JSON.parse(h.requests[0].opts.body.get('ContentVariables'))['3'];
  assert.match(text, /Hello David & team/);
  assert.doesNotMatch(text, /ignored.example|<img|<b>/);
});
