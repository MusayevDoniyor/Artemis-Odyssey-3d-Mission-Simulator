import { ExternalLink, Globe, MapPin, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OSDR_FACTS } from '../game/constants';
import type { DonkiStatus } from '../game/types';

interface NasaDataModalProps {
  open: boolean;
  donki: DonkiStatus;
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

export function NasaDataModal({ open, donki, onClose }: NasaDataModalProps) {
  const [searchTopic, setSearchTopic] = useState<'artemis' | 'radiation' | 'rover'>('artemis');
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
    ])
      .then(([searchData, mapsData]) => {
        if (cancelled) return;
        setSearchResult(searchData);
        if (!mapsResult) setMapsResult(mapsData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, searchTopic, mapsResult]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="hud-panel max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between border-b border-slate-700/70 pb-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-sky-300 uppercase">
              NASA Open Datasets · Live Search & Maps Grounding
            </p>
            <h2 className="font-display text-2xl font-bold text-white">Real Space Data Behind Your Mission</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1. NASA DONKI Live Space Weather */}
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-amber-200">
              <Shield className="h-4 w-4 text-amber-400" />
              NASA DONKI Solar Activity: {donki.classType}
            </span>
            <a
              href={donki.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:underline"
            >
              Open DONKI <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">{donki.description}</p>
        </div>

        {/* 2. Live Google Search Grounded NASA Mission Brief */}
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-white">
              <Globe className="h-4 w-4 text-sky-300" />
              NASA Mission Science Brief
            </span>
            <div className="flex gap-1.5">
              {(
                [
                  { id: 'artemis', label: 'Artemis' },
                  { id: 'radiation', label: 'Radiation (OSDR)' },
                  { id: 'rover', label: 'VIPER Ice Drill' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSearchTopic(t.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    searchTopic === t.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-slate-300">Fetching NASA mission brief...</p>
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

        {/* 3. Google Maps Grounded NASA Launch & Lunar Analog Sites */}
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-white">
            <MapPin className="h-4 w-4 text-emerald-400" />
            Real NASA Facilities & Analog Sites (Google Maps)
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
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-700/80 bg-slate-950/70 p-2.5 text-xs hover:border-emerald-400/60"
              >
                <div>
                  <div className="font-semibold text-emerald-200">{place.title}</div>
                  {place.snippet && <p className="mt-0.5 text-[11px] text-slate-300">{place.snippet}</p>}
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              </a>
            ))}
          </div>
        </div>

        {/* 4. OSDR / Artemis Open Dataset Reference */}
        <div className="grid gap-2 sm:grid-cols-3">
          {OSDR_FACTS.map((f) => (
            <div key={f.code} className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-3">
              <div className="mb-1 text-xs font-bold text-sky-300">{f.code}</div>
              <p className="text-[11px] leading-relaxed text-slate-300">{f.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
