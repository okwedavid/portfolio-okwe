// A fixed-scale, Earth-tracking view. All moving parts sample the same active clock.
import { globe } from './earth-material.js';
import { RAD, EARTH_RADIUS, globeBasis, projectPoint, solarState } from './solar-motion.js';

const RADIUS = 1000 * EARTH_RADIUS;
const SVG = 'http://www.w3.org/2000/svg';

function stars() {
  const canvas = document.querySelector('#starfield');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const render = () => {
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    let seed = 9363;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const count = Math.min(460, (width * height) / 3300);
    for (let i = 0; i < count; i++) {
      const x = random() * width,
        y = random() * height,
        a = 0.15 + random() * 0.58,
        r = 0.24 + random() * 0.66;
      ctx.fillStyle = `rgba(205,228,238,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (i % 47 === 0) {
        ctx.fillStyle = `rgba(178,209,222,${a * 0.4})`;
        ctx.fillRect(x - 2.3, y - 0.4, 4.6, 0.8);
        ctx.fillRect(x - 0.4, y - 2.3, 0.8, 4.6);
      }
    }
  };
  new ResizeObserver(render).observe(canvas);
}

function overlay(scene) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'orbit-lines');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('fill', 'none');
  scene.append(svg);
  const root = document.createElementNS(SVG, 'g');
  root.setAttribute('stroke-linecap', 'round');
  svg.append(root);
  const make = (tag, attrs, parent = root) => {
    const el = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    parent.append(el);
    return el;
  };
  const vector = (lat, lon) => [
    Math.cos(lat * RAD) * Math.cos(lon * RAD),
    Math.sin(lat * RAD),
    Math.cos(lat * RAD) * Math.sin(lon * RAD),
  ];
  const home = vector(9, 8);
  function project(point, basis) {
    const [x, y, z] = projectPoint(point, basis);
    return [500 + RADIUS * x, 500 - RADIUS * y, z];
  }
  const path = (points) => {
    let move = true;
    return points
      .map(([x, y, z]) => {
        if (z < 0 && Math.hypot(x - 500, y - 500) < RADIUS) {
          move = true;
          return '';
        }
        const s = (move ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
        move = false;
        return s;
      })
      .join(' ');
  };
  // Two inclined orbital tracks. The hidden hemisphere is occluded by the Earth.
  const orbit = (t, r, angle, inc) => {
    const x = r * Math.cos(t),
      y = r * inc * Math.sin(t);
    return [
      500 + x * Math.cos(angle) - y * Math.sin(angle),
      500 + x * Math.sin(angle) + y * Math.cos(angle),
      Math.sin(t),
    ];
  };
  for (const [r, a, inc, opacity] of [
    [500, -0.31, 0.29, 0.49],
    [474, 0.49, 0.24, 0.22],
  ]) {
    make('path', {
      d: path(Array.from({ length: 181 }, (_, i) => orbit((i * Math.PI) / 90, r, a, inc))),
      stroke: '#bfdcca',
      'stroke-width': 1.05,
      opacity,
    });
  }
  const satellite = make('circle', { class: 'orbital-tracer', r: 3.5, fill: '#d6fbe5' });
  const routes = [
    [51.5, -0.13, 0.12],
    [40.7, -74, 0.26],
    [25.2, 55.3, 0.16],
    [-33.9, 18.4, 0.13],
  ];
  const trajectories = routes.map(([lat, lon, h]) => {
    const target = vector(lat, lon),
      points = Array.from({ length: 45 }, (_, i) => {
        const t = i / 44,
          v = home.map((c, j) => c * (1 - t) + target[j] * t);
        const k = (1 + h * Math.sin(Math.PI * t)) / Math.hypot(...v);
        return v.map((n) => n * k);
      });
    return {
      points,
      curve: make('path', { stroke: '#ace7c9', 'stroke-width': 1.05, opacity: 0.67 }),
      end: make('circle', { r: 2.8, fill: '#c5f9da' }),
    };
  });
  const marker = make('g', { id: 'base-marker' }, svg);
  make(
    'circle',
    { r: 15, fill: '#a8f5cf', 'fill-opacity': 0.1, stroke: '#a8f5cf', 'stroke-opacity': 0.38 },
    marker,
  );
  make('circle', { r: 5.2, fill: '#b6ffdb' }, marker);
  make('path', { d: 'm7 6 23 22h18', stroke: '#b6ffdb', 'stroke-opacity': 0.7 }, marker);
  make(
    'rect',
    {
      x: 48,
      y: 17,
      width: 105,
      height: 23,
      rx: 3,
      fill: '#07130f',
      'fill-opacity': 0.88,
      stroke: '#87bca4',
      'stroke-opacity': 0.45,
    },
    marker,
  );
  make(
    'text',
    {
      x: 100,
      y: 32.5,
      'text-anchor': 'middle',
      fill: '#c8f7d8',
      'font-family': 'monospace',
      'font-size': 12,
      'letter-spacing': 2,
    },
    marker,
  ).textContent = 'BASE : NG';
  function surface(longitude) {
    const basis = globeBasis(longitude);
    for (const { points, curve, end } of trajectories) {
      const projected = points.map((v) => project(v, basis));
      curve.setAttribute('d', path(projected));
      const [x, y, z] = projected.at(-1);
      end.setAttribute('cx', x);
      end.setAttribute('cy', y);
      end.setAttribute('opacity', z > 0 ? 0.9 : 0);
    }
    const [x, y, z] = project(home, basis);
    marker.setAttribute('visibility', z > 0 ? 'visible' : 'hidden');
    marker.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }
  function tracer(time) {
    const [sx, sy, sz] = orbit(2.42 + time * 0.034, 500, -0.31, 0.29);
    satellite.setAttribute('cx', sx);
    satellite.setAttribute('cy', sy);
    satellite.setAttribute('opacity', sz < 0 && Math.hypot(sx - 500, sy - 500) < RADIUS ? 0 : 1);
  }
  return { surface, tracer };
}

export function initEarth() {
  stars();
  const sky = document.querySelector('.universe');
  const scene = sky.querySelector('.earth-scene');
  const canvas = scene.querySelector('canvas');
  const corona = sky.querySelector('.solar-corona');
  const track = sky.querySelector('.solar-track');
  const yearMarker = document.querySelector('.year-marker');
  const routes = overlay(scene);
  const toggles = document.querySelectorAll('[data-orbit-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const opening = solarState(0);
  let paused = reduced.matches,
    visible = false,
    heroLit = false;
  let draw = null,
    attempted = false,
    contextVersion = 0,
    lastState = null;
  let frame = 0,
    elapsed = 0,
    runningSince = null,
    lastPaint = null,
    pixels = 0;
  let materialStartedAt = 0;
  try {
    paused ||= localStorage.getItem('od-motion') === 'paused';
  } catch {}

  function clock(now = performance.now()) {
    return elapsed + (runningSince === null ? 0 : Math.max(0, now - runningSince) / 1000);
  }
  function render(seconds = clock()) {
    // The poster is an exposure of t=0. Don't move the Sun independently of a
    // frozen texture on low-data/no-GPU devices or while maps are still loading.
    const state = draw ? solarState(Math.max(0, seconds - materialStartedAt)) : opening;
    if (draw && pixels) {
      draw(state, pixels);
      scene.classList.add('earth-ready');
    }
    if (state !== lastState) {
      scene.style.setProperty('--travel-x', `${(100 * state.travel[0]).toFixed(4)}%`);
      scene.style.setProperty('--travel-y', `${(100 * state.travel[1]).toFixed(4)}%`);
      track.style.transform = `translate(${(100 * state.emitter.x).toFixed(3)}%, ${(100 * state.emitter.y).toFixed(3)}%)`;
      track.style.opacity = state.emitter.visibility.toFixed(4);
      corona.style.transform = `scale(${state.emitter.scale.toFixed(5)})`;
      if (yearMarker) {
        yearMarker.setAttribute('cx', (27 * state.orbit.x).toFixed(3));
        yearMarker.setAttribute('cy', (-9 * state.orbit.y).toFixed(3));
      }
      routes.surface(state.longitude);
      lastState = state;
    }
    routes.tracer(seconds);
  }
  function tick(now) {
    const interval = 1000 / (heroLit ? 24 : 10);
    if (lastPaint === null || now - lastPaint >= interval) {
      lastPaint = lastPaint === null ? now : now - ((now - lastPaint) % interval);
      render(clock(now));
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    const now = performance.now();
    elapsed = clock(now);
    runningSince = null;
    cancelAnimationFrame(frame);
    frame = 0;
    lastPaint = null;
    render(elapsed);
    if (!paused && visible && !document.hidden) {
      runningSince = now;
      frame = requestAnimationFrame(tick);
    }
    const label = paused ? 'Resume orbital motion' : 'Pause orbital motion';
    for (const button of toggles) {
      button.setAttribute('aria-label', label);
      button.title = label;
      button
        .querySelector('path')
        .setAttribute('d', paused ? 'm7 4 13 8-13 8Z' : 'M8 5v14m8-14v14');
    }
  }
  async function activate() {
    if (attempted || paused || !visible || document.hidden || navigator.connection?.saveData)
      return;
    attempted = true;
    const version = contextVersion;
    try {
      const material = await globe(canvas);
      if (version !== contextVersion) return;
      draw = material;
      materialStartedAt = clock();
      sync();
    } catch {
      /* Leave the already-lit poster in place. */
    }
  }
  function toggleMotion() {
    paused = !paused;
    try {
      localStorage.setItem('od-motion', paused ? 'paused' : 'playing');
    } catch {}
    sync();
    activate();
  }
  for (const button of toggles) {
    button.hidden = false;
    button.addEventListener('click', toggleMotion);
  }
  reduced.addEventListener('change', () => {
    paused = reduced.matches;
    sync();
    activate();
  });
  document.addEventListener('visibilitychange', () => {
    sync();
    activate();
  });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
    activate();
  }).observe(sky);
  const overview = document.getElementById('overview');
  if (overview)
    new IntersectionObserver(
      ([e]) => {
        heroLit = e.intersectionRatio >= 0.45;
        sky.classList.toggle('overview-lit', heroLit);
      },
      { threshold: [0, 0.45] },
    ).observe(overview);
  new ResizeObserver(([entry]) => {
    pixels = Math.min(
      1200,
      Math.round(entry.contentRect.width * Math.min(devicePixelRatio || 1, 1.5)),
    );
    render();
  }).observe(scene);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextVersion++;
    draw = null;
    scene.classList.remove('earth-ready');
    sync();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    attempted = false;
    activate();
  });
  sync();
}
