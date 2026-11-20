// One local, textured GLB. A single depth-tested render is sampled by the globe
// pin and the larger turntable; a stationary portrait needs no animation loop.
const MODEL = new URL('../img/portrait/okwe-bust.glb', import.meta.url);
const vertical = `attribute vec3 point,normal;attribute vec2 uv;uniform vec2 turn,scale;
 varying vec2 tex;varying vec3 N;
 vec3 yaw(vec3 v){return vec3(turn.x*v.x+turn.y*v.z,v.y,-turn.y*v.x+turn.x*v.z);}
 void main(){vec3 p=yaw(point);N=yaw(normal);tex=uv;gl_Position=vec4(p.xy*scale,-.52*p.z,1.);}`;
const fragment = `precision mediump float;varying vec2 tex;varying vec3 N;uniform sampler2D atlas;
 void main(){vec3 n=normalize(N);vec3 ink=texture2D(atlas,tex).rgb;
 float key=max(0.,dot(n,normalize(vec3(-.48,.62,.72))));float rim=pow(1.-max(0.,n.z),3.);
 gl_FragColor=vec4(ink*(.79+.29*key)+rim*vec3(.035,.064,.06),1.);}`;
async function loadPortrait(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    depth: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!gl) throw Error('No portrait renderer');
  const response = await fetch(MODEL);
  if (!response.ok) throw Error('Portrait file unavailable');
  const bin = await response.arrayBuffer(),
    dv = new DataView(bin),
    jl = dv.getUint32(12, true),
    offset = 28 + jl;
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2)
    throw Error('Invalid portrait');
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bin, 20, jl)));
  const prim = doc.meshes[0].primitives[0],
    view = (i) => {
      const v = doc.bufferViews[i];
      return new Uint8Array(bin, offset + (v.byteOffset || 0), v.byteLength);
    };
  const image = new Image(),
    src = URL.createObjectURL(
      new Blob([view(doc.images[0].bufferView)], { type: doc.images[0].mimeType }),
    );
  try {
    image.src = src;
    await image.decode();
  } finally {
    URL.revokeObjectURL(src);
  }
  const prog = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertical],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw Error('Portrait shader');
    gl.attachShader(prog, sh);
    gl.deleteShader(sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error('Portrait program');
  gl.useProgram(prog);
  const pos = doc.accessors[prim.attributes.POSITION];
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, view(pos.bufferView), gl.STATIC_DRAW);
  for (const [name, key, n] of [
    ['point', 'POSITION', 3],
    ['normal', 'NORMAL', 3],
    ['uv', 'TEXCOORD_0', 2],
  ]) {
    const a = doc.accessors[prim.attributes[key]],
      i = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(
      i,
      n,
      gl.FLOAT,
      false,
      doc.bufferViews[a.bufferView].byteStride,
      a.byteOffset || 0,
    );
  }
  const indices = doc.accessors[prim.indices];
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, view(indices.bufferView), gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  const turn = gl.getUniformLocation(prog, 'turn'),
    scale = gl.getUniformLocation(prog, 'scale');
  return (angle, w, h) => {
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(turn, Math.cos(angle), Math.sin(angle));
    gl.uniform2f(scale, (0.96 * h) / w, 0.96);
    gl.drawElements(gl.TRIANGLES, indices.count, indices.componentType, indices.byteOffset || 0);
  };
}
const clamp = (n) => Math.max(-1, Math.min(1, n));
export function portraitStudio() {
  const mini = document.querySelector('.base-bust'),
    stage = document.querySelector('.portrait-stage');
  const controls = document.querySelector('.portrait-controls'),
    range = controls?.querySelector('input'),
    degrees = controls?.querySelector('output'),
    launch = document.querySelector('.portrait-launch');
  const backing = document.createElement('canvas');
  const views = [mini, stage].filter(Boolean).map((el) => {
    const c = el.querySelector('canvas');
    return { el, c, g: c.getContext('2d'), visible: false };
  });
  let draw = null,
    pending = false,
    failed = false,
    auto = false,
    yaw = 0,
    target = 0,
    raf = 0,
    previous = 0,
    gesture = null,
    generation = 0;
  function paint() {
    if (!draw || document.hidden) return;
    const active = views.filter((v) => v.visible && !v.el.hidden && v.g);
    if (!active.length) return;
    const density = Math.min(devicePixelRatio || 1, 2),
      w = Math.min(680, Math.max(2, ...active.map((v) => Math.round(v.el.clientWidth * density)))),
      h = Math.round(w / 0.9);
    draw((yaw * Math.PI) / 180, w, h);
    for (const { el, c, g } of active) {
      const width = Math.max(2, Math.round(el.clientWidth * density)),
        height = Math.round(width / 0.9);
      if (c.width !== width || c.height !== height) {
        c.width = width;
        c.height = height;
      }
      g.clearRect(0, 0, width, height);
      g.drawImage(backing, 0, 0, width, height);
      el.classList.add('model-ready');
    }
    if (range) {
      let a = Math.round(yaw % 360);
      if (a > 180) a -= 360;
      else if (a < -180) a += 360;
      range.value = a;
      degrees.value = `${String(Math.abs(a)).padStart(3, '0')}°${a < 0 ? ' L' : a > 0 ? ' R' : ''}`;
    }
  }
  function step(now) {
    raf = 0;
    if (document.hidden) return;
    const dt = previous ? Math.max(1, Math.min(now - previous, 70)) : 25;
    previous = now;
    const d = target - yaw;
    yaw = Math.abs(d) < 0.18 || !auto ? target : yaw + d * (1 - Math.exp(-dt / 66));
    paint();
    if (yaw !== target) raf = requestAnimationFrame(step);
  }
  function aim(n) {
    target = n;
    if (!raf) {
      previous = 0;
      raf = requestAnimationFrame(step);
    }
  }
  async function enable(manual = false) {
    if (
      draw ||
      pending ||
      failed ||
      document.hidden ||
      (!manual && (!auto || navigator.connection?.saveData || !views.some((v) => v.visible)))
    )
      return;
    pending = true;
    const ticket = generation;
    try {
      const material = await loadPortrait(backing);
      if (ticket !== generation) return;
      draw = material;
      if (controls) controls.hidden = false;
      if (launch) launch.hidden = true;
      paint();
    } catch {
      if (ticket === generation) {
        failed = true;
        if (launch) {
          launch.hidden = false;
          launch.disabled = true;
          launch.textContent = 'Photo view · 3D unavailable';
        }
      }
    } finally {
      if (ticket === generation) pending = false;
    }
  }
  const observe = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const v = views.find((v) => v.el === entry.target);
      v.visible = entry.isIntersecting;
      if (v.el === stage) {
        mini.closest('.universe').classList.toggle('studio-in-view', v.visible);
        if (v.visible && auto) aim(0);
      }
    }
    enable();
    paint();
  });
  const resize = new ResizeObserver(() => paint());
  for (const v of views) {
    observe.observe(v.el);
    resize.observe(v.el);
  }
  launch?.addEventListener('click', () => enable(true));
  range?.addEventListener('input', () => {
    yaw = target = Number(range.value);
    paint();
  });
  controls?.querySelector('button')?.addEventListener('click', () => {
    aim(0);
    range.value = 0;
  });
  const inside = (e, r) =>
    e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  function down(e) {
    if (!draw || !e.isPrimary || e.button !== 0 || e.target.closest?.('a,button,input,dialog'))
      return;
    const host = [...views]
      .reverse()
      .find((v) => v.visible && !v.el.hidden && inside(e, v.el.getBoundingClientRect()));
    if (!host) return;
    gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      from: yaw,
      w: host.el.clientWidth,
      host: host.el,
    };
    if (host.el === stage) stage.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!draw || document.hidden) return;
    if (gesture?.id === e.pointerId) {
      const dx = e.clientX - gesture.x,
        dy = e.clientY - gesture.y;
      if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        gesture = null;
        return;
      }
      aim(gesture.from + (360 * dx) / Math.max(1, gesture.w));
      return;
    }
    if (
      !auto ||
      e.pointerType !== 'mouse' ||
      e.buttons ||
      e.target.closest?.('dialog,.portrait-controls')
    )
      return;
    const about = views.find((v) => v.el === stage && v.visible),
      base = views.find((v) => v.el === mini && v.visible && !mini.hidden);
    if (!base && !about) return;
    if (about && inside(e, stage.getBoundingClientRect())) {
      const r = stage.getBoundingClientRect();
      aim(180 * clamp((2 * (e.clientX - r.left)) / r.width - 1));
    } else if (!about) {
      const r = base.el.getBoundingClientRect(),
        center = r.left + r.width / 2,
        dx = e.clientX - center;
      aim(180 * clamp(dx / Math.max(1, dx < 0 ? center : innerWidth - center)));
    }
  }
  window.addEventListener('pointerdown', down, { passive: true });
  window.addEventListener('pointermove', move, { passive: true });
  const end = (e) => {
    if (gesture?.id === e.pointerId) gesture = null;
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  backing.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    generation++;
    draw = null;
    pending = false;
    for (const v of views) v.el.classList.remove('model-ready');
    if (controls) controls.hidden = true;
    if (launch) launch.hidden = false;
  });
  backing.addEventListener('webglcontextrestored', () => {
    failed = false;
    enable();
  });
  return (playing) => {
    auto = playing;
    if (!playing) {
      cancelAnimationFrame(raf);
      raf = 0;
      target = yaw;
    }
    if (launch && !draw && !failed) launch.hidden = playing && !navigator.connection?.saveData;
    enable();
  };
}
