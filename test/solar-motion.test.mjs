import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_SECONDS,
  YEAR_SECONDS,
  SOLAR_ROTATION_DAYS,
  EARTH_RADIUS,
  ECCENTRICITY,
  RAD,
  TAU,
  cameraAt,
  solarState,
  ephemeris,
  orbitAt,
  globeBasis,
  projectPoint,
} from '../src/solar-motion.js';
const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const near = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b} ± ${e}`);
const unit = (lat, lon) => [
  Math.cos(lat) * Math.cos(lon),
  Math.sin(lat),
  Math.cos(lat) * Math.sin(lon),
];
const noon = Date.UTC(2026, 2, 20, 12),
  h = 3600000,
  cam = cameraAt(noon);
const altitudeCos = (ms, c) => {
  const s = solarState(ms, c);
  return dot(s.sun, projectPoint(unit(9 * RAD, 8 * RAD), globeBasis(s.longitude)));
};

test('a 1× sidereal spin is eastward, continuous, and takes 23 h 56 min, not a visit-length cycle', () => {
  const a = solarState(noon, cam),
    b = solarState(noon + h, cam);
  near(norm(a.longitude - b.longitude) / RAD, 15.04107, 0.0001);
  near(norm(solarState(noon + DAY_SECONDS * 1000, cam).longitude - a.longitude), 0, 1e-7);
  const p = unit(9 * RAD, 8 * RAD);
  assert.ok(projectPoint(p, globeBasis(a.longitude))[2] > 0.95);
  assert.ok(
    projectPoint(p, globeBasis(solarState(noon + DAY_SECONDS * 500, cam).longitude))[2] < -0.95,
  );
  for (const dt of [0, 30, 204]) {
    const t = noon + dt * 864e5;
    const s0 = solarState(t, cam),
      s1 = solarState(t + 1000, cam);
    near(norm(s1.longitude - s0.longitude), -TAU / DAY_SECONDS, 1e-8);
  }
});
test('UTC gives the equinox/solstice seasons and real daylight in Nigeria, independently of framing', () => {
  const equinox = ephemeris(Date.UTC(2025, 2, 20, 9, 1));
  near(equinox.declination / RAD, 0, 0.1);
  near(equinox.subsolarLongitude / RAD, 46.6, 0.25);
  near(ephemeris(Date.UTC(2026, 5, 21, 12)).declination / RAD, 23.44, 0.04);
  near(ephemeris(Date.UTC(2026, 11, 21, 12)).declination / RAD, -23.44, 0.04);
  for (const camera of [cam, cameraAt(noon + 8 * h), cameraAt(noon + 150 * 24 * h)]) {
    assert.ok(altitudeCos(noon, camera) > 0.96);
    assert.ok(altitudeCos(noon + 12 * h, camera) < -0.96);
    near(altitudeCos(noon + 2 * h, camera), altitudeCos(noon + 2 * h, cam));
  }
});
test('solar direction advances about a degree per day; eccentric orbit, flux and occultation agree', () => {
  near(orbitAt(0).distance, 1 - ECCENTRICITY);
  near(orbitAt(Math.PI).distance, 1 + ECCENTRICITY);
  const s = solarState(noon, cam);
  const daily = Math.acos(dot(s.sun, solarState(noon + 24 * h, cam).sun)) / RAD;
  assert.ok(daily > 0.95 && daily < 1.03);
  const next = solarState(noon + YEAR_SECONDS * 1000, cam);
  near(next.orbit.distance, s.orbit.distance, 1e-7);
  assert.ok(dot(next.sun, s.sun) > 0.9999);
  let transit = false,
    seen = false,
    out = false;
  for (let d = 0; d < 366; d++) {
    const { sun, emitter, orbit, flux } = solarState(noon + d * 864e5, cam);
    near(Math.hypot(...sun), 1);
    near(flux * orbit.distance ** 2, 1);
    near(orbit.distance, Math.hypot(orbit.x, orbit.y));
    if (sun[2] >= 0) {
      near(emitter.visibility, 0);
      out = true;
    } else if (Math.hypot(emitter.x, emitter.y) < 0.97 * EARTH_RADIUS) {
      near(emitter.visibility, 0);
      transit = true;
    }
    if (emitter.visibility > 0.1) {
      near(emitter.x * sun[1] + emitter.y * sun[0], 0);
      seen = true;
    }
  }
  assert.ok(transit && out && seen);
});
test('the photosphere follows mean Carrington phase, not the frame rate or terrestrial day', () => {
  const phase = (t) => solarState(t, cam).solarLongitude;
  near(norm(phase(noon + 864e5) - phase(noon)), -TAU / SOLAR_ROTATION_DAYS);
  near(norm(phase(noon + SOLAR_ROTATION_DAYS * 864e5) - phase(noon)), 0);
});
