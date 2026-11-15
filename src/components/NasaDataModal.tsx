import { ExternalLink, Globe, MapPin, ShieldAlert, Table2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OSDR_FACTS } from '../game/constants';
import type { DonkiStatus, OsdrStatus } from '../game/types';

interface NasaDataModalProps {
  open: boolean;
  donki: DonkiStatus;
  osdr: OsdrStatus;
  onClose: () => void;
}

interface GroundingSource {
  title: string;
  uri: string;
}

interface LaunchPlace {
  title: string;
  uri: string;
  snippet?: string;
}

interface JplReferenceResponse {
  source: string;
  isLive: boolean;
  note: string;
  bodies: Array<{ name: string; au: number; lightTime: string; gravityG: number }>;
}

export function NasaDataModal({ open, donki, osdr, onClose }: NasaDataModalProps) {
  const [searchTopic, setSearchTopic] = useState<'artemis' | 'radiation' | 'rover' | 'mars'>('artemis');
  const [searchResult, setSearchResult] = useState<{
    summary: string;
    sources: GroundingSource[];
    grounded: boolean;
  } | null>(null);
  const [mapsResult, setMapsResult] = useState<{
    summary: string;
    places: LaunchPlace[];
    grounded: boolean;
  } | null>(null);
  const [jplRef, setJplRef] = useState<JplReferenceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`/api/nasa-grounding?topic=${searchTopic}`).then((r) => r.json()),
      mapsResult
        ? Promise.resolve(mapsResult)
        : fetch('/api/launch-sites').then((r) => r.json()),
      jplRef
        ? Promise.resolve(jplRef)
        : fetch('/api/jpl-reference').then((r) => r.json()),
    ])
      .then(([searchData, mapsData, jplData]) => {
        if (cancelled) return;
        setSearchResult(searchData);
        if (!mapsResult) setMapsResult(mapsData);
        if (!jplRef) setJplRef(jplData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, searchTopic, mapsResult, jplRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-4">
      <div
        data-testid="nasa-data-modal"
        className="hud-panel tactical-frame animate-modal-enter flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl p-6"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between border-b border-sky-400/20 pb-3">
          <div>
            <p className="font-hud text-[11px] font-bold tracking-[0.18em] text-sky-300 uppercase">
              DONKI · OSDR · JPL Reference · Grounded Briefs
            </p>
            <h2 className="font-display text-2xl font-bold text-white uppercase">
              NASA Mission Telemetry &amp; Honesty Ledger
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close NASA Data modal"
            onClick={onClose}
            className="rounded-xl border border-sky-400/25 bg-slate-900/75 p-2 text-slate-300 hover:border-sky-400/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {/* 1. NASA DONKI Live Space Weather */}
          <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-bold text-amber-200 uppercase">
                  DONKI Space Weather: {donki.classType}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono-tech text-[10px] font-bold ${
                    donki.isLive
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                  }`}
                >
                  {donki.isLive ? 'LIVE API' : 'ARCHIVED DATA'}
                </span>
              </div>
              <a
                href={donki.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-hud text-xs font-bold text-sky-300 hover:underline"
              >
                Open DONKI <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-slate-200">{donki.description}</p>
            <div className="mt-2 flex flex-wrap gap-3 font-mono-tech text-[11px] text-slate-300 tabular-nums">
              <span>30d Flares (FLR): {donki.totalEvents30d ?? 'Sample'}</span>
              <span>· CMEs: {donki.cmeCount30d ?? 0}</span>
              <span>· Geomagnetic Storms (GST): {donki.gstCount30d ?? 0}</span>
            </div>
          </div>

          {/* 2. Data Honesty & Scenario Attribution */}
          <div className="mb-4 rounded-xl border border-sky-400/20 bg-slate-900/65 p-4">
            <div className="mb-2 flex items-center gap-2 font-display text-xs font-bold tracking-wider text-sky-300 uppercase">
              <ShieldAlert className="h-4 w-4 text-sky-300" />
              Data Honesty &amp; Training Scenario Attribution
            </div>
            <div className="grid gap-2.5 text-[11px] leading-relaxed text-slate-200 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/30 bg-slate-950/65 p-3">
                <span className="mb-1 inline-block rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 font-mono-tech text-[9px] font-bold text-emerald-300">
                  REAL DATA
                </span>
                <p>
                  Physical specs verified from NASA SLS Block 1, Orion, VIPER (0.18 m/s &amp; 1 m TRIDENT drill),
                  JWST, Voyager, Perseverance EDL/MOXIE, JPL Horizons light-time/gravity, and live/archived DONKI + OSDR feeds.
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-slate-950/65 p-3">
                <span className="mb-1 inline-block rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 font-mono-tech text-[9px] font-bold text-amber-300">
                  SIMULATED VALUE
                </span>
                <p>
                  This game combines real NASA Moon &amp; Mars missions into one unified Junior Astronaut training campaign.
                  Orbital radii, ascent time, and rover Kid Explore ×25 travel speed are compressed so ages 7–12 can fly every phase in minutes.
                </p>
              </div>
            </div>
          </div>

          {/* 3. NASA JPL Light-Time & Gravity Reference Table */}
          {jplRef && (
            <div className="mb-4 rounded-xl border border-sky-400/20 bg-slate-900/65 p-4">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-white uppercase">
                  <Table2 className="h-4 w-4 text-sky-300" />
                  JPL Light-Time &amp; Surface Gravity Reference
                </span>
                <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-300">
                  REAL DATA · {jplRef.bodies.length} WORLDS
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono-tech text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-700 text-[10px] text-slate-400 uppercase">
                      <th className="py-1.5 pr-3">World</th>
                      <th className="py-1.5 pr-3">Distance (AU)</th>
                      <th className="py-1.5 pr-3">One-Way Light Time</th>
                      <th className="py-1.5 pr-3">Surface Gravity</th>
                      <th className="py-1.5">35 kg Astronaut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jplRef.bodies.map((b) => (
                      <tr key={b.name} className="border-b border-slate-800/80 text-slate-200">
                        <td className="py-1.5 pr-3 font-bold text-white">{b.name}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{b.au.toFixed(2)} AU</td>
                        <td className="py-1.5 pr-3 text-sky-300">{b.lightTime}</td>
                        <td className="py-1.5 pr-3 text-amber-300">{b.gravityG} g</td>
                        <td className="py-1.5 text-emerald-300">
                          {(35 * b.gravityG).toFixed(1)} kg eq
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. NASA OSDR Live Radiation & Biology Studies */}
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-slate-900/65 p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold text-emerald-200 uppercase">
                OSDR Radiation &amp; Biology Studies
              </span>
              <span className="font-mono-tech text-[11px] font-semibold text-emerald-300">
                {osdr.isLive ? 'LIVE API' : 'ARCHIVED DATA'} · {osdr.totalCatalogStudies} Hits
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {osdr.studies.map((study) => (
                <a
                  key={study.accession}
                  href={study.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-sky-400/20 bg-slate-950/65 p-3 text-left transition hover:border-emerald-400/60"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-xs font-bold text-emerald-300">
                      {study.accession}
                    </span>
                    <span className="font-mono-tech text-[10px] font-semibold text-amber-300">
                      -{study.shieldingAttenuationPct}% Dose · {study.doseThresholdMsv} mSv
                    </span>
                  </div>
                  <div className="font-hud text-xs font-bold text-white">{study.title}</div>
                  <p className="mt-1 text-[11px] text-slate-300">{study.keyFinding}</p>
                  <p className="mt-1.5 text-[11px] font-semibold text-sky-300">
                    Rule: {study.gameplayRule}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {/* 5. Live Google Search Grounded NASA Mission Brief */}
          <div className="mb-4 rounded-xl border border-sky-400/20 bg-slate-900/65 p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-white uppercase">
                <Globe className="h-4 w-4 text-sky-300" />
                NASA Mission Science Brief
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'artemis', label: 'Artemis II–IV' },
                    { id: 'radiation', label: 'Radiation (OSDR)' },
                    { id: 'rover', label: 'VIPER South Pole' },
                    { id: 'mars', label: 'Mars Jezero & MOXIE' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSearchTopic(t.id)}
                    className={`rounded-lg px-2.5 py-1 font-hud text-xs font-bold whitespace-nowrap ${
                      searchTopic === t.id
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="font-mono-tech text-xs text-sky-300">Querying NASA dataset brief...</p>
            ) : (
              <>
                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-100">
                  {searchResult?.summary}
                </p>
                {searchResult && searchResult.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {searchResult.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/25"
                      >
                        {src.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 6. Google Maps Grounded NASA Launch & Analog Sites */}
          <div className="mb-4 rounded-xl border border-sky-400/20 bg-slate-900/65 p-4">
            <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-white uppercase">
              <MapPin className="h-4 w-4 text-emerald-400" />
              NASA Launch &amp; Analog Facilities
            </div>
            <p className="mb-3 text-xs leading-relaxed text-slate-200">
              {mapsResult?.summary || 'Loading launch complex and Mission Control map coordinates...'}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(mapsResult?.places || []).map((place, idx) => (
                <a
                  key={idx}
                  href={place.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-2 rounded-lg border border-sky-400/20 bg-slate-950/65 p-2.5 text-xs hover:border-emerald-400/60"
                >
                  <div>
                    <div className="font-hud font-bold text-emerald-200">{place.title}</div>
                    {place.snippet && (
                      <p className="mt-0.5 text-[11px] text-slate-300">{place.snippet}</p>
                    )}
                  </div>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                </a>
              ))}
            </div>
          </div>

          {/* 7. OSDR / Artemis Open Dataset Reference */}
          <div className="grid gap-2 sm:grid-cols-3">
            {OSDR_FACTS.map((f) => (
              <div
                key={f.code}
                className="rounded-lg border border-sky-400/20 bg-slate-950/65 p-3"
              >
                <div className="mb-1 font-mono-tech text-xs font-bold text-sky-300">{f.code}</div>
                <p className="text-[11px] leading-relaxed text-slate-300">{f.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
