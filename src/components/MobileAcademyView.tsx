import {
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Copy,
  Cpu,
  Database,
  Flame,
  Gauge,
  Laptop,
  Monitor,
  Radar,
  Radio,
  Rocket,
  Shield,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import heroBannerImg from '../assets/images/artemis_hero_banner_1794685527117.jpg';
import missionArchImg from '../assets/images/mission_architecture_diagram_v2_1794685546954.jpg';
import vehicleShowcaseImg from '../assets/images/viper_lander_showcase_1794685527556.jpg';
import {
  CAMPAIGN_ANOMALIES,
  CAMPAIGN_MISSIONS,
  CAMPAIGN_ORDER,
  FIELD_NOTES,
  OSDR_FACTS,
  PAYLOADS,
  PHYSICS,
} from '../game/constants';
import { HARDWARE_CATALOG, HARDWARE_ORDER } from '../game/hardwareCatalog';
import type {
  CampaignMissionId,
  DonkiStatus,
  FieldNote,
  OsdrStatus,
  PayloadId,
  VehicleShowcaseId,
} from '../game/types';
import { NASAInsignia } from './NASAInsignia';
import { StatusPill } from './ui';

type AcademyTab = 'missions' | 'vehicles' | 'training' | 'data';
type NoteFilter = 'all' | FieldNote['category'];

interface MobileAcademyViewProps {
  donki: DonkiStatus;
  osdr: OsdrStatus;
}

const VEHICLE_ORDER: Array<{ id: VehicleShowcaseId; short: string }> = HARDWARE_ORDER.map(
  (id) => ({ id, short: HARDWARE_CATALOG[id].shortLabel })
);

export function MobileAcademyView({
  donki,
  osdr,
}: MobileAcademyViewProps) {
  const [activeTab, setActiveTab] = useState<AcademyTab>('missions');
  const [selectedMission, setSelectedMission] = useState<CampaignMissionId>('artemis-2');
  const [selectedPayload, setSelectedPayload] = useState<PayloadId>('oxygen-tanks');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleShowcaseId>('lander');
  const [noteFilter, setNoteFilter] = useState<NoteFilter>('all');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [anomalyPicks, setAnomalyPicks] = useState<Record<string, string>>({});

  const missionSpec = CAMPAIGN_MISSIONS[selectedMission];
  const payloadSpec = PAYLOADS[selectedPayload];
  const vehicleSpec = HARDWARE_CATALOG[selectedVehicle];

  const solvedCount = CAMPAIGN_ANOMALIES.filter((a) => {
    const pick = anomalyPicks[a.id];
    return a.choices.some((c) => c.id === pick && c.isOptimal);
  }).length;

  const filteredNotes =
    noteFilter === 'all'
      ? FIELD_NOTES
      : FIELD_NOTES.filter((n) => n.category === noteFilter);

  const handleCopyDesktopLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        window.setTimeout(() => setCopiedUrl(false), 2400);
      }
    } catch {
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2400);
    }
  };

  return (
    <div
      data-testid="mobile-academy-view"
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#050811] text-slate-100"
    >
      {/* Fixed Aerospace Top Bar */}
      <header className="z-20 shrink-0 border-b border-cyan-500/25 bg-[#060b18] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <NASAInsignia size={36} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-hud text-[10px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
                Flight Operations · Mobile Academy
              </p>
              <h1 className="truncate font-display text-base font-extrabold tracking-wide text-white uppercase">
                ARTEMIS ODYSSEY
              </h1>
              <p className="truncate font-body text-[9px] text-slate-400">
                Unofficial educational project · Not affiliated with NASA
              </p>
            </div>
          </div>

          <StatusPill donki={donki} osdr={osdr} compact />
        </div>

        {/* 4-Tab Tactical Navigation */}
        <nav
          aria-label="Mobile Academy Sections"
          className="mx-auto mt-2.5 grid max-w-2xl grid-cols-4 gap-1.5"
        >
          {(
            [
              { id: 'missions', label: 'Missions', icon: Compass },
              { id: 'vehicles', label: '3D Craft', icon: Rocket },
              { id: 'training', label: 'Flight Lab', icon: Gauge },
              { id: 'data', label: 'NASA Data', icon: BookOpen },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`mobile-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 font-hud text-[10px] font-bold tracking-wide uppercase transition ${
                  active
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_14px_rgba(34,211,238,0.2)]'
                    : 'border-slate-700/80 bg-slate-900/75 text-slate-300 hover:border-cyan-500/40'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Scrollable Educational Body */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-8">
          {/* Hero Visual + Desktop Cockpit Notice */}
          <section className="hud-panel tactical-frame overflow-hidden rounded-xl">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
              <img
                src={heroBannerImg}
                alt="Artemis Odyssey SLS Block 1, Orion, HERMES Relay, Lunar Lander, and VIPER Rover"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/35 to-transparent" />
              <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
                <div>
                  <span className="inline-block rounded border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-amber-200 uppercase">
                    3D Cockpit Locked on Mobile
                  </span>
                  <p className="mt-1 font-display text-sm font-bold text-white">
                    Learn Every System Here · Fly Live 3D on Desktop
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-cyan-500/20 bg-slate-950/90 p-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-300">
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-hud text-xs font-bold tracking-wider text-amber-300 uppercase">
                    Desktop Screen Required for Real-Time 3D Flight (1024px+)
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    Real-time WebGL spacecraft piloting, orbital rendezvous, 0.165g / 0.38g powered
                    descent, and VIPER coring are disabled on mobile viewports for full flight precision.
                    Continue your complete NASA Artemis-to-Mars training right here!
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDesktopLink}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 font-hud text-[11px] font-bold tracking-wide text-cyan-100 uppercase transition hover:bg-cyan-500/30"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                          Desktop Link Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-cyan-300" />
                          Copy Link for Desktop
                        </>
                      )}
                    </button>
                    <span className="inline-flex items-center gap-1 font-mono-tech text-[11px] text-slate-400">
                      <Laptop className="h-3.5 w-3.5 text-slate-400" />
                      Open on PC / Mac for WASD + 3D Orbit
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TAB 1: CAMPAIGN MISSIONS & PAYLOAD TRADE-OFFS */}
          {activeTab === 'missions' && (
            <div className="flex flex-col gap-4">
              <section className="hud-panel overflow-hidden rounded-xl p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h2 className="font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
                    Learn → Apply → Reuse Architecture
                  </h2>
                  <span className="font-mono-tech text-[10px] text-slate-400">4 CAMPAIGN LEGS</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
                  <img
                    src={missionArchImg}
                    alt="4-Stage Artemis to Mars Learn Apply Reuse Architecture"
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>

                {/* Mission Selector Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {CAMPAIGN_ORDER.map((id) => {
                    const spec = CAMPAIGN_MISSIONS[id];
                    const active = selectedMission === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedMission(id)}
                        className={`min-h-[48px] rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? 'border-amber-400 bg-amber-500/20 text-white'
                            : 'border-slate-700/80 bg-slate-900/75 text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="font-mono-tech text-[10px] text-cyan-300">{spec.code}</div>
                        <div className="mt-0.5 font-hud text-xs font-bold leading-snug">
                          {spec.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Mission Brief */}
                <div className="mt-3 rounded-lg border border-cyan-500/25 bg-slate-950/85 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-white">
                      {missionSpec.title}
                    </span>
                    <span className="rounded border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-cyan-200 uppercase">
                      {missionSpec.planet === 'mars' ? 'Mars · 0.38g' : 'Moon · 0.165g'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                    {missionSpec.objectiveSummary}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                    <div className="rounded border border-slate-800 bg-slate-900/80 p-2.5">
                      <span className="font-hud font-bold text-amber-300 uppercase">
                        Carries In:
                      </span>
                      <p className="mt-0.5 text-slate-300">{missionSpec.reuseInput}</p>
                    </div>
                    <div className="rounded border border-emerald-500/30 bg-emerald-950/35 p-2.5">
                      <span className="font-hud font-bold text-emerald-300 uppercase">
                        Unlocks Next:
                      </span>
                      <p className="mt-0.5 text-emerald-100">{missionSpec.reuseOutput}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 font-mono-tech text-[10px] text-slate-400">
                    NASA Grounding: {missionSpec.nasaGrounding}
                  </p>
                </div>
              </section>

              {/* Payload Mass vs Resource Trade-Off Explorer */}
              <section className="hud-panel rounded-xl p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-hud text-xs font-bold tracking-wider text-amber-300 uppercase">
                    Cargo Mass vs Survival Trade-Off
                  </h2>
                  <span className="font-mono-tech text-[10px] text-slate-400">ROCKET EQUATION</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PAYLOADS) as PayloadId[]).map((pid) => {
                    const p = PAYLOADS[pid];
                    const active = selectedPayload === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setSelectedPayload(pid)}
                        className={`min-h-[46px] rounded-lg border px-2.5 py-2 text-left transition ${
                          active
                            ? 'border-cyan-400 bg-cyan-500/20 text-white'
                            : 'border-slate-700/80 bg-slate-900/75 text-slate-300'
                        }`}
                      >
                        <div className="font-hud text-xs font-bold">{p.name}</div>
                        <div className="mt-0.5 font-mono-tech text-[10px] text-amber-300">
                          {p.shortTag} · ×{p.massMultiplier.toFixed(2)} mass
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 rounded-lg border border-slate-700/80 bg-slate-950/90 p-3 text-xs">
                  <div className="flex items-center justify-between font-hud font-bold text-white">
                    <span>{payloadSpec.name}</span>
                    <span className="font-mono-tech text-cyan-300">
                      {payloadSpec.fragile ? 'FRAGILE (<2.5 m/s)' : `MASS ×${payloadSpec.massMultiplier}`}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300">{payloadSpec.description}</p>
                  <p className="mt-1.5 font-mono-tech text-[11px] text-amber-200">
                    Trade-off: {payloadSpec.tradeoffHint}
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: SPACECRAFT & HARDWARE SUBSYSTEMS */}
          {activeTab === 'vehicles' && (
            <div className="flex flex-col gap-4">
              <section className="hud-panel overflow-hidden rounded-xl p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
                    Hardware Blueprint Study
                  </h2>
                  <span className="font-mono-tech text-[10px] text-slate-400">5 CRAFT MODELS</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
                  <img
                    src={vehicleShowcaseImg}
                    alt="Apollo-Class Dual-Planet Lander and NASA VIPER Rover CAD Technical Showcase"
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {VEHICLE_ORDER.map((v) => {
                    const active = selectedVehicle === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicle(v.id)}
                        className={`min-h-[38px] rounded-lg border px-2.5 py-1.5 font-hud text-[11px] font-bold uppercase transition ${
                          active
                            ? 'border-cyan-400 bg-cyan-500/20 text-white'
                            : 'border-slate-700/80 bg-slate-900/75 text-slate-300'
                        }`}
                      >
                        {v.short}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-lg border border-cyan-500/25 bg-slate-950/90 p-3.5">
                  <h3 className="font-display text-sm font-bold text-white">{vehicleSpec.title}</h3>
                  <p className="mt-0.5 font-mono-tech text-[11px] text-cyan-300">
                    {vehicleSpec.subtitle}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-300">{vehicleSpec.summary}</p>

                  <div className="mt-3 flex flex-col gap-2">
                    {vehicleSpec.parts.map((part) => (
                      <div
                        key={part.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/85 p-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-hud text-xs font-bold text-amber-300">
                            {part.name}
                          </span>
                          <span className="font-mono-tech text-[10px] text-cyan-300 uppercase">
                            {part.role}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-200">{part.fact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: INTERACTIVE FLIGHT & ANOMALY LAB */}
          {activeTab === 'training' && (
            <div className="flex flex-col gap-4">
              {/* Interactive Decision Trainer */}
              <section className="hud-panel-amber rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <h2 className="font-hud text-xs font-bold tracking-wider text-amber-300 uppercase">
                      Interactive Anomaly Simulator
                    </h2>
                  </div>
                  <span className="font-mono-tech text-[11px] font-bold text-emerald-300">
                    {solvedCount}/{CAMPAIGN_ANOMALIES.length} OPTIMAL
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Practice real Artemis &amp; Mars emergency calls grounded in NASA OSDR radiobiology
                  studies before flying on Desktop.
                </p>

                <div className="mt-3 flex flex-col gap-3">
                  {CAMPAIGN_ANOMALIES.map((anom) => {
                    const pickedId = anomalyPicks[anom.id];
                    const pickedChoice = anom.choices.find((c) => c.id === pickedId) || null;
                    return (
                      <div
                        key={anom.id}
                        className="rounded-lg border border-slate-700/85 bg-slate-950/90 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <h3 className="font-hud text-xs font-bold text-white">{anom.title}</h3>
                          <span className="font-mono-tech text-[10px] text-cyan-300">
                            {anom.nasaRef}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{anom.context}</p>

                        <div className="mt-2.5 flex flex-col gap-1.5">
                          {anom.choices.map((ch) => {
                            const selected = pickedId === ch.id;
                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() =>
                                  setAnomalyPicks((prev) => ({ ...prev, [anom.id]: ch.id }))
                                }
                                className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                                  selected
                                    ? ch.isOptimal
                                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                                      : 'border-rose-400 bg-rose-500/20 text-rose-100'
                                    : 'border-slate-700/80 bg-slate-900/75 text-slate-200 hover:border-cyan-400/50'
                                }`}
                              >
                                <span className="font-medium leading-snug">{ch.label}</span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              </button>
                            );
                          })}
                        </div>

                        {pickedChoice && (
                          <div
                            className={`mt-2.5 rounded-lg border p-2.5 text-[11px] ${
                              pickedChoice.isOptimal
                                ? 'border-emerald-400/50 bg-emerald-950/45 text-emerald-100'
                                : 'border-amber-400/50 bg-amber-950/45 text-amber-100'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono-tech font-bold">
                              <span>
                                {pickedChoice.isOptimal
                                  ? 'OPTIMAL NASA PROTOCOL'
                                  : 'SUBOPTIMAL TRADE-OFF'}
                              </span>
                              <span>
                                +{pickedChoice.doseDeltaMsv} mSv · ×{pickedChoice.scienceMultiplier} Sci
                              </span>
                            </div>
                            <p className="mt-1 leading-relaxed">{pickedChoice.rationale}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Physics & Controls Study Cards */}
              <section className="hud-panel rounded-xl p-3.5">
                <h2 className="font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
                  Desktop Flight Physics &amp; Controls Manual
                </h2>
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
                    <div className="flex items-center gap-1.5 font-hud text-xs font-bold text-amber-300 uppercase">
                      <Flame className="h-3.5 w-3.5" />
                      SLS Ascent Staging
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                      <li>• Ignite at T-0 with [W / ↑] — no auto-liftoff</li>
                      <li>• SRB Jettison at {PHYSICS.SLS_SRB_SEP_ALT_KM} km ([SPACE])</li>
                      <li>• LAS Tower clears at {PHYSICS.SLS_LAS_JETTISON_ALT_KM} km</li>
                      <li>• Core Cutoff at {PHYSICS.SLS_CORE_SEP_ALT_KM} km → ICPS {PHYSICS.SLS_ORBIT_TARGET_KM} km</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
                    <div className="flex items-center gap-1.5 font-hud text-xs font-bold text-cyan-300 uppercase">
                      <Radar className="h-3.5 w-3.5" />
                      Powered Descent (Moon &amp; Mars)
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                      <li>• Moon g = {PHYSICS.MOON_GRAVITY} m/s² vs Mars {PHYSICS.MARS_GRAVITY} m/s²</li>
                      <li>• Pintle Throttle [W/Z], Hover [H], Cutoff [X]</li>
                      <li>• Kill Drift [B] fires 4-axis lateral RCS thrusters</li>
                      <li>• Contact Light Auto-Cut [K] &amp; E-Guidance [G]</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
                    <div className="flex items-center gap-1.5 font-hud text-xs font-bold text-emerald-300 uppercase">
                      <Cpu className="h-3.5 w-3.5" />
                      VIPER 4-Mode Mobility
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                      <li>• [1] Ackermann Drive ({PHYSICS.ROVER_MAX_SPEED} m/s transit · ±{PHYSICS.SURFACE_BOUND_M}m)</li>
                      <li>• [2] All-Wheel Crab Strafe (pad alignment)</li>
                      <li>• [3] Zero-Radius Turn-in-Place Spin</li>
                      <li>• [4] Walker Gait + [F] High Clearance slopes</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-3">
                    <div className="flex items-center gap-1.5 font-hud text-xs font-bold text-orange-300 uppercase">
                      <Radio className="h-3.5 w-3.5" />
                      Touchdown Limits
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                      <li>• Soft Landing: sink &lt;{PHYSICS.LANDER_PERFECT_VY} m/s, tilt &lt;{PHYSICS.LANDER_PERFECT_TILT}°</li>
                      <li>• Fragile Malapert Solar Wing requires &lt;2.5 m/s</li>
                      <li>• Pass 4 Approach Gates for +Bonus Telemetry</li>
                      <li>• Avoid steep &gt;13° crater flanks via Radar</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: LIVE NASA TELEMETRY & FIELD NOTES */}
          {activeTab === 'data' && (
            <div className="flex flex-col gap-4">
              {/* Live DONKI Banner */}
              <section className="hud-panel rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-300" />
                    <h2 className="font-hud text-xs font-bold tracking-wider text-amber-300 uppercase">
                      NASA DONKI Space Weather Feed
                    </h2>
                  </div>
                  <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-300 uppercase">
                    {donki.isLive ? 'LIVE FEED' : donki.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950/85 p-2.5 text-xs">
                  <div>
                    <div className="font-mono-tech text-[10px] text-slate-400 uppercase">
                      Flare Class
                    </div>
                    <div className="font-display text-sm font-bold text-amber-200">
                      {donki.classType}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono-tech text-[10px] text-slate-400 uppercase">
                      Source Region
                    </div>
                    <div className="font-hud text-xs font-bold text-cyan-200">
                      {donki.sourceLocation || 'Solar Disk'}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{donki.description}</p>
              </section>

              {/* Field Notes Ledger */}
              <section className="hud-panel rounded-xl p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-300" />
                    <h2 className="font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
                      Astronaut Field Notes ({filteredNotes.length})
                    </h2>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(['all', 'osdr', 'isru', 'donki', 'vehicle'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNoteFilter(cat)}
                      className={`min-h-[32px] rounded-md border px-2.5 py-1 font-hud text-[10px] font-bold uppercase transition ${
                        noteFilter === cat
                          ? 'border-cyan-400 bg-cyan-500/20 text-white'
                          : 'border-slate-700 bg-slate-900/75 text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {filteredNotes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/90 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h3 className="font-hud text-xs font-bold text-white">{note.title}</h3>
                        <span className="font-mono-tech text-[10px] text-amber-300">
                          {note.sourceRef}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{note.summary}</p>
                      <div className="mt-2 rounded border border-emerald-500/25 bg-emerald-950/30 px-2.5 py-1.5 font-mono-tech text-[11px] text-emerald-200">
                        Applied Rule: {note.appliedRule}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* OSDR Radiobiology Studies */}
              <section className="hud-panel rounded-xl p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-hud text-xs font-bold tracking-wider text-emerald-300 uppercase">
                    NASA OSDR Radiobiology Grounding
                  </h2>
                </div>

                {osdr.studies.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {osdr.studies.map((st) => (
                      <div
                        key={st.accession}
                        className="rounded-lg border border-slate-800 bg-slate-950/90 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono-tech text-[11px] text-emerald-300">
                          <span>{st.accession}</span>
                          <span>-{st.shieldingAttenuationPct}% Dose</span>
                        </div>
                        <div className="mt-0.5 font-hud font-bold text-white">{st.title}</div>
                        <p className="mt-1 text-slate-300">{st.keyFinding}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {OSDR_FACTS.map((fact) => (
                      <div
                        key={fact.code}
                        className="rounded-lg border border-slate-800 bg-slate-950/90 p-2.5 text-xs"
                      >
                        <div className="font-mono-tech text-[11px] font-bold text-emerald-300">
                          {fact.code}
                        </div>
                        <p className="mt-0.5 text-slate-300">{fact.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
