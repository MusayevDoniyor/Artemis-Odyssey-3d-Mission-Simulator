import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

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

// 6-hour in-memory caches for NASA DONKI & OSDR so student/judge sessions stay snappy
let donkiCache: { expiresAt: number; payload: unknown } | null = null;
let osdrCache: { expiresAt: number; payload: unknown } | null = null;

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

  // 1. Live NASA DONKI Space Weather API Proxy (Solar Flares)
  app.get('/api/donki', async (_req, res) => {
    if (donkiCache && Date.now() < donkiCache.expiresAt) {
      return res.json(donkiCache.payload);
    }

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const url = `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error(`DONKI HTTP ${response.status}`);
      const data = (await response.json()) as Array<{
        classType?: string;
        beginTime?: string;
        peakTime?: string;
        sourceLocation?: string;
        link?: string;
      }>;

      let payload;
      if (Array.isArray(data) && data.length > 0) {
        const latest = data.reduce((a, b) => ((b.beginTime || '') > (a.beginTime || '') ? b : a), data[0]);
        payload = {
          isLive: true,
          status: 'live',
          classType: latest.classType || 'C-Class',
          beginTime: latest.beginTime || endDate,
          sourceLocation: latest.sourceLocation || 'Solar Disk',
          link: latest.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
          totalEvents30d: data.length,
          description: `NASA DONKI live report: Class ${latest.classType || 'Solar'} flare observed ${latest.beginTime?.slice(0, 10) || endDate}.`,
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
          description: 'NASA DONKI live report: Quiet solar conditions over the last 30 days.',
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
        description:
          'Offline archived NASA DONKI reference flare (M2.4) loaded for radiation-shielding simulation.',
      });
    }
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
