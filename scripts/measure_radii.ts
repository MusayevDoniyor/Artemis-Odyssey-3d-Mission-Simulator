import { getBodyVisualRadiusUnits } from '../src/game/orbitalMechanics';
import { PLANETARY_CATALOG_SI } from '../src/game/planetaryCatalog';

const bodies = ['sun', 'jupiter', 'earth', 'moon'];
console.log('=== Volumetric Mean Radii & Measured Visual Units ===');
for (const b of bodies) {
  const si = PLANETARY_CATALOG_SI[b];
  const rSci = getBodyVisualRadiusUnits(b, 'scientific');
  const rExp = getBodyVisualRadiusUnits(b, 'exploration');
  console.log(b.padEnd(8), 'SI (m):', (si.volumetricMeanRadiusM).toLocaleString().padStart(12), 'Scientific (u):', rSci.toFixed(4).padStart(8), 'Exploration (u):', rExp.toFixed(4).padStart(8));
}

const rSunExp = getBodyVisualRadiusUnits('sun', 'exploration');
const rJupExp = getBodyVisualRadiusUnits('jupiter', 'exploration');
const rEarthExp = getBodyVisualRadiusUnits('earth', 'exploration');
const rMoonExp = getBodyVisualRadiusUnits('moon', 'exploration');

console.log('\n--- Ratios in Exploration / Educational Mode ---');
console.log('Sun / Jupiter:  ', (rSunExp / rJupExp).toFixed(4), '(Expected: ~9.95)');
console.log('Sun / Earth:    ', (rSunExp / rEarthExp).toFixed(4), '(Expected: ~109.2)');
console.log('Jupiter / Earth:', (rJupExp / rEarthExp).toFixed(4), '(Expected: ~10.97)');
console.log('Moon / Earth:   ', (rMoonExp / rEarthExp).toFixed(4), '(Expected: ~0.272)');

const rSunSci = getBodyVisualRadiusUnits('sun', 'scientific');
const rJupSci = getBodyVisualRadiusUnits('jupiter', 'scientific');
const rEarthSci = getBodyVisualRadiusUnits('earth', 'scientific');
const rMoonSci = getBodyVisualRadiusUnits('moon', 'scientific');

console.log('\n--- Ratios in Scientific Mode ---');
console.log('Sun / Jupiter:  ', (rSunSci / rJupSci).toFixed(4), '(Expected: ~9.95)');
console.log('Sun / Earth:    ', (rSunSci / rEarthSci).toFixed(4), '(Expected: ~109.2)');
console.log('Jupiter / Earth:', (rJupSci / rEarthSci).toFixed(4), '(Expected: ~10.97)');
console.log('Moon / Earth:   ', (rMoonSci / rEarthSci).toFixed(4), '(Expected: ~0.272)');
