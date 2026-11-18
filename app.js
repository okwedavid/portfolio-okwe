import * as THREE from 'three';

const canvas = document.querySelector('#earth-canvas');
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function makeEarthTexture() {
  const map = document.createElement('canvas');
  map.width = 1200;
  map.height = 600;
  const ctx = map.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, map.height);
  ocean.addColorStop(0, '#152a68');
  ocean.addColorStop(.48, '#183a83');
  ocean.addColorStop(1, '#101b50');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, map.width, map.height);

  // Soft latitude and longitude lines give the globe a quiet cartographic texture.
  ctx.strokeStyle = 'rgba(182,183,255,.15)';
  ctx.lineWidth = 1;
  for (let y = 45; y < map.height; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(map.width, y); ctx.stroke();
  }
  for (let x = 30; x < map.width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, map.height); ctx.stroke();
  }

  const land = '#408d83';
  const edge = 'rgba(188,235,195,.55)';
  const continents = [
    [[.04,.19],[.09,.12],[.17,.13],[.2,.2],[.25,.22],[.28,.32],[.25,.39],[.21,.42],[.2,.5],[.15,.52],[.12,.46],[.08,.45],[.06,.34]],
    [[.23,.48],[.28,.45],[.31,.51],[.3,.61],[.33,.68],[.3,.78],[.27,.88],[.24,.82],[.22,.7],[.2,.61]],
    [[.42,.22],[.47,.18],[.51,.2],[.54,.26],[.52,.31],[.49,.32],[.47,.29],[.44,.31],[.41,.27]],
    [[.46,.32],[.52,.3],[.56,.35],[.57,.45],[.55,.55],[.53,.65],[.49,.73],[.46,.67],[.45,.55],[.43,.45]],
    [[.53,.19],[.6,.13],[.69,.14],[.76,.18],[.81,.23],[.88,.26],[.9,.34],[.86,.38],[.79,.35],[.75,.43],[.69,.41],[.64,.36],[.59,.37],[.55,.31]],
    [[.72,.53],[.78,.5],[.83,.53],[.84,.59],[.8,.64],[.76,.62]],
    [[.87,.68],[.92,.65],[.96,.71],[.95,.78],[.91,.8],[.88,.76]]
  ];
  for (const points of continents) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x * map.width, y * map.height) : ctx.moveTo(x * map.width, y * map.height));
    ctx.closePath();
    ctx.fillStyle = land;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Small island groups add texture without loading any external map assets.
  ctx.fillStyle = 'rgba(88,168,145,.9)';
  [[.57,.43],[.59,.46],[.61,.45],[.66,.48],[.68,.5],[.73,.46],[.35,.39],[.37,.41],[.69,.68],[.7,.7]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.ellipse(x*map.width,y*map.height,7,4,0,0,Math.PI*2); ctx.fill();
  });
  const texture = new THREE.CanvasTexture(map);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createEarthScene() {
  if (!canvas || !window.WebGLRenderingContext) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    canvas.classList.add('canvas-fallback');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x050816, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 100);
  camera.position.z = 7.4;

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);
  const earthMaterial = new THREE.MeshPhongMaterial({ map: makeEarthTexture(), shininess: 18, specular: new THREE.Color('#8586aa'), emissive: new THREE.Color('#17234a'), emissiveIntensity: .28 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1.72, 96, 64), earthMaterial);
  earthGroup.add(globe);
  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  const loadPlanetTexture = (url, ready, colorTexture = true) => textureLoader.load(url, texture => {
    if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    ready(texture);
  }, undefined, () => {});
  const planetTextureRoot = 'https://threejs.org/examples/textures/planets/';
  loadPlanetTexture(`${planetTextureRoot}earth_atmos_2048.jpg`, texture => { earthMaterial.map = texture; earthMaterial.needsUpdate = true; });
  loadPlanetTexture(`${planetTextureRoot}earth_normal_2048.jpg`, texture => { earthMaterial.bumpMap = texture; earthMaterial.bumpScale = .025; earthMaterial.needsUpdate = true; }, false);
  loadPlanetTexture(`${planetTextureRoot}earth_specular_2048.jpg`, texture => { earthMaterial.specularMap = texture; earthMaterial.needsUpdate = true; }, false);
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.745, 72, 56),
    new THREE.MeshPhongMaterial({ color: '#d9dcff', transparent: true, opacity: .2, depthWrite: false, side: THREE.FrontSide })
  );
  earthGroup.add(clouds);
  loadPlanetTexture(`${planetTextureRoot}earth_clouds_1024.png`, texture => { clouds.material.map = texture; clouds.material.needsUpdate = true; });
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.82, 64, 48),
    new THREE.MeshBasicMaterial({ color: '#8757e8', transparent: true, opacity: .17, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  earthGroup.add(atmosphere);

  const grid = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(1.727, 24, 16)),
    new THREE.LineBasicMaterial({ color: '#c6d8ff', transparent: true, opacity: .055 })
  );
  earthGroup.add(grid);

  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(2.17, .005, 5, 180),
    new THREE.MeshBasicMaterial({ color: '#a26aff', transparent: true, opacity: .38 })
  );
  orbit.rotation.set(.7, .18, -.48);
  earthGroup.add(orbit);
  scene.add(new THREE.AmbientLight('#bdcaff', 1.55));
  const sun = new THREE.DirectionalLight('#e4c6ff', 2.1);
  sun.position.set(-4, 3, 6);
  scene.add(sun);

  const starPositions = [];
  for (let i = 0; i < 650; i++) {
    starPositions.push((Math.random() - .5) * 26, (Math.random() - .5) * 16, -3 - Math.random() * 9);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#b9a9ef', size: .018, transparent: true, opacity: .62, sizeAttenuation: true }));
  scene.add(stars);

  const pointer = new THREE.Vector2();
  addEventListener('pointermove', event => {
    pointer.x = (event.clientX / innerWidth - .5) * 2;
    pointer.y = (event.clientY / innerHeight - .5) * 2;
  }, { passive: true });
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    earthGroup.position.set(innerWidth < 650 ? .55 : innerWidth < 1000 ? 1.05 : 1.82, innerWidth < 650 ? .6 : .12, 0);
    earthGroup.scale.setScalar(innerWidth < 650 ? .76 : innerWidth < 1000 ? .9 : 1);
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  let frame = 0;
  function render() {
    if (document.hidden) return;
    frame += 1;
    if (!prefersReducedMotion.matches) earthGroup.rotation.y += .0018;
    earthGroup.rotation.x += ((-.045 + pointer.y * .035) - earthGroup.rotation.x) * .012;
    earthGroup.rotation.y += ((pointer.x * .045) - (earthGroup.rotation.y % (Math.PI * 2))) * .003;
    stars.rotation.z = pointer.x * .008;
    renderer.render(scene, camera);
    if (!prefersReducedMotion.matches) requestAnimationFrame(render);
  }
  render();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(render); });
  prefersReducedMotion.addEventListener?.('change', () => requestAnimationFrame(render));
}
createEarthScene();
