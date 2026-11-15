export type HonestyBadgeKind = 'REAL DATA' | 'REFERENCE VALUE' | 'SIMULATED VALUE';

export interface GlossaryEntry {
  id: string;
  term: string;
  shortLabel: string;
  definition: string;
  badge: HonestyBadgeKind;
}

export const GLOSSARY_ENTRIES: Record<string, GlossaryEntry> = {
  'max-q': {
    id: 'max-q',
    term: 'Max-Q',
    shortLabel: 'Max-Q',
    definition:
      'Maximum dynamic pressure: the moment during launch when air pushes hardest against the speeding rocket.',
    badge: 'REAL DATA',
  },
  'delta-v': {
    id: 'delta-v',
    term: 'Delta-v (Δv)',
    shortLabel: 'Delta-v',
    definition:
      'Total change in speed a spacecraft can make using its fuel—our spaceflight "travel budget."',
    badge: 'REAL DATA',
  },
  regolith: {
    id: 'regolith',
    term: 'Regolith',
    shortLabel: 'Regolith',
    definition:
      'Loose, powdery crushed rock and dust covering the Moon and Mars instead of Earth-like soil.',
    badge: 'REAL DATA',
  },
  sol: {
    id: 'sol',
    term: 'Sol',
    shortLabel: 'Sol',
    definition:
      'One Martian day—24 hours and 39 minutes long, just 39 minutes longer than an Earth day.',
    badge: 'REAL DATA',
  },
  microgravity: {
    id: 'microgravity',
    term: 'Microgravity',
    shortLabel: 'Microgravity',
    definition:
      'Near-weightlessness felt in orbit because astronauts and their ship fall freely around Earth together.',
    badge: 'REAL DATA',
  },
  'radiation-dose': {
    id: 'radiation-dose',
    term: 'Radiation Dose (mSv)',
    shortLabel: 'Radiation Dose',
    definition:
      'Measured in millisieverts (mSv); astronauts use water walls and regolith berms to block solar storm particles.',
    badge: 'REAL DATA',
  },
  leo: {
    id: 'leo',
    term: 'Low Earth Orbit (LEO)',
    shortLabel: 'LEO (~400 km)',
    definition:
      'An orbit roughly 165–400 km up where spacecraft circle Earth every ~92 minutes before heading to deep space.',
    badge: 'REAL DATA',
  },
  tli: {
    id: 'tli',
    term: 'Trans-Lunar Injection (TLI)',
    shortLabel: 'TLI Burn',
    definition:
      'A high-thrust engine burn in Earth orbit that stretches the ship’s path out to reach the Moon.',
    badge: 'REAL DATA',
  },
  'comms-delay': {
    id: 'comms-delay',
    term: 'Comms Light-Time Delay',
    shortLabel: 'Comms Delay',
    definition:
      'Radio waves travel at light speed—taking ~1.3 seconds to reach the Moon and 3–22 minutes to reach Mars.',
    badge: 'REAL DATA',
  },
  'sky-crane': {
    id: 'sky-crane',
    term: 'Sky Crane EDL',
    shortLabel: 'Sky Crane',
    definition:
      'A hovering rocket backpack that lowers a heavy Mars rover down on cables so thrusters do not blast dust onto it.',
    badge: 'REAL DATA',
  },
  isru: {
    id: 'isru',
    term: 'ISRU (Living Off the Land)',
    shortLabel: 'ISRU',
    definition:
      'Making oxygen, water, and rocket fuel from local lunar ice or Martian CO₂ air instead of hauling everything from Earth.',
    badge: 'REFERENCE VALUE',
  },
  'rocker-bogie': {
    id: 'rocker-bogie',
    term: 'Rocker-Bogie Suspension',
    shortLabel: 'Rocker-Bogie',
    definition:
      'A linked rover wheel frame that lets all wheels stay on bumpy crater rocks without tipping over.',
    badge: 'REAL DATA',
  },
};

export type FactContextKey =
  | 'inspector'
  | 'launch'
  | 'leo'
  | 'space'
  | 'moon-landing'
  | 'mars-edl'
  | 'unstow'
  | 'rover'
  | 'drilling'
  | 'outpost';

export interface ContextualFact {
  text: string;
  glossaryId: keyof typeof GLOSSARY_ENTRIES;
  badge: HonestyBadgeKind;
}

