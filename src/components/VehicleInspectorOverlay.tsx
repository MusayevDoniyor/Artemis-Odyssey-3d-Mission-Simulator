import { ArrowLeft, BookOpen, CheckCircle2, Play } from 'lucide-react';
import { VEHICLE_CATALOG } from '../game/constants';
import type { VehicleShowcaseId } from '../game/types';

interface VehicleInspectorOverlayProps {
  showcase: VehicleShowcaseId;
  selectedPartId: string | null;
  unlockedNotes: string[];
  onSelectVehicle: (v: VehicleShowcaseId) => void;
  onSelectPart: (partId: string | null) => void;
  onBackTitle: () => void;
  onStartMission: () => void;
  onOpenNotebook: () => void;
}

const VEHICLES: Array<{ id: VehicleShowcaseId; label: string }> = [
  { id: 'rocket', label: 'SLS Rocket' },
  { id: 'satellite', label: 'HERMES Sat' },
  { id: 'lander', label: 'Lander' },
  { id: 'rover', label: 'Rover' },
  { id: 'outpost', label: 'Base Camp' },
];

export function VehicleInspectorOverlay({
  showcase,
  selectedPartId,
  unlockedNotes,
  onSelectVehicle,
  onSelectPart,
  onBackTitle,
  onStartMission,
  onOpenNotebook,
}: VehicleInspectorOverlayProps) {
  const catalog = VEHICLE_CATALOG[showcase];
  const activePart = catalog.parts.find((p) => p.id === selectedPartId) || catalog.parts[0];
  const noteLogged = activePart.unlockNoteId ? unlockedNotes.includes(activePart.unlockNoteId) : false;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBackTitle}
            className="hud-panel pointer-events-auto inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-hud text-xs font-bold whitespace-nowrap text-slate-100 uppercase hover:border-cyan-400/70"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-300" />
            Command Deck
          </button>

          <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg p-1">
            {VEHICLES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onSelectVehicle(v.id);
                  onSelectPart(VEHICLE_CATALOG[v.id].parts[0].id);
                }}
                className={`rounded-md px-3 py-1.5 font-hud text-xs font-bold whitespace-nowrap transition ${
                  showcase === v.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hud-panel hidden rounded-lg px-3 py-2 font-mono-tech text-[11px] text-slate-300 xl:block">
            Drag 360° · Scroll Zoom
          </div>

          <button
            type="button"
            onClick={onOpenNotebook}
            className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-amber-200 uppercase hover:border-amber-400"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-300" />
            Ledger ({unlockedNotes.length})
          </button>

          <button
            type="button"
            onClick={onStartMission}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            Briefing
          </button>
        </div>
      </div>

      {/* Bottom Compact Part Inspector Dock (keeps > 75% center viewport completely open) */}
      <div className="mx-auto w-full max-w-4xl">
        <div className="hud-panel tactical-frame pointer-events-auto rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
            <div>
              <h2 className="font-display text-lg font-bold text-white uppercase">{catalog.title}</h2>
              <p className="font-mono-tech text-xs font-semibold text-cyan-300">
                {catalog.subtitle}
              </p>
            </div>
            <p className="max-w-sm text-xs text-slate-300">{catalog.summary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[260px_1fr]">
            <div className="flex flex-col gap-1.5">
              {catalog.parts.map((part, idx) => {
                const active = activePart.id === part.id;
                const partNoteDone = part.unlockNoteId
                  ? unlockedNotes.includes(part.unlockNoteId)
                  : false;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => onSelectPart(part.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left font-hud text-xs font-bold transition ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-white'
                        : 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-cyan-500/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`font-mono-tech text-[10px] ${
                          active ? 'text-cyan-300' : 'text-slate-500'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      {part.name}
                    </span>
                    {partNoteDone && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-cyan-500/30 bg-slate-950/80 p-3.5">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-amber-300 uppercase">
                    {activePart.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {noteLogged && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-300 uppercase">
                        LOGGED
                      </span>
                    )}
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-hud text-[11px] font-bold text-cyan-200">
                      {activePart.role}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-100">{activePart.fact}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
