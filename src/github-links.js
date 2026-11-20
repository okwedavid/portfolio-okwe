// GitHub denies framing. Use real top-level anchors rather than a JS redirect or
// a popup. If the host sandbox disallows navigation too, leave a usable URL.
export function initGitHubLinks() {
  if (window.self === window.top) return;
  let panel;
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (
      !a ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      a.protocol !== 'https:' ||
      a.hostname !== 'github.com' ||
      a.closest('.link-recovery')
    )
      return;
    panel?.remove();
    panel = document.createElement('aside');
    panel.className = 'link-recovery';
    panel.setAttribute('aria-label', 'External link options');
    panel.innerHTML =
      '<strong>Opening GitHub</strong><button type="button" class="recovery-close" aria-label="Dismiss link options">×</button><p>If this preview blocks navigation, copy the address or open a new tab.</p><input aria-label="GitHub address" readonly><button type="button" class="recovery-copy">Copy URL</button><a target="_blank" rel="noopener noreferrer">New tab ↗</a>';
    const input = panel.querySelector('input'),
      copy = panel.querySelector('.recovery-copy');
    input.value = a.href;
    panel.querySelector('a').href = a.href;
    panel.querySelector('.recovery-close').onclick = () => {
      panel.remove();
      a.focus();
    };
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        copy.textContent = 'Copied';
      } catch {
        input.focus();
        input.select();
        copy.textContent = 'Select & copy';
      }
    };
    (a.closest('dialog') || document.body).append(panel);
    requestAnimationFrame(() => {
      if (input.isConnected) input.focus({ preventScroll: true });
    });
    // Do not prevent the original user-activated navigation.
  });
}