export const CONTEXTUAL_FACTS: Record<FactContextKey, ContextualFact[]> = {
  inspector: [
    {
      text: 'SLS Block 1 stands 98–111 m tall and burns liquid hydrogen chilled to -253°C.',
      glossaryId: 'max-q',
      badge: 'REAL DATA',
    },
    {
      text: 'Water-filled storage walls inside Orion cut solar proton radiation dose by almost half.',
      glossaryId: 'radiation-dose',
      badge: 'REAL DATA',
    },
    {
      text: 'VIPER’s TRIDENT drill bites 10 cm at a time so lunar dust never jams the auger.',
      glossaryId: 'regolith',
      badge: 'REAL DATA',
    },
  ],
  launch: [
    {
      text: 'Pad 39B dumps 450,000 gallons of water under the rocket in seconds to tame engine sound waves.',
      glossaryId: 'max-q',
      badge: 'REAL DATA',
    },
    {
      text: 'Around 12 km up, SLS hits Max-Q where air pressure squeezes the nose cone hardest.',
      glossaryId: 'max-q',
      badge: 'REAL DATA',
    },
    {
      text: 'Twin solid boosters supply over 75% of liftoff thrust before dropping away 2 minutes after launch.',
      glossaryId: 'delta-v',
      badge: 'REAL DATA',
    },
  ],
  leo: [
    {
      text: 'In Low Earth Orbit (~400 km), spacecraft speed along at 7.67 km/s—circling Earth in 92 minutes.',
      glossaryId: 'leo',
      badge: 'REAL DATA',
    },
    {
      text: 'Mission teams check every system in parking orbit before firing the Trans-Lunar Injection burn.',
      glossaryId: 'tli',
      badge: 'REAL DATA',
    },
    {
      text: 'Above ~100 km, air is too thin to carry sound outside—space is silent except hull vibrations.',
      glossaryId: 'microgravity',
      badge: 'REAL DATA',
    },
  ],
  space: [
    {
      text: 'Radio signals take only 1.3 seconds to cross from Earth to the Moon, but up to 22 minutes to Mars.',
      glossaryId: 'comms-delay',
      badge: 'REAL DATA',
    },
    {
      text: 'Once engines stop in vacuum, Newton’s First Law keeps Orion gliding without burning fuel.',
      glossaryId: 'delta-v',
      badge: 'REAL DATA',
    },
    {
      text: 'Solar storms fire fast protons across the Solar System—space weather alerts buy astronauts shelter time.',
      glossaryId: 'radiation-dose',
      badge: 'REAL DATA',
    },
  ],
  'moon-landing': [
    {
      text: 'Moon gravity is 1/6th of Earth’s (1.625 m/s²), letting a single variable-thrust engine hover cleanly.',
      glossaryId: 'delta-v',
      badge: 'REAL DATA',
    },
    {
      text: 'Apollo 11 saw a 1202 computer overload alarm seconds from landing—priority scheduling kept the guidance loop alive.',
      glossaryId: 'leo',
      badge: 'REAL DATA',
    },
    {
      text: 'Blue contact probes hang beneath the lander footpads to signal touchdown before dust blinds the crew.',
      glossaryId: 'regolith',
      badge: 'REAL DATA',
    },
  ],
  'mars-edl': [
    {
      text: 'Mars signals take ~14 minutes one-way, so every Mars lander flies its "7 Minutes of Terror" autonomously.',
      glossaryId: 'comms-delay',
      badge: 'REAL DATA',
    },
    {
      text: 'Mars’ thin CO₂ air heats the entry shield over 1,400°C—creating a brief radio blackout during entry.',
      glossaryId: 'sky-crane',
      badge: 'REAL DATA',
    },
    {
      text: 'Sky Crane lowers the rover on nylon tethers so rocket plumes stay well above dusty crater bedrock.',
      glossaryId: 'sky-crane',
      badge: 'REAL DATA',
    },
  ],
  unstow: [
    {
      text: 'Real astronauts never teleport off a lander: engines cool, checklists verify, ramps unlock, and wheels deploy in order.',
      glossaryId: 'rocker-bogie',
      badge: 'REFERENCE VALUE',
    },
    {
      text: 'Sharp, glass-like lunar regolith dust sticks to hinges, so post-landing mechanism checks protect rover joints.',
      glossaryId: 'regolith',
      badge: 'REAL DATA',
    },
  ],
  rover: [
    {
      text: 'VIPER’s real top speed on the Moon is ~0.1 m/s (0.36 km/h) so drivers can dodge craters safely with 1.3s radio lag.',
      glossaryId: 'comms-delay',
      badge: 'REAL DATA',
    },
    {
      text: 'A rover’s rocker-bogie suspension lets it climb rocks up to its wheel radius without flipping.',
      glossaryId: 'rocker-bogie',
      badge: 'REAL DATA',
    },
    {
      text: 'At the lunar South Pole, crater bottoms stay -200°C forever while nearby peaks stay sunlit 89% of the year.',
      glossaryId: 'isru',
      badge: 'REAL DATA',
    },
  ],
  drilling: [
    {
      text: 'NASA’s TRIDENT drill measures temperature and motor torque so icy lunar soil never melts or refreezes onto the bit.',
      glossaryId: 'isru',
      badge: 'REAL DATA',
    },
    {
      text: 'Every 10 cm core layer preserves a different chapter of comet impacts or ancient Martian river mud.',
      glossaryId: 'regolith',
      badge: 'REAL DATA',
    },
  ],
  outpost: [
    {
      text: 'Compacting 1.5 meters of lunar regolith over a habitat dome cuts solar storm radiation by ~62% (OSDR OSD-489).',
      glossaryId: 'radiation-dose',
      badge: 'REAL DATA',
    },
    {
      text: 'Inside an airlock, pressure drops slowly to zero before opening the outer hatch so crew air never rushes out.',
      glossaryId: 'sol',
      badge: 'REAL DATA',
    },
    {
      text: 'MOXIE proved on Mars that splitting Martian CO₂ at 800°C makes pure breathable oxygen on another world.',
      glossaryId: 'isru',
      badge: 'REAL DATA',
    },
  ],
};

export function getFactForPhase(context: FactContextKey, elapsedSec: number): ContextualFact {
  const list = CONTEXTUAL_FACTS[context] || CONTEXTUAL_FACTS.launch;
  const idx = Math.floor(Math.max(0, elapsedSec) / 9) % list.length;
  return list[idx];
}
