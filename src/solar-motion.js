// Camera coordinates: +X right, +Y up, +Z towards the viewer. Distances in the
// orbital model are AU; screen travel is deliberately compressed for a tracking shot.
export const TAU = 2 * Math.PI;
export const RAD = Math.PI / 180;
export const DAY_SECONDS = 56;
export const YEAR_SECONDS = 196;
export const ECCENTRICITY = 0.0167;
export const OBLIQUITY = 23.44 * RAD;
export const EARTH_RADIUS = 0.423; // fraction of the unchanged square canvas
const OPENING_MEAN = -37 * RAD;
const VIEW_LONGITUDE = 17 * RAD;
const TRACK_TRAVEL = 0.045; // camera follows most, but not all, of the revolution
const FOCAL_LENGTH = 0.7; // sky projection, measured in apparent Earth radii
const SUN_RADIUS = 0.023; // exaggerated apparent disc for a legible portfolio-scale exposure
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v) => {
  const n = Math.hypot(...v);
  return v.map((k) => k / n);
};
const combine = (u, a, v, b) => u.map((c, i) => c * a + v[i] * b);
const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Orthogonal axes of a slightly inclined ecliptic as seen from the camera.
const roll = -13 * RAD,
  elevation = 26 * RAD;
const U = [Math.cos(roll), Math.sin(roll), 0];
const V = [
  -Math.sin(roll) * Math.sin(elevation),
  Math.cos(roll) * Math.sin(elevation),
  -Math.cos(elevation),
];
export const ORBIT_NORMAL = cross(U, V);
const tiltTowards = combine(U, Math.cos(168 * RAD), V, Math.sin(168 * RAD));
export const NORTH = combine(ORBIT_NORMAL, Math.cos(OBLIQUITY), tiltTowards, Math.sin(OBLIQUITY));
export const EAST = unit(cross(NORTH, [0, 0, 1]));
export const EQUATOR = cross(EAST, NORTH);

// Solve M = E - e sin(E); the Sun is at a focus, not the centre of the ellipse.
export function orbitAt(mean) {
  let E = mean;
  for (let i = 0; i < 3; i++)
    E -= (E - ECCENTRICITY * Math.sin(E) - mean) / (1 - ECCENTRICITY * Math.cos(E));
  const x = Math.cos(E) - ECCENTRICITY,
    y = Math.sqrt(1 - ECCENTRICITY ** 2) * Math.sin(E);
  return { x, y, position: combine(U, x, V, y), distance: 1 - ECCENTRICITY * Math.cos(E) };
}
const startPosition = orbitAt(OPENING_MEAN).position;

export function solarState(seconds) {
  const orbit = orbitAt(OPENING_MEAN + TAU * ((seconds % YEAR_SECONDS) / YEAR_SECONDS));
  const sun = orbit.position.map((n) => -n / orbit.distance); // one actual direction for ALL lighting
  const longitude = VIEW_LONGITUDE - TAU * ((seconds % DAY_SECONDS) / DAY_SECONDS); // prograde spin
  const travel = [
    (orbit.position[0] - startPosition[0]) * TRACK_TRAVEL,
    -(orbit.position[1] - startPosition[1]) * TRACK_TRAVEL,
  ];
  // A Sun in front of the camera projects along the same vector as the shader's
  // light. Behind the camera it still lights Earth, but cannot produce a visible flare.
  const front = -sun[2];
  const k = FOCAL_LENGTH / Math.max(0.07, front);
  const skyX = sun[0] * k,
    skyY = -sun[1] * k;
  const angularSize = 1 / orbit.distance,
    radius = SUN_RADIUS * angularSize;
  const visibility =
    smoothstep(0.07, 0.14, front) * smoothstep(1 - radius, 1 + radius, Math.hypot(skyX, skyY));
  return {
    orbit,
    longitude,
    sun,
    travel,
    flux: angularSize ** 2,
    emitter: { x: skyX * EARTH_RADIUS, y: skyY * EARTH_RADIUS, scale: angularSize, visibility },
  };
}

// Forward projection for a geographic landmark. The material uses its inverse
// (dot products with this exact basis), so routes cannot drift off the texture.
export function globeBasis(longitude) {
  const c = Math.cos(longitude),
    s = Math.sin(longitude);
  return [combine(EQUATOR, c, EAST, -s), NORTH, combine(EQUATOR, s, EAST, c)];
}
export function projectPoint([x, y, z], basis) {
  return [0, 1, 2].map((i) => x * basis[0][i] + y * basis[1][i] + z * basis[2][i]);
}
