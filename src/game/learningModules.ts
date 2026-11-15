import type { RoverObjective, SurfacePlanet } from './types';

export type SpecimenVisualKind =
  | 'moon-ice'
  | 'moon-solar'
  | 'moon-regolith'
  | 'moon-hydrogen'
  | 'mars-iron-rock'
  | 'mars-basalt'
  | 'mars-carbonate'
  | 'mars-moxie';

export interface LearnQuizSpec {
  question: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface LearnModuleSpec {
  objectiveId: string;
  planet: SurfacePlanet;
  specimenKind: SpecimenVisualKind;
  sampleTitle: string;
  composition: string;
  sampleXp: number;
  rewardXp: number;
  dataPackLabel: string;
  drillRecommended: boolean;
  significanceSummary: string;
  researchBullets: [string, string];
  nasaSourceLabel: string;
  quiz: LearnQuizSpec;
}

export interface LearnModalState {
  open: boolean;
  objectiveId: string;
  activeStep: 'study' | 'notes' | 'quiz';
  sampleStudied: boolean;
  notesRead: boolean;
  quizPassed: boolean;
  selectedAnswer: number | null;
  quizFeedback: string | null;
}

export const LEARNING_MODULES: Record<string, LearnModuleSpec> = {
  'moon-shackleton-ice': {
    objectiveId: 'moon-shackleton-ice',
    planet: 'moon',
    specimenKind: 'moon-ice',
    sampleTitle: 'Sample Analysis',
    composition: 'Water Ice (H₂O) + Regolith',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: true,
    significanceSummary:
      'Permanently shadowed polar craters hold ancient water ice at -200°C—the key feedstock for crew oxygen and liquid hydrogen rocket propellant.',
    researchBullets: [
      'Electrolysis splits extracted lunar water ice into breathable O₂ and cryogenic H₂ fuel.',
      'Mining local ice reduces Earth launch mass dramatically for Artemis IV Gateway & Mars missions.',
    ],
    nasaSourceLabel: 'NASA VIPER · TRIDENT 1m Core',
    quiz: {
      question: 'Why is Shackleton Crater water ice critical for Artemis missions?',
      options: [
        'It splits into breathable O₂ and rocket fuel via electrolysis',
        'It keeps the rover tires cool during lunar noon',
        'It is used to build solar panels directly on the Moon',
      ],
      correctIndex: 0,
      explanation: 'Lunar ISRU splits H₂O into oxygen for astronauts and hydrogen propellant for deep-space rockets.',
    },
  },
  'moon-malapert-solar': {
    objectiveId: 'moon-malapert-solar',
    planet: 'moon',
    specimenKind: 'moon-solar',
    sampleTitle: 'Sample Analysis',
    composition: 'Anorthosite + Ilmenite (FeTiO₃)',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: false,
    significanceSummary:
      'Malapert Peak rises nearly 5 km above the lunar South Pole, catching sunlight 89% of the year above nearby permanently shadowed craters.',
    researchBullets: [
      'High-elevation ridges host vertical solar towers that beam power to dark crater mines.',
      'Titanium-rich ilmenite regolith nearby can also yield oxygen when heated with hydrogen.',
    ],
    nasaSourceLabel: 'Artemis South Pole Power Grid',
    quiz: {
      question: 'Why place solar arrays on Malapert Ridge instead of inside deep craters?',
      options: [
        'Gravity is zero on mountain ridges',
        'The peak receives sunlight ~89% of the year',
        'Deep craters are too warm for solar cells',
      ],
      correctIndex: 1,
      explanation: 'At the lunar South Pole, high rims stay illuminated almost year-round while crater floors sit in perpetual darkness.',
    },
  },
  'moon-nobile-regolith': {
    objectiveId: 'moon-nobile-regolith',
    planet: 'moon',
    specimenKind: 'moon-regolith',
    sampleTitle: 'Sample Analysis',
    composition: 'SiO₂ + Al₂O₃ Packed Regolith',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: false,
    significanceSummary:
      'Sintered and compacted lunar regolith forms thick radiation berms around habitats without hauling heavy metal shielding from Earth.',
    researchBullets: [
      'OSDR OSD-489: A 1.5 m layer of packed lunar soil absorbs ~62% of primary solar flare protons.',
      'Local regolith berms protect crews during intense solar particle events (SPEs).',
    ],
    nasaSourceLabel: 'NASA OSDR OSD-489 · Berm Study',
    quiz: {
      question: 'How does compacted lunar regolith protect astronauts at Base Camp?',
      options: [
        'It absorbs solar flare protons like a natural shield wall',
        'It creates a breathable nitrogen atmosphere outdoors',
        'It eliminates lunar dust completely',
      ],
      correctIndex: 0,
      explanation: 'Compacted 1.5 m regolith berms attenuate incoming high-energy protons by roughly 62%.',
    },
  },
  'moon-cabeus-hydrogen': {
    objectiveId: 'moon-cabeus-hydrogen',
    planet: 'moon',
    specimenKind: 'moon-hydrogen',
    sampleTitle: 'Sample Analysis',
    composition: 'Buried Hydrogen (H₂ / OH⁻)',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: true,
    significanceSummary:
      'VIPER’s Neutron Spectrometer detects hidden hydrogen deposits up to 1 meter underground without stopping to dig everywhere.',
    researchBullets: [
      'Cosmic rays scatter neutrons off regolith; hydrogen slows neutrons down sharply.',
      'Mapping subsurface hydrogen pinpoints where percussive TRIDENT drills should bore.',
    ],
    nasaSourceLabel: 'VIPER Neutron Spectrometer',
    quiz: {
      question: 'How does the Neutron Spectrometer detect buried lunar ice from the surface?',
      options: [
        'By melting the top 5 meters with a laser',
        'By measuring neutrons slowed down by underground hydrogen',
        'By listening to seismic echoes from Earth',
      ],
      correctIndex: 1,
      explanation: 'Hydrogen atoms have nearly the same mass as neutrons, slowing them markedly in shallow subsurface deposits.',
    },
  },
  'mars-jezero-delta': {
    objectiveId: 'mars-jezero-delta',
    planet: 'mars',
    specimenKind: 'mars-iron-rock',
    sampleTitle: 'Sample Analysis',
    composition: 'Iron Oxide (Fe₂O₃) & Smectite Clay',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: true,
    significanceSummary:
      'Jezero’s ancient river delta deposited fine smectite clays and iron-oxide mudstones 3.5 billion years ago—ideal traps for ancient biosignatures.',
    researchBullets: [
      'Fine-grained lakebed clays lock organic carbon molecules away from harsh Martian UV rays.',
      'Iron oxide rust gives Mars its iconic red glow while preserving wet-era mineral layers.',
    ],
    nasaSourceLabel: 'Mars 2020 · Perseverance SHERLOC',
    quiz: {
      question: 'Why do scientists target ancient river delta clays in Jezero Crater?',
      options: [
        'Clay layers preserve ancient water chemistry and potential biosignatures',
        'Clays generate magnetic storms on Mars',
        'River clays are the newest rocks on Mars',
      ],
      correctIndex: 0,
      explanation: 'Fine lakebed clay sediments entomb organic molecules and record Mars’s habitable river era 3.5B years ago.',
    },
  },
  'mars-maaz-ridge': {
    objectiveId: 'mars-maaz-ridge',
    planet: 'mars',
    specimenKind: 'mars-basalt',
    sampleTitle: 'Sample Analysis',
    composition: 'Olivine Basalt (Mg,Fe)₂SiO₄',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: false,
    significanceSummary:
      'Volcanic Máaz basalt bedrock sits high on Jezero’s floor, where brisk Martian winds sweep settled red dust off rover solar panels.',
    researchBullets: [
      'Olivine basalt preserves radiometric clues to when ancient lava flooded Jezero before the lake.',
      'Steep basalt terraces require high-clearance Walker suspension in 0.38g gravity.',
    ],
    nasaSourceLabel: 'Mars SuperCam · Máaz Formation',
    quiz: {
      question: 'What double advantage does climbing Máaz Ridge give our Mars rover?',
      options: [
        'Volcanic bedrock science plus ridge winds that clear solar dust',
        'Direct submarine access to liquid oceans',
        'Earth radio signals travel with zero lag on ridges',
      ],
      correctIndex: 0,
      explanation: 'Máaz exposes ancient volcanic basalt for dating while ridge breezes help dust off power arrays.',
    },
  },
  'mars-carbonate-shore': {
    objectiveId: 'mars-carbonate-shore',
    planet: 'mars',
    specimenKind: 'mars-carbonate',
    sampleTitle: 'Sample Analysis',
    composition: 'Magnesium Carbonate (MgCO₃)',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: true,
    significanceSummary:
      'Carbonate crusts along Jezero’s ancient shoreline formed when Mars’s early CO₂ atmosphere reacted with mineral-rich lake water.',
    researchBullets: [
      'Earth stromatolites often grow in shallow carbonate lake margins—making this a top biosignature site.',
      'OSDR RAD measurements show Mars’s thin CO₂ air only partially shields crews; shelters stay vital.',
    ],
    nasaSourceLabel: 'PIXL Spectrometer · OSDR OSD-366',
    quiz: {
      question: 'How did the carbonate crusts on Jezero’s shoreline originally form?',
      options: [
        'From Mars’s CO₂ air reacting with liquid lake water',
        'From asteroid metal melting in winter snow',
        'From human rover exhaust',
      ],
      correctIndex: 0,
      explanation: 'Carbonates precipitate when dissolved carbon dioxide interacts with mineral-rich liquid lake water.',
    },
  },
  'mars-moxie-depot': {
    objectiveId: 'mars-moxie-depot',
    planet: 'mars',
    specimenKind: 'mars-moxie',
    sampleTitle: 'Sample Analysis',
    composition: 'Martian CO₂ (95.3%) → O₂',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: false,
    significanceSummary:
      'MOXIE pulls thin Martian carbon dioxide air into a solid-oxide electrolyzer at 800°C, outputting pure oxygen for astronauts and return rockets.',
    researchBullets: [
      'A Mars ascent vehicle needs ~25 metric tons of oxygen oxidizer—far cheaper to brew on Mars than launch from Earth.',
      'Producing oxygen from Mars air closes the loop between life support and return propulsion.',
    ],
    nasaSourceLabel: 'NASA MOXIE ISRU Flight Demo',
    quiz: {
      question: 'What raw Martian resource does MOXIE convert into breathable O₂?',
      options: [
        'Carbon dioxide (CO₂) from Mars’s atmosphere',
        'Liquid methane from Jupiter',
        'Solid granite bedrock',
      ],
      correctIndex: 0,
      explanation: 'MOXIE electrolyzes Mars’s 95% CO₂ atmosphere at 800°C into pure O₂ and CO.',
    },
  },
};

export function getLearnModuleForObjective(obj: RoverObjective): LearnModuleSpec {
  const existing = LEARNING_MODULES[obj.id];
  if (existing) return existing;
  return {
    objectiveId: obj.id,
    planet: obj.planet,
    specimenKind: obj.planet === 'mars' ? 'mars-iron-rock' : 'moon-regolith',
    sampleTitle: 'Sample Analysis',
    composition: obj.planet === 'mars' ? 'Iron Oxide (Fe₂O₃)' : 'Anorthosite Regolith',
    sampleXp: 50,
    rewardXp: 100,
    dataPackLabel: '+1 Data Pack',
    drillRecommended: true,
    significanceSummary: obj.nasaFact,
    researchBullets: [obj.nasaFact, obj.rewardText],
    nasaSourceLabel: obj.instrument,
    quiz: {
      question: `What does the ${obj.instrument} primarily measure at ${obj.siteName}?`,
      options: [
        'Surface mineral & volatile composition for ISRU planning',
        'Deep ocean trench tides',
        'Solar corona brightness inside the Sun',
      ],
      correctIndex: 0,
      explanation: obj.nasaFact,
    },
  };
}

export function createInitialLearnModalState(obj: RoverObjective): LearnModalState {
  return {
    open: true,
    objectiveId: obj.id,
    activeStep: 'study',
    sampleStudied: obj.progress >= 0.99,
    notesRead: false,
    quizPassed: false,
    selectedAnswer: null,
    quizFeedback: null,
  };
}
