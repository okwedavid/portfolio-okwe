import { initGitHubLinks } from './github-links.js';
import { initEarth } from './earth.js';
import { initContact } from './contact.js';

const $ = (selector) => document.querySelector(selector);
const cards = [...document.querySelectorAll('.project-card')];
const nav = $('#main-nav'),
  menu = $('.mobile-menu');
function closeMenu() {
  nav.classList.remove('is-open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  menu.querySelector('use').setAttribute('href', '#i-menu');
}
menu.addEventListener('click', () => {
  if (nav.classList.contains('is-open')) return closeMenu();
  nav.classList.add('is-open');
  menu.setAttribute('aria-expanded', 'true');
  menu.setAttribute('aria-label', 'Close navigation');
  menu.querySelector('use').setAttribute('href', '#i-close');
});
nav.addEventListener('click', closeMenu);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.site-header')) closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) {
    closeMenu();
    menu.focus();
  }
});
const sectionLinks = [...nav.querySelectorAll('a')];
let queued = false;
function navState() {
  queued = false;
  let current = sectionLinks[0];
  for (const a of sectionLinks) {
    if ($(a.hash).getBoundingClientRect().top <= innerHeight * 0.3) current = a;
  }
  for (const a of sectionLinks) {
    a.classList.toggle('active', a === current);
    if (a === current) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  }
}
window.addEventListener(
  'scroll',
  () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(navState);
    }
  },
  { passive: true },
);
navState();
const filters = [...document.querySelectorAll('[data-filter]')];
filters.forEach((button) =>
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    cards.forEach((card) => {
      card.hidden = filter !== 'all' && !card.dataset.categories.split(' ').includes(filter);
    });
    $('#project-grid').classList.toggle('all-projects', filter === 'all');
    const count = cards.filter((c) => !c.hidden).length;
    $('#work-count').textContent =
      `Showing ${count} ${count === 1 ? 'project' : 'projects'}: ${button.textContent.replace('05', '').trim()}.`;
  }),
);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  cards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (reduced.matches) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty(
        '--tilt-x',
        `${(-(e.clientY - r.top - r.height / 2) / r.height) * 4}deg`,
      );
      card.style.setProperty(
        '--tilt-y',
        `${((e.clientX - r.left - r.width / 2) / r.width) * 5}deg`,
      );
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    });
  });
}
let returnFocus = null;
function openDialog(dialog) {
  closeMenu();
  returnFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  dialog.querySelector('.dialog-scroll').scrollTop = 0;
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)
      dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    returnFocus?.focus?.({ preventScroll: true });
    returnFocus = null;
  });
}
const caseDialog = $('#case-dialog');
function showCase(card) {
  const link = card.querySelector('.project-open'),
    pic = card.querySelector('.project-image img');
  $('#case-art').src = pic.currentSrc || pic.src;
  $('#case-art').alt = pic.alt + ' — illustrative project artwork';
  $('#case-category').textContent =
    card.querySelector('.project-category').textContent + ' / CASE STUDY';
  $('#case-number').textContent = card.querySelector('.specimen-index').textContent;
  $('#case-title').textContent = card.querySelector('h3').textContent;
  $('#case-summary').textContent = card.querySelector('.project-desc').textContent;
  $('#case-stack').replaceChildren(
    ...[...card.querySelectorAll('.stack-tags li')].map((el) => el.cloneNode(true)),
  );
  $('#case-content').replaceChildren(card.querySelector('template').content.cloneNode(true));
  $('#case-repo').href = link.href;
  const live = $('#case-demo');
  live.hidden = !card.dataset.demo;
  if (card.dataset.demo) live.href = card.dataset.demo;
  else live.removeAttribute('href');
  openDialog(caseDialog);
}
// Keep an un-intercepted, one-click source link next to the case-study opener.
for (const card of cards) {
  const link = document.createElement('a');
  link.className = 'project-source';
  link.href = card.querySelector('.project-open').href;
  link.target = '_top';
  link.rel = 'noreferrer';
  link.textContent = 'GitHub ↗';
  link.setAttribute('aria-label', `${card.querySelector('h3').textContent} source on GitHub`);
  card.append(link);
}
for (const el of document.querySelectorAll('.project-open,[data-case-link]')) {
  el.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !caseDialog.showModal) return;
    e.preventDefault();
    showCase(
      el.closest('.project-card') || document.getElementById('project-' + el.dataset.caseLink),
    );
  });
  if (caseDialog.showModal) el.setAttribute('aria-haspopup', 'dialog');
}
initContact(openDialog);
// Decorative rendering is independent of navigation, project evidence, and contact.
initGitHubLinks();
try {
  initEarth();
} catch {
  /* The local poster remains the default background if canvas is unavailable. */
}
