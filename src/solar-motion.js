// Low-precision, geocentric solar ephemeris. UTC is a sufficient approximation to
// UT1 here. Angles are radians, distances AU, public timestamps Unix milliseconds.
export const TAU = 2 * Math.PI,
  RAD = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12),
  MS_DAY = 86_400_000;
export const DAY_SECONDS = 86_164.0905; // sidereal rotation; NOT the 24 h mean solar day
export const YEAR_SECONDS = 365.259636 * 86_400; // anomalistic year (perihelion to perihelion)
export const SOLAR_ROTATION_DAYS = 27.2753; // mean synodic Carrington period, as seen from Earth
export const EARTH_RADIUS = 0.423,
  ECCENTRICITY = 0.0167;
export const POSTER_UTC = Date.UTC(2026, 2, 20, 19, 10); // labelled reference, never advertised as live
const VIEW_LON = 18 * RAD,
  VIEW_LAT = 4 * RAD,
  ROLL = -11 * RAD;
export const NORTH = [
  Math.sin(ROLL) * Math.cos(VIEW_LAT),
  Math.cos(ROLL) * Math.cos(VIEW_LAT),
  Math.sin(VIEW_LAT),
];
export const EAST = [Math.cos(ROLL), -Math.sin(ROLL), 0];
export const EQUATOR = [
  -Math.sin(ROLL) * Math.sin(VIEW_LAT),
  -Math.cos(ROLL) * Math.sin(VIEW_LAT),
  Math.cos(VIEW_LAT),
];
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const combine = (u, a, v, b) => u.map((c, i) => c * a + v[i] * b);
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const days = (ms) => (ms - J2000) / MS_DAY;
const sidereal = (d) => ((280.46061837 + ((360 * 86400) / DAY_SECONDS) * d) % 360) * RAD;

export function orbitAt(mean) {
  let E = mean;
  for (let i = 0; i < 3; i++)
    E -= (E - ECCENTRICITY * Math.sin(E) - mean) / (1 - ECCENTRICITY * Math.cos(E));
  return {
    x: Math.cos(E) - ECCENTRICITY,
    y: Math.sqrt(1 - ECCENTRICITY ** 2) * Math.sin(E),
    distance: 1 - ECCENTRICITY * Math.cos(E),
  };
}
export function ephemeris(ms) {
  const d = days(ms),
    M = ((357.52911 + ((360 * 86400) / YEAR_SECONDS) * d) % 360) * RAD;
  const orbit = orbitAt(M);
  const lambda = Math.atan2(orbit.y, orbit.x) + (282.93735 + 0.00004708 * d) * RAD;
  const tilt = (23.43929 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(tilt) * Math.sin(lambda), Math.cos(lambda));
  const declination = Math.asin(Math.sin(tilt) * Math.sin(lambda));
  return {
    orbit,
    ra,
    declination,
    greenwich: sidereal(d),
    subsolarLongitude: wrap(ra - sidereal(d)),
  };
}
function cameraSun({ ra, declination }, meridian) {
  const h = ra - meridian,
    c = Math.cos(declination);
  return projectPoint(
    [c * Math.cos(h), Math.sin(declination), c * Math.sin(h)],
    [EQUATOR, NORTH, EAST],
  );
}
// Frame Nigeria when the camera opens; then hold that inertial heading. Reframing
// never changes the Sun's geographic longitude, latitude, or a location's daylight.
export function cameraAt(ms) {
  const start = ephemeris(ms),
    meridian = start.greenwich + VIEW_LON;
  return { meridian, origin: cameraSun(start, meridian).map((n) => -n * start.orbit.distance) };
}
export function solarState(ms, camera) {
  const e = ephemeris(ms),
    { orbit } = e,
    sun = cameraSun(e, camera.meridian);
  const position = sun.map((n) => -n * orbit.distance),
    angularSize = 1 / orbit.distance;
  const front = -sun[2],
    k = 0.7 / Math.max(0.07, front),
    x = sun[0] * k,
    y = -sun[1] * k,
    r = 0.023 * angularSize;
  return {
    orbit,
    solarLongitude: wrap(-TAU * (((days(ms) + 2451545 - 2398167.4) / SOLAR_ROTATION_DAYS) % 1)),
    longitude: wrap(camera.meridian - e.greenwich),
    sun,
    flux: angularSize ** 2,
    travel: [0.045 * (position[0] - camera.origin[0]), -0.045 * (position[1] - camera.origin[1])],
    emitter: {
      x: x * EARTH_RADIUS,
      y: y * EARTH_RADIUS,
      scale: angularSize,
      visibility: smooth(0.07, 0.14, front) * smooth(1 - r, 1 + r, Math.hypot(x, y)),
    },
  };
}
export function globeBasis(longitude) {
  const c = Math.cos(longitude),
    s = Math.sin(longitude);
  return [combine(EQUATOR, c, EAST, -s), NORTH, combine(EQUATOR, s, EAST, c)];
}
export function projectPoint([x, y, z], basis) {
  return [0, 1, 2].map((i) => x * basis[0][i] + y * basis[1][i] + z * basis[2][i]);
}
