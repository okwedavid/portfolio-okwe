// Orthographic Earth, rendered from local day/night maps. No globe library or network tiles.
const DAY = new URL('../img/earth/day.webp', import.meta.url);
const NIGHT = new URL('../img/earth/night.webp', import.meta.url);
const RAD = Math.PI / 180;
const LAT = 17 * RAD;
const RADIUS = 423;
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
  function project([x, y, z], lon) {
    const depth = x * Math.cos(lon) + z * Math.sin(lon);
    return [
      500 + RADIUS * (z * Math.cos(lon) - x * Math.sin(lon)),
      500 - RADIUS * (y * Math.cos(LAT) - depth * Math.sin(LAT)),
      y * Math.sin(LAT) + depth * Math.cos(LAT),
    ];
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
  return (longitude, time) => {
    for (const { points, curve, end } of trajectories) {
      const projected = points.map((v) => project(v, longitude));
      curve.setAttribute('d', path(projected));
      const [x, y, z] = projected.at(-1);
      end.setAttribute('cx', x);
      end.setAttribute('cy', y);
      end.setAttribute('opacity', z > 0 ? 0.9 : 0);
    }
    const [x, y] = project(home, longitude);
    marker.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const [sx, sy, sz] = orbit(2.42 + time * 0.034, 500, -0.31, 0.29);
    satellite.setAttribute('cx', sx);
    satellite.setAttribute('cy', sy);
    satellite.setAttribute('opacity', sz < 0 && Math.hypot(sx - 500, sy - 500) < RADIUS ? 0 : 1);
  };
}

async function globe(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  });
  if (!gl) throw new Error('Static Earth fallback');
  const vertex = `attribute vec2 position;varying vec2 p;void main(){p=position / .846;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;varying vec2 p;uniform float longitude;uniform sampler2D dayMap,nightMap;
  void main(){float r=length(p);if(r>1.19){gl_FragColor=vec4(0.);return;}
    if(r>1.){float h=r-1.;float a=(exp(-h*115.)*.84+exp(-h*24.)*.12)*clamp(.45+.65*dot(p,vec2(-.52,.82)),.06,1.);gl_FragColor=vec4(.4,.66,.84,a);return;}
    float z=sqrt(max(0.,1.-dot(p,p)));vec3 n=vec3(p,z);float lat0=.296705973;
    vec2 uv=vec2(fract((longitude+atan(p.x,z*cos(lat0)-p.y*sin(lat0)))/6.2831853+.5),.5-asin(clamp(p.y*cos(lat0)+z*sin(lat0),-1.,1.))/3.14159265);
    vec3 day=texture2D(dayMap,uv).rgb,night=texture2D(nightMap,uv).rgb;float lum=dot(day,vec3(.23,.59,.18));float d=dot(n,normalize(vec3(-.52,.82,-.24)));
    vec3 color=mix(day,vec3(lum),.49)*vec3(.76,.91,.99)*(.19+.86*pow(max(0.,d),.68))+vec3(.008,.018,.029);
    color+=pow(max(0.,night.r-.45*night.b),.84)*vec3(1.5,1.11,.61)*(1.-clamp((d+.18)/.45,0.,1.));
    color+=pow(1.-z,3.3)*(.14+1.02*max(0.,d))*vec3(.36,.69,.92);gl_FragColor=vec4(color,1.);}`;
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Static Earth fallback');
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Static Earth fallback');
  gl.useProgram(program);
  const pos = gl.getAttribLocation(program, 'position');
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  await Promise.all(
    [
      [DAY, 'dayMap'],
      [NIGHT, 'nightMap'],
    ].map(async ([url, name], i) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(gl.getUniformLocation(program, name), i);
    }),
  );
  const longitude = gl.getUniformLocation(program, 'longitude');
  return (lon) => {
    const size = Math.min(
      1200,
      Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 1.5)),
    );
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
      gl.viewport(0, 0, size, size);
    }
    gl.uniform1f(longitude, lon);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

export function initEarth() {
  stars();
  const sky = document.querySelector('.universe');
  const scene = sky.querySelector('.earth-scene'),
    canvas = scene.querySelector('canvas'),
    drawRoutes = overlay(scene),
    toggles = document.querySelectorAll('[data-orbit-toggle]');
  let heroLit = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches,
    visible = false,
    draw = null,
    attempted = false,
    frame = 0,
    last = 0,
    time = 0;
  try {
    paused = reduced.matches || localStorage.getItem('od-motion') === 'paused';
  } catch {}
  function render() {
    const lon = (17 + (draw ? 10 * Math.sin(time * 0.018) : 0)) * RAD;
    if (draw) {
      draw(lon);
      scene.classList.add('earth-ready');
    }
    drawRoutes(lon, time);
  }
  function tick(now) {
    // The quieter reading view keeps moving at a lower frame budget.
    if (now - last >= 1000 / (heroLit ? 15 : 8)) {
      time += last ? Math.min((now - last) / 1000, 0.15) : 0;
      last = now;
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    render();
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
    const label = paused ? 'Resume orbital motion' : 'Pause orbital motion';
    for (const toggle of toggles) {
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
      toggle
        .querySelector('path')
        .setAttribute('d', paused ? 'm7 4 13 8-13 8Z' : 'M8 5v14m8-14v14');
    }
  }
  async function activate() {
    if (attempted || paused || !visible || document.hidden || navigator.connection?.saveData)
      return;
    attempted = true;
    try {
      draw = await globe(canvas);
    } catch {
      draw = null;
    }
    sync();
  }
  function toggleMotion() {
    paused = !paused;
    try {
      localStorage.setItem('od-motion', paused ? 'paused' : 'playing');
    } catch {}
    sync();
    activate();
  }
  for (const toggle of toggles) {
    toggle.hidden = false;
    toggle.addEventListener('click', toggleMotion);
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
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
    activate();
  }).observe(sky);
  // The hero sets the exposure, not the lifetime of the page-wide renderer.
  const overview = document.getElementById('overview');
  if (overview)
    new IntersectionObserver(
      ([entry]) => {
        heroLit = entry.intersectionRatio >= 0.45;
        sky.classList.toggle('overview-lit', heroLit);
      },
      { threshold: [0, 0.45] },
    ).observe(overview);
  new ResizeObserver(render).observe(scene);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
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
