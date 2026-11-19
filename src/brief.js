import { initEarth } from './earth.js';
import './print.js';

// The web brief shares the backdrop; the print stylesheet removes it from the PDF.
try {
  initEarth();
} catch {
  // The embedded Earth poster and the printable content need no canvas support.
}
