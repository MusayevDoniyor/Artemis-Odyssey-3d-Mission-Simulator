import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  HelpCircle,
  Layers,
  Link2,
  Play,
  RotateCw,
  Tag,
} from 'lucide-react';
import { HARDWARE_CATALOG, HARDWARE_ORDER } from '../game/hardwareCatalog';
import type { InspectorLabelPoint, InspectorUiState, VehicleShowcaseId } from '../game/types';
import { CameraViewControls } from './CameraViewControls';
import { MissionTelemetryStrip } from './MissionTelemetryStrip';

interface VehicleInspectorOverlayProps {
  showcase: VehicleShowcaseId;
  selectedPartId: string | null;
  unlockedNotes: string[];
  inspectorUi: InspectorUiState;
  labelPoints: InspectorLabelPoint[];
  onUpdateInspectorUi: (partial: Partial<InspectorUiState>) => void;
  onStartQuiz: () => void;
  onSelectVehicle: (v: VehicleShowcaseId) => void;
  onSelectPart: (partId: string | null) => void;
  onSetCameraPreset: (yaw: number, pitch: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
  onBackTitle: () => void;
  onStartMission: () => void;
  onOpenNotebook: () => void;
}

export function VehicleInspectorOverlay({
  showcase,
  selectedPartId,
  unlockedNotes,
  inspectorUi,
  labelPoints,
  onUpdateInspectorUi,
  onStartQuiz,
  onSelectVehicle,
  onSelectPart,
  onSetCameraPreset,
  onZoomCamera,
  onResetCamera,
  onBackTitle,
  onStartMission,
  onOpenNotebook,
}: VehicleInspectorOverlayProps) {
  const catalog = HARDWARE_CATALOG[showcase];
  const activePart = catalog.parts.find((p) => p.id === selectedPartId) || catalog.parts[0];
  const quizTarget = inspectorUi.quizTargetId
    ? catalog.parts.find((p) => p.id === inspectorUi.quizTargetId) || null
    : null;
  const noteLogged = activePart.unlockNoteId ? unlockedNotes.includes(activePart.unlockNoteId) : false;

  const connectedSpecs = activePart.connections
    .map((cid) => catalog.parts.find((p) => p.id === cid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Projected 3D Leader-Line Labels Overlay (only active when showLabels is true) */}
      {inspectorUi.showLabels && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {labelPoints
            .filter((pt) => pt.visible)
            .map((pt) => {
              const isSelected = pt.partId === activePart.id;
              return (
                <button
                  key={pt.partId}
                  type="button"
                  onClick={() => onSelectPart(pt.partId)}
                  style={{
                    left: `${Math.min(86, Math.max(14, pt.xPct))}%`,
                    top: `${Math.min(68, Math.max(16, pt.yPct))}%`,
                  }}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded border px-2 py-0.5 font-hud text-[10px] font-bold whitespace-nowrap shadow transition ${
                    isSelected
                      ? 'border-amber-400 bg-slate-950/95 text-amber-300'
                      : 'border-cyan-400/60 bg-slate-950/90 text-cyan-200 hover:border-amber-300'
                  }`}
                >
                  {pt.name}
                </button>
              );
            })}
        </div>
      )}

      {/* Top Bar + Telemetry Strip */}
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackTitle}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-slate-100 uppercase hover:border-cyan-400/70"
            >
              <ArrowLeft className="h-4 w-4 text-cyan-300" />
              Command Deck
            </button>

            <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg p-1">
              {HARDWARE_ORDER.map((id) => {
                const spec = HARDWARE_CATALOG[id];
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`inspector-craft-${id}`}
                    onClick={() => {
                      onSelectVehicle(id);
                      onSelectPart(spec.parts[0].id);
                    }}
                    className={`rounded-md px-2.5 py-1.5 font-hud text-xs font-bold whitespace-nowrap transition ${
                      showcase === id
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {spec.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CameraViewControls
              compact
              onSelectPreset={onSetCameraPreset}
              onZoom={onZoomCamera}
              onReset={onResetCamera}
            />

            <button
              type="button"
              onClick={onOpenNotebook}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-hud text-xs font-bold whitespace-nowrap text-amber-200 uppercase hover:border-amber-400"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-300" />
              Ledger ({unlockedNotes.length})
            </button>

            <button
              type="button"
              onClick={onStartMission}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
            >
              <Play className="h-3.5 w-3.5 fill-slate-950" />
              Briefing
            </button>
          </div>
        </div>

        <MissionTelemetryStrip
          context="inspector"
          elapsedSec={0}
          phaseLabel={`HARDWARE BAY · ${catalog.shortLabel}`}
          nextMilestone={inspectorUi.quizMode ? `Quiz Score ${inspectorUi.quizScore}` : 'Click 3D Subsystems'}
          etaLabel="SANDBOX"
          metrics={[
            { label: 'Explode', value: `${inspectorUi.explodePct}%`, tone: 'amber' },
            { label: 'Part', value: activePart.role, tone: 'cyan' },
          ]}
        />

        {/* Quiz Prompt Banner */}
        {inspectorUi.quizMode && quizTarget && (
          <div
            data-testid="inspector-quiz-banner"
            className="hud-panel-amber tactical-frame pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl px-4 py-2 text-xs"
          >
            <div>
              <span className="font-display font-bold text-amber-300 uppercase">
                Part Finder Challenge (Score: {inspectorUi.quizScore}):{' '}
              </span>
              <span className="text-slate-100">{quizTarget.quizPrompt}</span>
              {inspectorUi.quizFeedback && (
                <p className="mt-0.5 font-mono-tech text-[11px] font-bold text-emerald-300">
                  {inspectorUi.quizFeedback}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateInspectorUi({ quizMode: false, quizTargetId: null, quizFeedback: null })
              }
              className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 font-hud text-[11px] font-bold text-slate-200 uppercase hover:border-amber-400"
            >
              Exit Quiz
            </button>
          </div>
        )}
      </div>

      {/* Bottom Compact Part Inspector & Engineering Controls */}
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="hud-panel tactical-frame pointer-events-auto rounded-xl p-3.5">
          {/* Interactive CAD Controls Row */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-cyan-500/20 pb-2.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-white uppercase">
                  {catalog.title}
                </h2>
                <span className="rounded border border-cyan-400/40 bg-cyan-500/15 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-cyan-200">
                  {activePart.badge}
                </span>
              </div>
              <p className="font-mono-tech text-[11px] font-semibold text-cyan-300">
                {catalog.subtitle}
              </p>
            </div>

            {/* Explode Slider + Toggles */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1">
                <Layers className="h-3.5 w-3.5 text-amber-300" />
                <span className="font-hud font-bold text-slate-200 uppercase">Explode</span>
                <input
                  type="range"
                  aria-label="Exploded View Percentage"
                  data-testid="inspector-explode-slider"
                  min={0}
                  max={100}
                  value={inspectorUi.explodePct}
                  onChange={(e) => onUpdateInspectorUi({ explodePct: Number(e.target.value) })}
                  className="w-20 accent-amber-400"
                />
                <span className="w-8 text-right font-mono-tech font-bold text-amber-300">
                  {inspectorUi.explodePct}%
                </span>
              </label>

              <button
                type="button"
                onClick={() => onUpdateInspectorUi({ isolatePart: !inspectorUi.isolatePart })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-hud font-bold uppercase ${
                  inspectorUi.isolatePart
                    ? 'bg-amber-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Isolate
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateInspectorUi({ showConnections: !inspectorUi.showConnections })
                }
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-hud font-bold uppercase ${
                  inspectorUi.showConnections
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Links
              </button>

              <button
                type="button"
                onClick={() => onUpdateInspectorUi({ showLabels: !inspectorUi.showLabels })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-hud font-bold uppercase ${
                  inspectorUi.showLabels
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                Labels
              </button>

              <button
                type="button"
                onClick={() => onUpdateInspectorUi({ autoRotate: !inspectorUi.autoRotate })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-hud font-bold uppercase ${
                  inspectorUi.autoRotate
                    ? 'bg-sky-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" />
                Spin
              </button>

              <button
                type="button"
                data-testid="inspector-quiz-btn"
                onClick={onStartQuiz}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-hud font-bold uppercase ${
                  inspectorUi.quizMode
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Quiz
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[270px_1fr]">
            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
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
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left font-hud text-xs font-bold transition ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-white'
                        : 'border-slate-700/80 bg-slate-900/95 text-slate-200 hover:border-cyan-500/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <span
                        className={`font-mono-tech text-[10px] ${
                          active ? 'text-cyan-300' : 'text-slate-500'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span className="truncate">{part.name}</span>
                    </span>
                    {partNoteDone && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-cyan-500/30 bg-slate-950/95 p-3">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-amber-300 uppercase">
                    {activePart.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {noteLogged && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-300 uppercase">
                        LOGGED
                      </span>
                    )}
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-cyan-200">
                      {activePart.specLabel}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-100">{activePart.fact}</p>

                {inspectorUi.showConnections && connectedSpecs.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2">
                    <span className="font-hud text-[10px] font-bold text-cyan-300 uppercase">
                      Connected To:
                    </span>
                    {connectedSpecs.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectPart(c.id)}
                        className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-hud text-[10px] font-bold text-cyan-100 hover:border-amber-400"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-1.5 text-[10px] text-slate-400">
                {catalog.scenarioDistinction} · Drag canvas to orbit, scroll to zoom, or click 3D parts directly.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

