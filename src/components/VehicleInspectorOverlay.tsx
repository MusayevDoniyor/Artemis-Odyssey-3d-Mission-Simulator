import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  HelpCircle,
  Layers,
  Play,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react';
import { HARDWARE_CATALOG, HARDWARE_ORDER } from '../game/hardwareCatalog';
import type { InspectorLabelPoint, InspectorUiState, VehicleShowcaseId } from '../game/types';
import { EngineeringLabWidget } from './EngineeringLabWidget';

interface VehicleInspectorOverlayProps {
  showcase: VehicleShowcaseId;
  selectedPartId: string | null;
  unlockedNotes: string[];
  inspectorUi: InspectorUiState;
  labelPoints: InspectorLabelPoint[];
  onUpdateInspectorUi: (partial: Partial<InspectorUiState>) => void;
  onStartQuiz: () => void;
  onSelectVehicle: (v: VehicleShowcaseId) => void;
  onSelectPart: (partId: string | null, options?: { focusZoom?: boolean }) => void;
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
  onResetCamera,
  onBackTitle,
  onStartMission,
  onOpenNotebook,
}: VehicleInspectorOverlayProps) {
  const catalog = HARDWARE_CATALOG[showcase];
  const activePart = selectedPartId
    ? catalog.parts.find((p) => p.id === selectedPartId) || null
    : null;
  const quizTarget = inspectorUi.quizTargetId
    ? catalog.parts.find((p) => p.id === inspectorUi.quizTargetId) || null
    : null;

  const [quizAnswerIdx, setQuizAnswerIdx] = useState<number | null>(null);

  useEffect(() => {
    setQuizAnswerIdx(null);
  }, [showcase, selectedPartId]);

  const activeRightTab = inspectorUi.activeRightTab || 'overview';
  const activeEduLevel = inspectorUi.activeEduLevel || 1;
  const isModifiedView = Boolean(
    activePart ||
      inspectorUi.isolatePart ||
      inspectorUi.explodePct > 0 ||
      (inspectorUi.stageSepStep ?? 0) > 0
  );

  const eduCopy = activePart
    ? activeEduLevel === 1
      ? activePart.levels.level1What
      : activeEduLevel === 2
        ? activePart.levels.level2How
        : activePart.levels.level3Engineering
    : '';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3.5"
      data-testid="hardware-bay-overlay"
    >
      {/* Dynamic 3D Leader-Line Labels Layer */}
      {inspectorUi.showLabels && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none fixed inset-0 h-full w-full"
          >
            {labelPoints
              .filter((pt) => pt.visible)
              .map((pt) => {
                const isSelected = activePart?.id === pt.partId;
                const ax = pt.anchorXPct ?? pt.xPct;
                const ay = pt.anchorYPct ?? pt.yPct;
                return (
                  <g key={`line-${pt.partId}`}>
                    <line
                      x1={ax}
                      y1={ay}
                      x2={pt.xPct}
                      y2={pt.yPct}
                      stroke={isSelected ? '#22d3ee' : 'rgba(148, 163, 184, 0.55)'}
                      strokeWidth={isSelected ? '0.16' : '0.11'}
                      strokeDasharray={isSelected ? undefined : '0.45 0.35'}
                    />
                    <circle
                      cx={ax}
                      cy={ay}
                      r={isSelected ? '0.32' : '0.24'}
                      fill={isSelected ? '#22d3ee' : '#e2e8f0'}
                    />
                  </g>
                );
              })}
          </svg>

          {labelPoints
            .filter((pt) => pt.visible)
            .map((pt) => {
              const isSelected = activePart?.id === pt.partId;
              return (
                <button
                  key={pt.partId}
                  type="button"
                  data-testid={`label-3d-${pt.partId}`}
                  onClick={() => onSelectPart(pt.partId)}
                  style={{
                    left: `${pt.xPct}%`,
                    top: `${pt.yPct}%`,
                  }}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded border px-2 py-0.5 font-hud text-[11px] font-semibold whitespace-nowrap transition ${
                    isSelected
                      ? 'border-cyan-400 bg-[#081225] text-cyan-200 shadow-lg'
                      : 'border-slate-600/80 bg-[#070D1B]/95 text-slate-200 hover:border-cyan-400/70 hover:text-white'
                  }`}
                >
                  {pt.name}
                </button>
              );
            })}
        </div>
      )}

      {/* AREA 1: Compact Top Navigation */}
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="inspector-command-deck-btn"
              onClick={onBackTitle}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#070D1B]/95 px-3 py-1.5 font-hud text-xs font-semibold whitespace-nowrap text-slate-200 transition hover:border-cyan-400/60 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
              Command Deck
            </button>

            <nav
              aria-label="Spacecraft Hardware Bay Selector"
              className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-slate-700/75 bg-[#070D1B]/95 p-1"
            >
              {HARDWARE_ORDER.map((id) => {
                const spec = HARDWARE_CATALOG[id];
                const isActive = showcase === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`inspector-craft-${id}`}
                    onClick={() => onSelectVehicle(id)}
                    className={`rounded-md px-2.5 py-1 font-hud text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? 'border border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                        : 'border border-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {spec.shortLabel}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenNotebook}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#070D1B]/95 px-2.5 py-1.5 font-hud text-xs font-semibold whitespace-nowrap text-slate-200 transition hover:border-cyan-400/60 hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-300" />
              Ledger ({unlockedNotes.length})
            </button>

            <button
              type="button"
              onClick={onStartMission}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 font-hud text-xs font-semibold whitespace-nowrap text-cyan-100 transition hover:bg-cyan-500/30"
            >
              <Play className="h-3.5 w-3.5 text-cyan-300" />
              Briefing
            </button>
          </div>
        </div>

        {/* Part Finder Challenge Prompt */}
        {inspectorUi.quizMode && quizTarget && (
          <div
            data-testid="inspector-quiz-banner"
            className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-lg border border-amber-400/50 bg-[#130E07]/95 px-4 py-2 text-xs shadow-lg"
          >
            <div>
              <span className="font-hud font-bold text-amber-300 uppercase">
                Part Finder ({inspectorUi.quizScore} pts):{' '}
              </span>
              <span className="text-slate-100">{quizTarget.quizPrompt}</span>
              {inspectorUi.quizFeedback && (
                <p className="mt-0.5 font-mono-tech text-[11px] font-semibold text-cyan-300">
                  {inspectorUi.quizFeedback}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateInspectorUi({ quizMode: false, quizTargetId: null, quizFeedback: null })
              }
              className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 font-hud text-[11px] font-semibold text-slate-200 hover:border-amber-400"
            >
              Exit Quiz
            </button>
          </div>
        )}
      </div>

      {/* AREA 2 & 3: Left Component Inspector + Right Contextual Info Panel */}
      <div className="relative z-10 my-auto flex items-start justify-between gap-4 py-2">
        {/* Left Component Inspector */}
        <aside
          aria-label="Subsystem List"
          data-testid="inspector-left-panel"
          className="pointer-events-auto flex max-h-[calc(100vh-170px)] w-[224px] shrink-0 flex-col rounded-xl border border-slate-700/70 bg-[#070D1B]/92 p-2.5 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 px-1">
            <span className="font-hud text-[11px] font-bold tracking-wider text-slate-300 uppercase">
              Subsystems
            </span>
            <span className="font-mono-tech text-[11px] text-slate-400">
              {catalog.parts.length} units
            </span>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto pr-0.5">
            {catalog.parts.map((part, idx) => {
              const isSelected = activePart?.id === part.id;
              const isHovered = inspectorUi.hoveredPartId === part.id;
              const partNoteDone = part.unlockNoteId
                ? unlockedNotes.includes(part.unlockNoteId)
                : false;
              return (
                <button
                  key={part.id}
                  type="button"
                  data-testid={`subsystem-item-${part.id}`}
                  onMouseEnter={() => onUpdateInspectorUi({ hoveredPartId: part.id })}
                  onMouseLeave={() => onUpdateInspectorUi({ hoveredPartId: null })}
                  onClick={() => onSelectPart(part.id)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                    isSelected
                      ? 'border-cyan-400/75 bg-cyan-500/15 text-white'
                      : isHovered
                        ? 'border-slate-600 bg-slate-800/80 text-white'
                        : 'border-transparent bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`font-mono-tech text-[10px] font-bold ${
                        isSelected ? 'text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      0{idx + 1}
                    </span>
                    <span className="font-hud text-xs font-semibold leading-tight">
                      {showcase === 'rocket' ? part.name : part.shortName}
                    </span>
                  </span>
                  {partNoteDone && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Information Panel: Craft Overview OR Selected Component Engineering Brief */}
        {!activePart ? (
          <aside
            aria-label="Vehicle Overview"
            data-testid="inspector-overview-card"
            className="pointer-events-auto w-[280px] shrink-0 rounded-xl border border-slate-700/70 bg-[#070D1B]/92 p-3.5 shadow-xl"
          >
            <div className="mb-1 font-mono-tech text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
              {catalog.modelHonestyTag}
            </div>
            <h2 className="font-display text-sm font-bold text-white uppercase">
              {catalog.title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{catalog.summary}</p>

            <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-slate-800 pt-2.5">
              {catalog.overviewSpecs.map((spec) => (
                <div key={spec.label} className="rounded bg-slate-900/75 p-2">
                  <div className="text-[10px] text-slate-400">{spec.label}</div>
                  <div className="mt-0.5 font-mono-tech text-[11px] font-bold text-white">
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t border-slate-800 pt-2.5 text-[11px] text-slate-400">
              Click any 3D component or choose a subsystem on the left to zoom, inspect, and run
              engineering tests.
            </div>
          </aside>
        ) : (
          <aside
            aria-label="Selected Component Inspector"
            data-testid="inspector-right-panel"
            className="pointer-events-auto flex max-h-[calc(100vh-170px)] w-[356px] shrink-0 flex-col rounded-xl border border-slate-700/75 bg-[#070D1B]/94 shadow-2xl"
          >
            {/* Component Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-3.5 py-3">
              <div className="min-w-0">
                <div className="font-mono-tech text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                  {activePart.badge === 'REAL DATA'
                    ? 'NASA Hardware Specifications'
                    : catalog.modelHonestyTag}
                </div>
                <h2
                  className="mt-0.5 font-display text-sm leading-snug font-bold text-white uppercase"
                  data-testid="selected-part-title"
                >
                  {activePart.name}
                </h2>
                <p className="text-[11px] text-slate-400">{activePart.role}</p>
              </div>
              <button
                type="button"
                aria-label="Return to full assembly"
                onClick={() => onSelectPart(null)}
                className="rounded border border-slate-700/80 bg-slate-900/80 p-1 text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/50 px-2 pt-1.5">
              {(
                [
                  { id: 'overview', label: 'Details' },
                  { id: 'lab', label: 'Eng. Lab' },
                  { id: 'quiz', label: 'Quiz' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`inspector-tab-${tab.id}`}
                  onClick={() => onUpdateInspectorUi({ activeRightTab: tab.id })}
                  className={`border-b-2 py-1.5 font-hud text-[11px] font-semibold transition ${
                    activeRightTab === tab.id
                      ? 'border-cyan-400 text-cyan-200'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-xs">
              {activeRightTab === 'overview' && (
                <>
                  <div>
                    <div className="mb-1 font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Main Function
                    </div>
                    <p className="leading-relaxed text-slate-200">{activePart.mainFunction}</p>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 px-2.5 py-2">
                    <div className="font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Physical Dimensions
                    </div>
                    <div className="mt-0.5 font-mono-tech text-[11px] font-semibold text-white">
                      {activePart.dimensions}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Engineering Specifications
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {activePart.engineeringSpecs.map((row) => (
                        <div
                          key={row.label}
                          className="rounded border border-slate-800/80 bg-slate-900/60 p-2"
                        >
                          <div className="text-[10px] text-slate-400">{row.label}</div>
                          <div className="mt-0.5 font-mono-tech text-[11px] font-semibold text-slate-100">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3-Level Educational Selector */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <span className="font-hud text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                        Explanation Depth
                      </span>
                      <div className="flex gap-1">
                        {(
                          [
                            { lvl: 1, label: 'What' },
                            { lvl: 2, label: 'How' },
                            { lvl: 3, label: 'Eng.' },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.lvl}
                            type="button"
                            data-testid={`edu-level-${item.lvl}`}
                            onClick={() => onUpdateInspectorUi({ activeEduLevel: item.lvl })}
                            className={`rounded px-2 py-0.5 font-hud text-[10px] font-semibold transition ${
                              activeEduLevel === item.lvl
                                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p
                      className="text-xs leading-relaxed text-slate-200"
                      data-testid="edu-level-text"
                    >
                      {eduCopy}
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-400/60 pl-2.5">
                    <div className="font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Mission Impact
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                      {activePart.missionRelevance}
                    </p>
                  </div>

                  <div className="pt-1 font-mono-tech text-[10px] text-slate-500">
                    {activePart.honestyNote}
                  </div>
                </>
              )}

              {activeRightTab === 'lab' && (
                <div className="space-y-3">
                  <EngineeringLabWidget
                    showcase={showcase}
                    part={activePart}
                    inspectorUi={inspectorUi}
                    onUpdateInspectorUi={onUpdateInspectorUi}
                  />
                  <div className="rounded border border-slate-800/80 bg-slate-950/60 p-2.5 text-[11px] text-slate-300">
                    <div className="mb-1 font-hud text-[10px] font-bold text-slate-400 uppercase">
                      Operational Context
                    </div>
                    {activePart.missionRelevance}
                  </div>
                </div>
              )}

              {activeRightTab === 'quiz' && (
                <div className="space-y-3" data-testid="component-quiz-panel">
                  <div className="font-hud text-[11px] font-bold text-amber-300 uppercase">
                    Subsystem Knowledge Check
                  </div>
                  <p className="text-xs leading-relaxed text-slate-100">
                    {activePart.quizQuestion.prompt}
                  </p>
                  <div className="space-y-1.5">
                    {activePart.quizQuestion.options.map((opt, idx) => {
                      const picked = quizAnswerIdx === idx;
                      const isCorrect = idx === activePart.quizQuestion.correctIndex;
                      let btnStyle =
                        'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-cyan-400/60';
                      if (quizAnswerIdx !== null) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-400/80 bg-emerald-500/15 text-emerald-100';
                        } else if (picked) {
                          btnStyle = 'border-amber-400/80 bg-amber-500/15 text-amber-100';
                        } else {
                          btnStyle = 'border-slate-800 bg-slate-950/50 text-slate-500';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setQuizAnswerIdx(idx)}
                          className={`w-full rounded-lg border p-2.5 text-left text-[11px] leading-snug transition ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizAnswerIdx !== null && (
                    <div className="rounded border border-cyan-400/40 bg-slate-950/80 p-2.5 text-[11px] leading-relaxed text-slate-200">
                      <span className="font-bold text-cyan-300">
                        {quizAnswerIdx === activePart.quizQuestion.correctIndex
                          ? 'Correct: '
                          : 'Engineering Note: '}
                      </span>
                      {activePart.quizQuestion.explanation}
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-2.5">
                    <button
                      type="button"
                      onClick={onStartQuiz}
                      className="w-full rounded-lg border border-amber-400/50 bg-amber-500/15 py-2 font-hud text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/25"
                    >
                      {inspectorUi.quizMode
                        ? 'Stop 3D Part Finder Challenge'
                        : 'Launch 3D Part Finder Challenge'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* AREA 4: Bottom Minimal Engineering Toolbar */}
      <div className="relative z-10 flex items-end justify-between gap-4">
        <div className="hidden font-mono-tech text-[10px] text-slate-400 xl:block">
          Drag: Orbit · Right-Drag: Pan · Scroll: Zoom · Double-Click: Focus
        </div>

        <div className="pointer-events-auto mx-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700/75 bg-[#070D1B]/95 px-2.5 py-1.5 shadow-xl">
          <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-2.5 py-1">
            <Layers className="h-3.5 w-3.5 text-cyan-300" />
            <span className="font-hud text-[11px] font-semibold text-slate-200">Explode</span>
            <input
              type="range"
              aria-label="Exploded View Percentage"
              data-testid="inspector-explode-slider"
              min={0}
              max={100}
              value={inspectorUi.explodePct}
              onChange={(e) => onUpdateInspectorUi({ explodePct: Number(e.target.value) })}
              className="w-24 accent-cyan-400"
            />
            <span className="w-8 text-right font-mono-tech text-[11px] font-bold text-cyan-300">
              {inspectorUi.explodePct}%
            </span>
          </label>

          <button
            type="button"
            data-testid="inspector-isolate-btn"
            disabled={!activePart}
            onClick={() => onUpdateInspectorUi({ isolatePart: !inspectorUi.isolatePart })}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-hud text-[11px] font-semibold whitespace-nowrap transition ${
              inspectorUi.isolatePart
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                : 'border-slate-700/80 bg-slate-900/60 text-slate-200 hover:border-cyan-400/50 disabled:opacity-40'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Isolate
          </button>

          <button
            type="button"
            data-testid="inspector-labels-btn"
            onClick={() => onUpdateInspectorUi({ showLabels: !inspectorUi.showLabels })}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-hud text-[11px] font-semibold whitespace-nowrap transition ${
              inspectorUi.showLabels
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                : 'border-slate-700/80 bg-slate-900/60 text-slate-200 hover:border-cyan-400/50'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            Labels
          </button>

          <button
            type="button"
            data-testid="inspector-reset-view-btn"
            onClick={onResetCamera}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5 font-hud text-[11px] font-semibold whitespace-nowrap text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset View
          </button>

          <button
            type="button"
            data-testid="inspector-quiz-btn"
            onClick={onStartQuiz}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-hud text-[11px] font-semibold whitespace-nowrap transition ${
              inspectorUi.quizMode
                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                : 'border-amber-400/40 bg-slate-900/60 text-amber-200 hover:border-amber-400'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Quiz
          </button>

          {isModifiedView && (
            <button
              type="button"
              data-testid="inspector-full-assembly-btn"
              onClick={() => {
                onUpdateInspectorUi({
                  explodePct: 0,
                  isolatePart: false,
                  stageSepStep: 0,
                  gimbalDeg: 0,
                  selectedSubEngine: null,
                });
                onSelectPart(null);
                onResetCamera();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1.5 font-hud text-[11px] font-semibold whitespace-nowrap text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Full Assembly
            </button>
          )}
        </div>

        <div className="hidden font-mono-tech text-[10px] text-slate-500 xl:block">
          {catalog.shortLabel}
        </div>
      </div>
    </div>
  );
}
