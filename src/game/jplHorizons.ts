import { PLANETARY_CATALOG_SI, type DataProvenance } from './planetaryCatalog';

export interface HorizonsBodyStateSI {
  id: string;
  jplId: string;
  name: string;
  center: 'sun' | 'earth';
  /** Position in Three.js ecliptic-aligned SI meters: x, y (ecliptic North), z */
  posM: { x: number; y: number; z: number };
  /** Velocity in Three.js ecliptic-aligned SI m/s */
  velMs: { x: number; y: number; z: number };
  provenance: DataProvenance;
}

export interface HorizonsEphemerisResponse {
  source: string;
  isLive: boolean;
  provenance: DataProvenance;
  epochUtc: string;
  note: string;
  bodies: Record<string, HorizonsBodyStateSI>;
}

/**
 * Parses NASA JPL Horizons API text output (`CSV_FORMAT='YES'`, `EPHEM_TYPE='VECTORS'`,
 * `VEC_TABLE='2'`, `OUT_UNITS='KM-S'`, `REF_PLANE='ECLIPTIC'`).
 *
 * JPL Horizons ecliptic ICRF coordinates map into Three.js right-handed space as:
 *   Three.X =  JPL.X (vernal equinox)
 *   Three.Y =  JPL.Z (ecliptic north)
 *   Three.Z = -JPL.Y (preserves right-handedness and counter-clockwise prograde orbit from +Y)
 */
export function parseHorizonsVectorCsv(rawText: string): {
  posM: { x: number; y: number; z: number };
  velMs: { x: number; y: number; z: number };
} | null {
  const soeIdx = rawText.indexOf('$$SOE');
  const eoeIdx = rawText.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1 || eoeIdx <= soeIdx) return null;

  const block = rawText.slice(soeIdx + 5, eoeIdx).trim();
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  // CSV format: JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ, ...
  const cols = lines[0].split(',').map((c) => c.trim());
  if (cols.length < 8) return null;

  const xKm = Number(cols[2]);
  const yKm = Number(cols[3]);
  const zKm = Number(cols[4]);
  const vxKmS = Number(cols[5]);
  const vyKmS = Number(cols[6]);
  const vzKmS = Number(cols[7]);

  if (![xKm, yKm, zKm, vxKmS, vyKmS, vzKmS].every((n) => Number.isFinite(n))) {
    return null;
  }

  return {
    posM: {
      x: xKm * 1000,
      y: zKm * 1000,
      z: -yKm * 1000,
    },
    velMs: {
      x: vxKmS * 1000,
      y: vzKmS * 1000,
      z: -vyKmS * 1000,
    },
  };
}

export function buildHorizonsUrlForCommand(command: string, center: string, dateUtcIso: string): string {
  const start = dateUtcIso.slice(0, 10);
  const startDt = new Date(`${start}T00:00:00Z`);
  const stopDt = new Date(startDt.getTime() + 86_400_000);
  const stop = stopDt.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${center}'`,
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    OUT_UNITS: "'KM-S'",
    VEC_TABLE: "'2'",
    CSV_FORMAT: "'YES'",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: "'1 d'",
  });
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
}

export const HORIZONS_TRACKED_BODIES: ReadonlyArray<{
  id: string;
  command: string;
  center: 'sun' | 'earth';
  horizonsCenter: string;
}> = [
  { id: 'mercury', command: '199', center: 'sun', horizonsCenter: '@sun' },
  { id: 'venus', command: '299', center: 'sun', horizonsCenter: '@sun' },
  { id: 'earth', command: '399', center: 'sun', horizonsCenter: '@sun' },
  { id: 'moon', command: '301', center: 'earth', horizonsCenter: '500@399' },
  { id: 'mars', command: '499', center: 'sun', horizonsCenter: '@sun' },
  { id: 'ceres', command: '2000001', center: 'sun', horizonsCenter: '@sun' },
  { id: 'jupiter', command: '599', center: 'sun', horizonsCenter: '@sun' },
  { id: 'saturn', command: '699', center: 'sun', horizonsCenter: '@sun' },
  { id: 'uranus', command: '799', center: 'sun', horizonsCenter: '@sun' },
  { id: 'neptune', command: '899', center: 'sun', horizonsCenter: '@sun' },
  { id: 'pluto', command: '999', center: 'sun', horizonsCenter: '@sun' },
];

export function buildCatalogFallbackEntry(id: string): HorizonsBodyStateSI | null {
  const entry = PLANETARY_CATALOG_SI[id];
  if (!entry) return null;
  return {
    id,
    jplId: entry.jplId,
    name: entry.name,
    center: entry.parentBodyId === 'earth' ? 'earth' : 'sun',
    posM: { x: 0, y: 0, z: 0 },
    velMs: { x: 0, y: 0, z: 0 },
    provenance: 'SCIENTIFIC MODEL',
  };
}
