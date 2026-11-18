const projects = [
  { name: 'AgentFinance', type: 'AI & FINANCE', description: 'An AI finance project with a live deployment. Explore the app and repository for its current features and implementation.', tags: ['AI', 'Finance', 'Full stack'], category: ['ai','product'], accent: '#75d3bc', source: 'https://github.com/okwedavid/agentfinance', demo: 'https://agentfinance.onrender.com', icon: '<path d="M18 42V18m0 24H7m11 0 11-11 8 5 16-18"/><circle cx="53" cy="16" r="4"/>' },
  { name: 'Sage', type: 'AGENTIC AI', description: 'An AI cognitive operating system with a five-stage pipeline, specialized workers, and a multi-provider model gateway.', tags: ['Next.js', 'Node & Express', 'Supabase'], category: ['ai','product'], accent: '#b89aff', source: 'https://github.com/okwedavid/sage', demo: 'https://sage-fx1l.onrender.com', icon: '<path d="M32 7 55 20v26L32 59 9 46V20z"/><circle cx="32" cy="33" r="11"/><path d="M32 3v11m0 39v9M5 33h11m32 0h11"/>' },
  { name: 'VisionOps', type: 'COMPUTER VISION', description: 'A local-first vision operations platform: CPU ONNX detection, object tracking, spatial zones, and durable evidence events.', tags: ['FastAPI', 'ONNX Runtime', 'React'], category: ['vision','product'], accent: '#ffbf79', source: 'https://github.com/okwedavid/VisionOPs', demo: 'https://visionops-uypi.onrender.com', icon: '<path d="M5 32s10-17 27-17 27 17 27 17-10 17-27 17S5 32 5 32Z"/><circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="3"/>' },
  { name: 'Vision', type: 'AI & INTERFACES', description: 'A React and Vite vision project. Open the source repository to explore its current implementation.', tags: ['React', 'Vite', 'JavaScript'], category: ['vision','ai'], accent: '#70d8e9', source: 'https://github.com/okwedavid/vision', icon: '<path d="M32 5 55 18v28L32 59 9 46V18z"/><path d="m9 18 23 14 23-14M32 32v27m-12-7 24-40"/>' },
  { name: 'SkyWatch', type: 'WEATHER DASHBOARD', description: 'A weather dashboard with a live deployment. Explore the interface and the source repository.', tags: ['Weather', 'Data dashboard', 'Full stack'], category: ['product'], accent: '#81bdff', source: 'https://github.com/Snrboi/sky-watch-dashboard', demo: 'https://skywatch-x6yn.onrender.com', icon: '<path d="M16 42h32a10 10 0 0 0 1-20 16 16 0 0 0-30-5 12 12 0 0 0-20 10 9 9 0 0 0 17 4Z"/><path d="m20 48-4 8m20-8-4 8m20-8-4 8"/>' }
];
const grid = document.querySelector('#projects-grid');
const filters = document.querySelectorAll('.filter-button');

function renderProjects(filter = 'all') {
  const visible = projects.filter(project => filter === 'all' || project.category.includes(filter));
  grid.innerHTML = visible.map(project => `
    <article class="project-card">
      <div class="project-art" style="--project-accent:${project.accent}" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${project.icon}</svg>
      </div>
      <div class="project-info">
        <div class="project-kicker"><span>${project.type}</span>${project.demo ? '<span class="live"><i></i>LIVE</span>' : ''}</div>
        <h3>${project.name}</h3>
        <p>${project.description}</p>
        <div class="project-tags">${project.tags.map(tag => `<span>${tag}</span>`).join('')}</div>
        <div class="project-links">${project.demo ? `<a href="${project.demo}" target="_blank" rel="noreferrer">Live demo ↗</a>` : ''}<a href="${project.source}" target="_blank" rel="noreferrer">Source code ↗</a></div>
      </div>
    </article>`).join('');
}
renderProjects();
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  renderProjects(button.dataset.filter);
}));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav-inner nav a')];
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: '-30% 0px -60% 0px' });
sections.forEach(section => observer.observe(section));

const form = document.querySelector('.contact-form');
const status = document.querySelector('#form-status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    status.textContent = 'Preview mode: messages are not sent. Netlify Forms will receive this after deployment.';
    return;
  }
  status.textContent = 'Sending…';
  const body = new URLSearchParams(new FormData(form)).toString();
  try {
    const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw new Error('Form submission failed');
    form.reset();
    status.textContent = 'Thanks — your message has been sent.';
  } catch {
    status.textContent = 'Your message could not be sent. Please try again in a moment.';
  }
});
