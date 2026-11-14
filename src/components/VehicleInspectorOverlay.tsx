import { ArrowLeft, BookOpen, CheckCircle2, Play, RotateCw, Wrench } from 'lucide-react';
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
  { id: 'lander', label: 'Descent Lander' },
  { id: 'rover', label: 'VIPER / Mars Rover' },
  { id: 'outpost', label: 'Surface Base' },
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
            className="hud-panel pointer-events-auto inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400/60"
          >
            <ArrowLeft className="h-4 w-4 text-sky-300" />
            Back
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
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  showcase === v.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hud-panel hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-200 xl:flex">
            <RotateCw className="h-3.5 w-3.5 text-sky-300" />
            Drag 3D view to orbit · Scroll to zoom
          </div>

          <button
            type="button"
            onClick={onOpenNotebook}
            className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-amber-200 hover:border-amber-400"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-300" />
            Field Notes ({unlockedNotes.length})
          </button>

          <button
            type="button"
            onClick={onStartMission}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-bold tracking-wide text-slate-950 hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            START CAMPAIGN
          </button>
        </div>
      </div>

      {/* Bottom Compact Part Inspector Dock (keeps > 75% center viewport completely open) */}
      <div className="mx-auto w-full max-w-4xl">
        <div className="hud-panel pointer-events-auto rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 pb-2.5">
            <div>
              <h2 className="font-display text-lg font-bold text-white">{catalog.title}</h2>
              <p className="text-xs text-sky-300">{catalog.subtitle}</p>
            </div>
            <p className="max-w-md text-xs text-slate-200">{catalog.summary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[270px_1fr]">
            <div className="flex flex-col gap-1.5">
              {catalog.parts.map((part) => {
                const active = activePart.id === part.id;
                const partNoteDone = part.unlockNoteId
                  ? unlockedNotes.includes(part.unlockNoteId)
                  : false;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => onSelectPart(part.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Wrench
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active ? 'text-sky-300' : 'text-slate-400'
                        }`}
                      />
                      {part.name}
                    </span>
                    {partNoteDone && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-sky-500/30 bg-slate-950/75 p-3.5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-amber-300">
                  {activePart.name}
                </span>
                <div className="flex items-center gap-2">
                  {noteLogged && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Logged to Field Notebook
                    </span>
                  )}
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
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
  );
}
