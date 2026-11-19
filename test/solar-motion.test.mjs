import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_SECONDS,
  YEAR_SECONDS,
  ECCENTRICITY,
  OBLIQUITY,
  ORBIT_NORMAL,
  NORTH,
  EAST,
  EQUATOR,
  EARTH_RADIUS,
  RAD,
  TAU,
  globeBasis,
  orbitAt,
  projectPoint,
  solarState,
} from '../src/solar-motion.js';

const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≉ ${b}`);
const vectorClose = (a, b, tolerance) => a.forEach((n, i) => close(n, b[i], tolerance));

test('orbit has a focus at the Sun, takes equal time for equal swept area, and closes', () => {
  const e = ECCENTRICITY;
  close(orbitAt(0).distance, 1 - e);
  close(orbitAt(Math.PI).distance, 1 + e);
  for (let i = 0; i <= 128; i++) {
    const mean = (i * TAU) / 128,
      { x, y, position, distance } = orbitAt(mean);
    close(Math.hypot(x, y), distance);
    close(Math.hypot(...position), distance);
    close(dot(position, ORBIT_NORMAL), 0);
    const E = Math.atan2(y / Math.sqrt(1 - e * e), x + e);
    const residual = E - e * Math.sin(E) - mean;
    close(Math.atan2(Math.sin(residual), Math.cos(residual)), 0);
    vectorClose(position, orbitAt(mean + TAU).position);
  }
});

test('the tilted axis stays fixed and the geography spins eastward through a whole day', () => {
  close(Math.acos(dot(NORTH, ORBIT_NORMAL)), OBLIQUITY);
  const start = solarState(0).longitude,
    landmark = [Math.cos(start), 0, Math.sin(start)];
  const at = (t) => projectPoint(landmark, globeBasis(solarState(t).longitude));
  vectorClose(at(0), EQUATOR);
  vectorClose(at(DAY_SECONDS / 4), EAST);
  assert.ok(at(DAY_SECONDS / 2)[2] < 0, 'landmark on the far side');
  vectorClose(at(DAY_SECONDS), at(0));
  // Recover lat/lon using the material's inverse projection, including near the date line.
  for (const lon of [-179, -90, 0, 8, 179].map((n) => n * RAD)) {
    const lat = 9 * RAD,
      point = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
    const n = projectPoint(point, globeBasis(start));
    close(Math.asin(dot(n, NORTH)), lat);
    close(Math.cos(start + Math.atan2(dot(n, EAST), dot(n, EQUATOR)) - lon), 1);
  }
});

test('one Sun gives inverse-square illumination and a same-side, Earth-occluded emitter', () => {
  let eclipsed = false,
    visible = false,
    behindCamera = false;
  for (let i = 0; i <= 720; i++) {
    const { orbit, flux, emitter, sun, travel } = solarState((i * YEAR_SECONDS) / 720);
    close(Math.hypot(...sun), 1);
    vectorClose(
      sun.map((n) => -n * orbit.distance),
      orbit.position,
    );
    close(flux * orbit.distance ** 2, 1);
    assert.ok(Math.abs(travel[0]) < 0.1 && Math.abs(travel[1]) < 0.1, 'tracking not a wide pan');
    assert.ok(emitter.visibility >= 0 && emitter.visibility <= 1);
    if (sun[2] >= 0) {
      close(emitter.visibility, 0);
      behindCamera = true;
    } else if (Math.hypot(emitter.x, emitter.y) < EARTH_RADIUS * 0.97) {
      close(emitter.visibility, 0);
      eclipsed = true;
    }
    if (emitter.visibility > 0) {
      close(emitter.x * sun[1] + emitter.y * sun[0], 0); // screen Y points down
      assert.ok(emitter.x * sun[0] - emitter.y * sun[1] > 0);
      visible = true;
    }
  }
  assert.ok(eclipsed && visible && behindCamera);
});

test('independent spin and revolution stay continuous at cycle boundaries, even after many years', () => {
  const home = [1, 0, 0],
    dt = 1e-5;
  const pose = (t) => {
    const s = solarState(t);
    return [
      ...s.travel,
      ...s.sun,
      ...projectPoint(home, globeBasis(s.longitude)),
      s.emitter.x,
      s.emitter.y,
      s.emitter.visibility,
    ];
  };
  for (const seam of [DAY_SECONDS, YEAR_SECONDS, 100_000 * YEAR_SECONDS]) {
    vectorClose(pose(seam - dt), pose(seam + dt), 1e-5);
  }
  const opening = solarState(0),
    oneYear = solarState(YEAR_SECONDS);
  vectorClose(opening.sun, oneYear.sun);
  vectorClose(oneYear.travel, [0, 0]);
});
