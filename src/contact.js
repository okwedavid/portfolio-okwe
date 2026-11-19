const $ = (id) => document.getElementById(id);
export function initContact(openDialog) {
  const desk = $('contact-dialog'),
    form = $('handoff-form'),
    result = $('handoff-result'),
    brief = $('brief-input'),
    reply = $('reply-input');
  const pickers = [...desk.querySelectorAll('[data-channel]')];
  let channel = 'email',
    channels = { email: null, voice: null },
    statusKnown = true,
    requestId = 0;
  const drafts = { email: { text: '', reply: '' }, voice: { text: '', reply: '' } };
  function render() {
    const phone = channel === 'voice';
    const address = channels[channel];
    pickers.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.channel === channel)));
    $('channel-state').textContent = address ? 'CHANNEL CONNECTED' : 'PREVIEW MODE';
    $('channel-state').classList.toggle('connected', !!address);
    $('channel-description').textContent = address
      ? phone
        ? 'Call the automated receptionist. It will ask for your name, a callback detail, and a brief for David.'
        : 'Email your brief to the intake inbox. It may be summarized by AI; your reply address and a message excerpt are forwarded privately to David on WhatsApp. Please leave out sensitive information.'
      : (statusKnown
          ? `The ${phone ? 'phone line' : 'email inbox'} is not connected yet.`
          : 'Live channel status is unavailable.') +
        ' Try a sample handoff below; nothing is sent or stored.';
    const link = $('channel-link');
    link.hidden = !address;
    if (address) {
      link.href = (phone ? 'tel:' : 'mailto:') + address;
      link.textContent = (phone ? 'Call ' : 'Email ') + address;
    } else link.removeAttribute('href');
    $('brief-label').textContent = phone ? 'Sample call transcript' : 'Sample email';
    brief.placeholder = phone
      ? 'What would you tell the assistant on a call?'
      : 'Tell me about the project or role you have in mind…';
    $('reply-label').firstChild.textContent = phone ? 'Callback number ' : 'Reply address ';
    reply.type = phone ? 'tel' : 'email';
    reply.placeholder = phone ? 'International phone number' : 'you@example.com';
  }
  async function load() {
    // A downloaded review copy has no server and must never attempt a live handoff.
    if (document.documentElement.hasAttribute('data-offline-preview')) return;
    const id = ++requestId;
    try {
      const res = await fetch('/api/contact', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) throw Error();
      const config = await res.json();
      if (id !== requestId) return;
      channels = {
        voice: /^\+[1-9]\d{7,14}$/.test(config.voice) ? config.voice : null,
        email: /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(config.email) ? config.email : null,
      };
      statusKnown = true;
    } catch {
      if (id !== requestId) return;
      channels = { voice: null, email: null };
      statusKnown = false;
    }
    render();
  }
  document.querySelectorAll('[data-contact-open]').forEach((link) =>
    link.addEventListener('click', (event) => {
      if (!desk.showModal) return;
      event.preventDefault();
      openDialog(desk);
      render();
      load();
    }),
  );
  pickers.forEach((button) =>
    button.addEventListener('click', () => {
      drafts[channel] = { text: brief.value, reply: reply.value };
      channel = button.dataset.channel;
      render();
      brief.value = drafts[channel].text;
      reply.value = drafts[channel].reply;
      brief.setCustomValidity('');
      form.hidden = false;
      result.hidden = true;
    }),
  );
  $('sample-brief').addEventListener('click', () => {
    brief.setCustomValidity('');
    brief.value =
      channel === 'email'
        ? 'I’m looking for an engineer to build a camera-event dashboard. Could we discuss a CPU-first prototype and the operator interface?'
        : 'Hi David, I’m Alex. We’re hiring an AI engineer to connect our model pipeline to a customer dashboard. I’d like to arrange an introduction.';
    reply.value = channel === 'email' ? 'alex@example.com' : '';
    brief.focus();
  });
  brief.addEventListener('input', () => brief.setCustomValidity(''));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = brief.value.trim();
    if (text.length < 10) {
      brief.setCustomValidity('Please enter at least 10 non-space characters.');
      brief.reportValidity();
      return;
    }
    $('handoff-text').textContent =
      `Portfolio inquiry · ${channel === 'email' ? 'Email' : 'Phone'}\nReply to: ${reply.value.trim() || 'Not supplied'}\n\n${text}`;
    form.hidden = true;
    result.hidden = false;
    $('copy-status').textContent = '';
    $('handoff-text').focus();
  });
  $('edit-brief').addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    brief.focus();
  });
  $('copy-brief').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('handoff-text').textContent);
      $('copy-status').textContent = 'Copied to clipboard.';
    } catch {
      $('copy-status').textContent = 'Select the preview text and copy it manually.';
    }
  });
  desk.addEventListener('close', () => {
    requestId++;
    form.reset();
    brief.setCustomValidity('');
    form.hidden = false;
    result.hidden = true;
    channel = 'email';
    drafts.email = { text: '', reply: '' };
    drafts.voice = { text: '', reply: '' };
    $('handoff-text').textContent = '';
    $('copy-status').textContent = '';
  });
}
