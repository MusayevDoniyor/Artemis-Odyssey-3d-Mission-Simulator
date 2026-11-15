import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import {
  HORIZONS_TRACKED_BODIES,
  type HorizonsBodyStateSI,
  type HorizonsEphemerisResponse,
  buildHorizonsUrlForCommand,
  parseHorizonsVectorCsv,
} from './src/game/jplHorizons';
import { PLANETARY_CATALOG_SI, SI } from './src/game/planetaryCatalog';
import { computeBodyCartesianSI } from './src/game/orbitalMechanics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

function resolveServerPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }

  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort > 0) {
    // Container proxy (nginx) binds 8080 in AI Studio dev; Vite/Express dev server must listen on 3000.
    if (!isProduction && envPort === 8080) {
      return 3000;
    }
    return envPort;
  }

  return 3000;
}

const PORT = resolveServerPort();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 6-hour in-memory caches for NASA DONKI & OSDR, 12-hour cache for JPL Horizons vectors
let donkiCache: { expiresAt: number; payload: unknown } | null = null;
let osdrCache: { expiresAt: number; payload: unknown } | null = null;
let horizonsCache: { expiresAt: number; payload: HorizonsEphemerisResponse } | null = null;

const CURATED_OSDR_STUDIES = [
  {
    accession: 'OSD-569',
    title: 'Artemis I MARE (Helga & Zohar) Anthropomorphic Phantom Radiation Dosimetry',
    organism: 'Human Phantom + Active/Passive Dosimeters',
    radiationType: 'GCR & Solar Particle Event (SPE)',
    doseThresholdMsv: 150,
    shieldingAttenuationPct: 48,
    keyFinding:
      'Polyethylene/water-equivalent vest & Orion service mass reduce blood-forming organ SPE dose by ~48%.',
    gameplayRule:
      'Orienting water/propellant tanks toward solar flares cuts orbital & outpost radiation dose nearly in half.',
    uri: 'https://osdr.nasa.gov/bio/repo/',
  },
  {
    accession: 'OSD-612',
    title: 'BioSentinel Deep-Space Yeast DNA Double-Strand Break Repair in Lunar Flyby',
    organism: 'Saccharomyces cerevisiae',
    radiationType: 'Deep-Space High-LET Ions (Outside Van Allen Belt)',
    doseThresholdMsv: 120,
    shieldingAttenuationPct: 35,
    keyFinding:
      'Outside Earth’s magnetosphere, unshielded cells accumulate double-strand DNA breaks during Solar Particle Events.',
    gameplayRule:
      'Deploy Gateway HERMES/ERSA warning early or boost magnetic/polyethylene shielding before SPE arrival.',
    uri: 'https://osdr.nasa.gov/bio/repo/',
  },
  {
    accession: 'OSD-489',
    title: 'Lunar Regolith Simulant & Sintered Berm Radiation Attenuation Modeling',
    organism: 'Biological Cell Models & Shield Phantoms',
    radiationType: 'Secondary Neutron & Proton Scatter',
    doseThresholdMsv: 180,
    shieldingAttenuationPct: 62,
    keyFinding:
      'Packing 1.5 m+ of compacted lunar regolith over habitats blocks primary SPE protons while minimizing secondary neutron albedo.',
    gameplayRule:
      'Survey Anorthosite/Nobile regolith quarries to unlock +62% habitat storm berm attenuation.',
    uri: 'https://osdr.nasa.gov/bio/repo/',
  },
  {
    accession: 'OSD-366',
    title: 'Mars Surface Cosmic-Ray Dose Profile & CO₂ / Dust Shielding Effects (MSL-RAD)',
    organism: 'Microbial & Mammalian Analog Models',
    radiationType: 'Galactic Cosmic Rays (0.67 mSv/day nominal, spikes during SPE)',
    doseThresholdMsv: 210,
    shieldingAttenuationPct: 30,
    keyFinding:
      'Mars’ thin CO₂ atmosphere absorbs low-energy particles, but Jezero dust storms sharply cut solar power (~35%).',
    gameplayRule:
      'Keep Jezero MOXIE power reserves above 35% and park in rover shelter bays during high-flux flares.',
    uri: 'https://osdr.nasa.gov/bio/repo/',
  },
];

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Live NASA DONKI Space Weather API Proxy (FLR + CME + GST unified report)
  app.get('/api/donki', async (_req, res) => {
    if (donkiCache && Date.now() < donkiCache.expiresAt) {
      return res.json(donkiCache.payload);
    }

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

    try {
      const [flrRes, cmeRes, gstRes] = await Promise.all([
        fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`, {
          signal: AbortSignal.timeout(6500),
        }),
        fetch(`https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`, {
          signal: AbortSignal.timeout(6500),
        }).catch(() => null),
        fetch(`https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`, {
          signal: AbortSignal.timeout(6500),
        }).catch(() => null),
      ]);

      if (!flrRes.ok) throw new Error(`DONKI HTTP ${flrRes.status}`);
      const flrData = (await flrRes.json()) as Array<{
        classType?: string;
        beginTime?: string;
        sourceLocation?: string;
        link?: string;
      }>;
      const cmeData = cmeRes?.ok ? ((await cmeRes.json()) as Array<{ startTime?: string; note?: string }>) : [];
      const gstData = gstRes?.ok ? ((await gstRes.json()) as Array<{ startTime?: string; allKpIndex?: Array<{ kpIndex?: number }> }>) : [];

      const flrCount = Array.isArray(flrData) ? flrData.length : 0;
      const cmeCount = Array.isArray(cmeData) ? cmeData.length : 0;
      const gstCount = Array.isArray(gstData) ? gstData.length : 0;

      let payload;
      if (flrCount > 0) {
        const latest = flrData.reduce((a, b) => ((b.beginTime || '') > (a.beginTime || '') ? b : a), flrData[0]);
        payload = {
          isLive: true,
          status: 'live',
          classType: latest.classType || 'C-Class',
          beginTime: latest.beginTime || endDate,
          sourceLocation: latest.sourceLocation || 'Solar Disk',
          link: latest.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          totalEvents30d: flrCount,
          cmeCount30d: cmeCount,
          gstCount30d: gstCount,
          description: `NASA DONKI live 30-day scan: ${flrCount} Flares (latest ${latest.classType || 'Solar'}), ${cmeCount} CMEs, ${gstCount} Geomagnetic Storms.`,
        };
      } else {
        payload = {
          isLive: true,
          status: 'quiet',
          classType: 'Quiet Sun',
          beginTime: endDate,
          sourceLocation: 'Solar Disk',
          link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          totalEvents30d: 0,
          cmeCount30d: cmeCount,
          gstCount30d: gstCount,
          description: `NASA DONKI live report: Quiet flares (${cmeCount} CMEs, ${gstCount} GST events in 30d).`,
        };
      }

      donkiCache = { expiresAt: Date.now() + 1000 * 60 * 60 * 6, payload };
      return res.json(payload);
    } catch {
      return res.json({
        isLive: false,
        status: 'archived',
        classType: 'M2.4 (Archived Reference)',
        beginTime: '2025-05-14T14:22Z',
        sourceLocation: 'AR3664 (Archived DONKI Sample)',
        link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
        totalEvents30d: null,
        cmeCount30d: 4,
        gstCount30d: 2,
        description:
          'Offline archived NASA DONKI reference flare (M2.4 + 4 CMEs) loaded for radiation-shielding simulation.',
      });
    }
  });

  // 1a. NASA JPL Solar System Light-Time & Orbital Ephemeris Reference
  app.get('/api/jpl-reference', (_req, res) => {
    return res.json({
      source: 'NASA JPL Solar System Dynamics & Horizons Reference',
      isLive: false,
      note: 'Static scientific reference table (AU, one-way light-time, surface gravity).',
      bodies: [
        { name: 'Moon', au: 1.0, lightTime: '1.28 s', gravityG: 0.165 },
        { name: 'Mercury', au: 0.39, lightTime: '5.1 min', gravityG: 0.38 },
        { name: 'Venus', au: 0.72, lightTime: '2.3–14.4 min', gravityG: 0.9 },
        { name: 'Mars', au: 1.52, lightTime: '3.2–22.4 min', gravityG: 0.38 },
        { name: 'Jupiter', au: 5.2, lightTime: '33–54 min', gravityG: 2.53 },
        { name: 'Saturn', au: 9.58, lightTime: '67–92 min', gravityG: 1.07 },
        { name: 'Uranus', au: 19.2, lightTime: '2.4–2.9 hrs', gravityG: 0.89 },
        { name: 'Neptune', au: 30.05, lightTime: '4.0–4.3 hrs', gravityG: 1.14 },
        { name: 'Pluto', au: 39.5, lightTime: '5.5 hrs', gravityG: 0.063 },
      ],
    });
  });

  // 1a-ii. Live Cached NASA JPL Horizons Cartesian State Vectors (J2000 Ecliptic ICRF -> SI m, m/s)
  app.get('/api/jpl-horizons', async (_req, res) => {
    if (horizonsCache && Date.now() < horizonsCache.expiresAt) {
      return res.json(horizonsCache.payload);
    }

    const now = new Date();
    const epochUtc = now.toISOString();
    const j2000Ms = Date.UTC(2000, 0, 1, 12, 0, 0);
    const epochYearsFromJ2000 = (now.getTime() - j2000Ms) / (SI.JULIAN_YEAR_S * 1000);

    const results = await Promise.allSettled(
      HORIZONS_TRACKED_BODIES.map(async (item) => {
        const url = buildHorizonsUrlForCommand(item.command, item.horizonsCenter, epochUtc);
        const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
        const text = await response.text();
        const parsed = parseHorizonsVectorCsv(text);
        if (!parsed) throw new Error(`Failed to parse Horizons CSV for ${item.id}`);
        return { item, parsed };
      })
    );

    const bodies: Record<string, HorizonsBodyStateSI> = {};
    let liveCount = 0;

    results.forEach((r, idx) => {
      const meta = HORIZONS_TRACKED_BODIES[idx];
      const cat = PLANETARY_CATALOG_SI[meta.id];
      if (r.status === 'fulfilled') {
        liveCount += 1;
        bodies[meta.id] = {
          id: meta.id,
          jplId: cat.jplId,
          name: cat.name,
          center: meta.center,
          posM: r.value.parsed.posM,
          velMs: r.value.parsed.velMs,
          provenance: 'REAL NASA/JPL DATA',
        };
      } else {
        const analytical = computeBodyCartesianSI(meta.id, epochYearsFromJ2000, null);
        bodies[meta.id] = {
          id: meta.id,
          jplId: cat.jplId,
          name: cat.name,
          center: meta.center,
          posM: { x: analytical.state.xM, y: analytical.state.yM, z: analytical.state.zM },
          velMs: { x: analytical.state.vxMs, y: analytical.state.vyMs, z: analytical.state.vzMs },
          provenance: 'SCIENTIFIC MODEL',
        };
      }
    });

    const payload: HorizonsEphemerisResponse = {
      source:
        liveCount > 0
          ? 'NASA/JPL Horizons Web API (Ecliptic J2000 ICRF)'
          : 'JPL J2000 Analytical Keplerian Ephemeris Fallback',
      isLive: liveCount > 0,
      provenance: liveCount > 0 ? 'REAL NASA/JPL DATA' : 'SCIENTIFIC MODEL',
      epochUtc,
      note:
        liveCount > 0
          ? `Fetched ${liveCount}/${HORIZONS_TRACKED_BODIES.length} live JPL Horizons Cartesian state vectors (SI meters & m/s).`
          : 'Offline/timeout fallback: propagated from JPL J2000 Keplerian elements via Newton-Raphson solver.',
      bodies,
    };

    horizonsCache = { expiresAt: Date.now() + 1000 * 60 * 60 * 12, payload };
    return res.json(payload);
  });

  // 1b. NASA Open Science Data Repository (OSDR) Radiation & Space Biology Studies
  app.get('/api/osdr', async (_req, res) => {
    if (osdrCache && Date.now() < osdrCache.expiresAt) {
      return res.json(osdrCache.payload);
    }

    try {
      const response = await fetch(
        'https://osdr.nasa.gov/osdr/data/search?term=radiation%20shielding&from=0&size=4&type=cgene',
        { signal: AbortSignal.timeout(4500) }
      );
      if (!response.ok) throw new Error(`OSDR HTTP ${response.status}`);
      const json = (await response.json()) as {
        hits?: {
          total?: number;
          hits?: Array<{
            _id?: string;
            _source?: {
              Accession?: string;
              'Study Title'?: string;
              organism?: string;
            };
          }>;
        };
      };

      const liveHits = (json.hits?.hits || []).slice(0, 4).map((hit, idx) => {
        const src = hit._source || {};
        const fallback = CURATED_OSDR_STUDIES[idx % CURATED_OSDR_STUDIES.length];
        const accession = src.Accession || hit._id || fallback.accession;
        return {
          ...fallback,
          accession,
          title: src['Study Title'] || fallback.title,
          organism: src.organism || fallback.organism,
          uri: `https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(accession)}`,
        };
      });

      const payload = {
        isLive: true,
        totalCatalogStudies: json.hits?.total || liveHits.length,
        studies: liveHits.length > 0 ? liveHits : CURATED_OSDR_STUDIES,
      };
      osdrCache = { expiresAt: Date.now() + 1000 * 60 * 60 * 6, payload };
      return res.json(payload);
    } catch {
      const payload = {
        isLive: false,
        totalCatalogStudies: CURATED_OSDR_STUDIES.length,
        studies: CURATED_OSDR_STUDIES,
      };
      osdrCache = { expiresAt: Date.now() + 1000 * 60 * 15, payload };
      return res.json(payload);
    }
  });

  // 2. Google Search Grounding for live NASA Artemis & Space Weather science briefs
  app.get('/api/nasa-grounding', async (req, res) => {
    const topic = String(req.query.topic || 'artemis').slice(0, 80);
    const ai = getGeminiClient();

    const queryMap: Record<string, string> = {
      artemis:
        'Give a short, accurate 3-bullet kid-friendly update on NASA Artemis II–IV, Lunar Gateway, and South Pole exploration for ages 8-14.',
      radiation:
        'Give a short, accurate 3-bullet kid-friendly summary of how NASA monitors solar flares (DONKI) and protects astronauts from space radiation (OSDR).',
      rover:
        'Give a short, accurate 3-bullet kid-friendly summary of NASA VIPER lunar rover, TRIDENT ice drill, and searching for water ice on the Moon.',
      mars:
        'Give a short, accurate 3-bullet kid-friendly summary of NASA Mars Perseverance rover in Jezero Crater, MOXIE oxygen production, and sample caching.',
    };

    const prompt = queryMap[topic] || queryMap.artemis;

    if (!ai) {
      return res.json({
        grounded: false,
        summary:
          topic === 'radiation'
            ? '• NASA Space Weather (DONKI) tracks solar flares and coronal mass ejections before radiation arrives.\n• NASA Open Science Data Repository (OSDR) studies how water, hydrogen-rich plastics, and regolith shield crew DNA.\n• Every lunar & Mars base trades electrical power against active shielding and life support.'
            : topic === 'rover'
              ? '• NASA rovers at the Moon South Pole look inside permanently shadowed craters for trapped water ice.\n• The TRIDENT rotary-percussive drill samples up to 1 meter below the regolith in 10 cm bites.\n• Water ice is split via electrolysis into breathable O₂ and LH₂ rocket propellant.'
              : topic === 'mars'
                ? '• Jezero Crater holds an ancient river delta where clay minerals preserved signs of past Martian water.\n• Perseverance caches core tubes while MOXIE proved astronauts can convert Martian CO₂ air into pure O₂.\n• Regional dust storms cut sunlight, testing solar vs nuclear backup planning.'
                : '• Artemis II tests Orion and deep-space life support on a crewed lunar flyby (~10 days).\n• Artemis III & VIPER prospect South Pole water ice along sunlit ridges like Malapert next to icy craters.\n• Artemis IV expands Lunar Gateway (HERMES/IDA) to stage reusable fuel and Mars-bound hardware.',
        sources: [
          { title: 'NASA Artemis Program', uri: 'https://www.nasa.gov/humans-in-space/artemis/' },
          { title: 'NASA DONKI Space Weather', uri: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
          { title: 'NASA Open Science Data Repository (OSDR)', uri: 'https://osdr.nasa.gov/' },
          { title: 'NASA Mars Perseverance (Jezero)', uri: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
        ],
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c) => c.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .slice(0, 5)
        .map((w) => ({ title: w.title || w.uri, uri: w.uri }));

      return res.json({
        grounded: true,
        summary: response.text || 'NASA mission data retrieved.',
        sources:
          sources.length > 0
            ? sources
            : [{ title: 'NASA Artemis Program', uri: 'https://www.nasa.gov/humans-in-space/artemis/' }],
      });
    } catch (err) {
      return res.json({
        grounded: false,
        error: err instanceof Error ? err.message : 'Search grounding unavailable',
        summary:
          '• NASA Artemis targets the lunar South Pole where sunlit ridges sit next to icy craters.\n• Engineers balance power, oxygen, and radiation shielding on every mission day.\n• Open NASA datasets like DONKI and OSDR guide real mission planners.',
        sources: [{ title: 'NASA Artemis Program', uri: 'https://www.nasa.gov/humans-in-space/artemis/' }],
      });
    }
  });

  // 3. Google Maps Grounding for NASA Launch Complex 39B, Mission Control & Lunar Analog Sites
  app.get('/api/launch-sites', async (req, res) => {
    const lat = Number(req.query.lat || 28.6272); // Kennedy Space Center LC-39B
    const lng = Number(req.query.lng || -80.6208);
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        grounded: false,
        summary:
          'Explore the real NASA launch complex and astronaut training facilities connected to this mission simulator.',
        places: [
          {
            title: 'Launch Complex 39B — Kennedy Space Center, FL',
            uri: 'https://www.google.com/maps/search/?api=1&query=Launch+Complex+39B+Kennedy+Space+Center',
            snippet: 'Historic launchpad for NASA Space Launch System (SLS) Artemis missions.',
          },
          {
            title: 'NASA Johnson Space Center — Houston, TX',
            uri: 'https://www.google.com/maps/search/?api=1&query=NASA+Johnson+Space+Center+Houston',
            snippet: 'Home of Mission Control (CAPCOM) and Artemis astronaut training.',
          },
          {
            title: 'Craters of the Moon National Monument — Idaho',
            uri: 'https://www.google.com/maps/search/?api=1&query=Craters+of+the+Moon+National+Monument',
            snippet: 'Volcanic basalt terrain used by NASA astronauts for lunar rover geology training.',
          },
        ],
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          'Locate NASA Kennedy Space Center Launch Complex 39B, NASA Johnson Space Center Mission Control, and Craters of the Moon lunar analog training site. Summarize each in one kid-friendly sentence.',
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: Number.isFinite(lat) ? lat : 28.6272,
                longitude: Number.isFinite(lng) ? lng : -80.6208,
              },
            },
          },
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const places = chunks
        .map((c) => c.maps)
        .filter((m): m is NonNullable<typeof m> & { uri: string } => Boolean(m?.uri))
        .slice(0, 5)
        .map((m) => ({
          title: m.title || 'NASA Facility',
          uri: m.uri,
          snippet: m.placeAnswerSources?.reviewSnippets?.[0]?.review || m.text || '',
        }));

      return res.json({
        grounded: true,
        summary: response.text || 'Real NASA launch and analog training facilities.',
        places:
          places.length > 0
            ? places
            : [
                {
                  title: 'Launch Complex 39B — Kennedy Space Center, FL',
                  uri: 'https://www.google.com/maps/search/?api=1&query=Launch+Complex+39B+Kennedy+Space+Center',
                  snippet: 'Artemis SLS launchpad.',
                },
              ],
      });
    } catch (err) {
      return res.json({
        grounded: false,
        error: err instanceof Error ? err.message : 'Maps grounding unavailable',
        summary:
          'Explore the real-world NASA launchpad and mission facilities modeled in Artemis Odyssey.',
        places: [
          {
            title: 'Launch Complex 39B — Kennedy Space Center, FL',
            uri: 'https://www.google.com/maps/search/?api=1&query=Launch+Complex+39B+Kennedy+Space+Center',
            snippet: 'SLS Artemis launch site in Florida.',
          },
          {
            title: 'NASA Johnson Space Center — Houston, TX',
            uri: 'https://www.google.com/maps/search/?api=1&query=NASA+Johnson+Space+Center+Houston',
            snippet: 'Mission Control & Astronaut Training.',
          },
        ],
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Artemis Odyssey server listening on http://localhost:${PORT}`);
  });

  httpServer.on('error', (err) => {
    console.error(`Failed to start Artemis Odyssey server on port ${PORT}:`, err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Artemis Odyssey server initialization failed:', err);
  process.exit(1);
});
