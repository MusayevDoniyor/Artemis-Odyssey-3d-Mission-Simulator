import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  FlaskConical,
  HelpCircle,
  Package,
  Star,
  Wrench,
  X,
} from 'lucide-react';
import {
  getLearnModuleForObjective,
  type LearnModalState,
  type SpecimenVisualKind,
} from '../game/learningModules';
import type { RoverObjective } from '../game/types';

interface LearnObjectModalProps {
  state: LearnModalState | null;
  objective: RoverObjective | null;
  onSelectStep: (step: 'study' | 'notes' | 'quiz') => void;
  onMarkSampleStudied: () => void;
  onMarkNotesRead: () => void;
  onSelectQuizAnswer: (index: number) => void;
  onOpenTridentDrill: (obj: RoverObjective) => void;
  onCompleteAndClaim: (objectiveId: string) => void;
  onClose: () => void;
}

function SpecimenAnalysisArt({ kind }: { kind: SpecimenVisualKind }) {
  const isIce = kind === 'moon-ice' || kind === 'moon-hydrogen';
  const isMoon = kind.startsWith('moon');
  const isMoxie = kind === 'mars-moxie';

  const bgGradient = isIce
    ? 'radial-gradient(circle at 50% 42%, #0c4a6e 0%, #082f49 48%, #020617 100%)'
    : isMoon
      ? 'radial-gradient(circle at 52% 38%, #334155 0%, #1e293b 48%, #020617 100%)'
      : 'radial-gradient(circle at 50% 42%, #7c2d12 0%, #431407 52%, #0c0a09 100%)';

  const veinColor = isIce ? '#38bdf8' : isMoon ? '#fbbf24' : '#f59e0b';
  const rockMain = isIce ? '#334155' : isMoon ? '#475569' : '#57281b';
  const rockHighlight = isIce ? '#7dd3fc' : isMoon ? '#94a3b8' : '#b45309';

  return (
    <div
      className="relative h-56 w-full overflow-hidden rounded-xl border border-amber-400/25"
      style={{ background: bgGradient }}
    >
      {/* Horizon & Subtle Dust Ground */}
      <div
        className="absolute inset-x-0 bottom-0 h-20"
        style={{
          background: isMoon
            ? 'linear-gradient(to top, rgba(15,23,42,0.92), transparent)'
            : 'linear-gradient(to top, rgba(41,18,12,0.92), transparent)',
        }}
      />

      {/* Elevation Scale Ruler Left */}
      <svg
        viewBox="0 0 280 210"
        className="relative h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="specimenGlow" cx="50%" cy="52%" r="46%">
            <stop offset="0%" stopColor={veinColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={veinColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={rockHighlight} />
            <stop offset="52%" stopColor={rockMain} />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
        </defs>

        {/* Left HUD ruler ticks */}
        <g stroke="rgba(226,232,240,0.45)" strokeWidth="1">
          <line x1="16" y1="36" x2="16" y2="164" />
          {[36, 54, 72, 90, 108, 126, 144, 162].map((y, idx) => (
            <line key={y} x1="16" y1={y} x2={idx % 2 === 0 ? 27 : 22} y2={y} />
          ))}
        </g>

        {/* Ground Shadow & Ambient Glow */}
        <ellipse cx="105" cy="156" rx="68" ry="18" fill="rgba(0,0,0,0.55)" />
        <circle cx="106" cy="112" r="76" fill="url(#specimenGlow)" />

        {/* Procedural Specimen Illustration */}
        {isMoxie ? (
          <g transform="translate(52, 54)">
            <rect x="8" y="34" width="90" height="58" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
            <rect x="18" y="44" width="44" height="38" rx="4" fill="#d97706" opacity="0.85" />
            <circle cx="80" cy="54" r="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="80" cy="76" r="6" fill="#22d3ee" />
            <path d="M24 20 L38 34 M68 20 L68 34" stroke="#94a3b8" strokeWidth="3" />
          </g>
        ) : (
          <g>
            {/* Boulder Polygon Silhouette */}
            <polygon
              points="46,150 42,118 58,82 88,54 122,48 150,74 166,110 158,148 112,158 68,156"
              fill="url(#rockGrad)"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1.2"
            />
            {/* Facet Plane Shading */}
            <polygon
              points="88,54 122,48 134,92 98,108 66,94"
              fill="rgba(255,255,255,0.09)"
            />
            <polygon
              points="122,48 150,74 166,110 134,92"
              fill="rgba(0,0,0,0.28)"
            />
            {/* Glowing Mineral / Ice Fissures */}
            <path
              d="M84,64 L104,88 L92,118 L114,146 M104,88 L138,104 L148,132 M70,104 L92,118 L66,138"
              fill="none"
              stroke={veinColor}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M84,64 L104,88 L92,118 L114,146"
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.9"
              opacity="0.8"
            />
          </g>
        )}

        {/* Corner Scanner Target Brackets */}
        <g stroke="#fbbf24" strokeWidth="1.8" fill="none" opacity="0.9">
          <path d="M40,56 L40,42 L54,42" />
          <path d="M162,42 L176,42 L176,56" />
          <path d="M40,146 L40,160 L54,160" />
          <path d="M162,160 L176,160 L176,146" />
        </g>
      </svg>
    </div>
  );
}

export function LearnObjectModal({
  state,
  objective,
  onSelectStep,
  onMarkSampleStudied,
  onMarkNotesRead,
  onSelectQuizAnswer,
  onOpenTridentDrill,
  onCompleteAndClaim,
  onClose,
}: LearnObjectModalProps) {
  if (!state || !state.open || !objective) return null;

  const spec = getLearnModuleForObjective(objective);
  const allCompleted = state.sampleStudied && state.notesRead && state.quizPassed;
  const planetLabel = objective.planet === 'mars' ? 'Mars' : 'the Moon';

  const handlePrimaryCta = () => {
    if (allCompleted) {
      onCompleteAndClaim(objective.id);
      return;
    }
    if (!state.sampleStudied) {
      onMarkSampleStudied();
      onSelectStep('notes');
      return;
    }
    if (!state.notesRead) {
      onMarkNotesRead();
      onSelectStep('quiz');
      return;
    }
    onSelectStep('quiz');
  };

  let primaryCtaLabel = 'Start Learning';
  if (allCompleted) {
    primaryCtaLabel = 'Claim Reward & Finish';
  } else if (state.sampleStudied && !state.notesRead) {
    primaryCtaLabel = state.activeStep === 'notes' ? 'Mark Notes Read' : 'Read Research Notes';
  } else if (state.sampleStudied && state.notesRead && !state.quizPassed) {
    primaryCtaLabel = 'Take Knowledge Quiz';
  } else if (state.activeStep === 'study') {
    primaryCtaLabel = 'Complete Sample Study';
  }

  const tasks = [
    {
      id: 'study' as const,
      icon: FlaskConical,
      title: 'Study the sample',
      subtitle: 'Learn about its composition and significance.',
      done: state.sampleStudied,
    },
    {
      id: 'notes' as const,
      icon: FileText,
      title: 'Read the research notes',
      subtitle: `Discover more about ${planetLabel}.`,
      done: state.notesRead,
    },
    {
      id: 'quiz' as const,
      icon: HelpCircle,
      title: 'Pass the knowledge quiz',
      subtitle: "Test what you've learned.",
      done: state.quizPassed,
    },
  ];

  return (
    <div
      data-testid="learn-object-modal"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/78 p-4"
    >
      <div className="hud-panel tactical-frame animate-modal-enter relative w-full max-w-4xl rounded-2xl p-6 text-slate-100">
        {/* Top Header */}
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-sky-400/20 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-500/15 text-cyan-300">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="font-display text-2xl font-extrabold tracking-wide text-white uppercase">
                  LEARN
                </h2>
                <span className="rounded-md border border-cyan-400/40 bg-cyan-500/12 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                  {objective.siteName}
                </span>
              </div>
              <p className="text-sm text-slate-300">Discover. Understand. Apply.</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close Learn Modal"
            onClick={onClose}
            className="rounded-xl border border-sky-400/25 bg-slate-900/75 p-2 text-slate-300 transition hover:border-cyan-400/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Two-Column Body: Left Sample Analysis / Active Lesson, Right Learning Tasks */}
        <div className="grid gap-5 md:grid-cols-[1.12fr_1fr]">
          {/* Left Panel */}
          <div className="flex flex-col gap-3">
            {state.activeStep === 'study' && (
              <>
                <div className="relative">
                  <SpecimenAnalysisArt kind={spec.specimenKind} />
                  {/* Sample Analysis Overlay Card inside Viewport (matches Reference Layout) */}
                  <div className="absolute top-3 right-3 w-48 rounded-xl border border-white/20 bg-slate-950/88 p-3 shadow-xl">
                    <div className="border-b border-white/15 pb-1.5 text-xs font-bold text-white">
                      {spec.sampleTitle}
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Composition:</div>
                    <div className="text-sm leading-snug font-bold text-white">
                      {spec.composition}
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Value:</div>
                    <div className="text-sm font-extrabold text-amber-400">
                      +{spec.sampleXp} XP
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200">
                  <p className="flex-1 leading-snug">{spec.significanceSummary}</p>
                  {spec.drillRecommended && (
                    <button
                      type="button"
                      data-testid="learn-launch-drill-btn"
                      onClick={() => onOpenTridentDrill(objective)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-400/50 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/25"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {state.sampleStudied ? 'TRIDENT Sampled' : 'Run TRIDENT Drill'}
                    </button>
                  )}
                </div>
              </>
            )}

            {state.activeStep === 'notes' && (
              <div
                data-testid="learn-notes-panel"
                className="flex h-full flex-col justify-between rounded-xl border border-sky-400/30 bg-slate-950/75 p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300">
                      <FileText className="h-4 w-4" />
                      Field Research Notes
                    </span>
                    <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                      {spec.nasaSourceLabel}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">{objective.title}</h3>
                  <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-200">
                    {spec.researchBullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2.5 rounded-lg border border-sky-400/15 bg-slate-900/65 p-3"
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <span className="text-xs text-slate-400">Reward: {objective.rewardText}</span>
                  <button
                    type="button"
                    data-testid="learn-notes-confirm-btn"
                    onClick={() => {
                      onMarkNotesRead();
                      onSelectStep('quiz');
                    }}
                    className="hud-cta-cyan inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold"
                  >
                    Understood · Next Quiz
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {state.activeStep === 'quiz' && (
              <div
                data-testid="learn-quiz-panel"
                className="flex h-full flex-col justify-between rounded-xl border border-sky-400/30 bg-slate-950/75 p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300">
                      <HelpCircle className="h-4 w-4" />
                      Knowledge Check
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {state.quizPassed ? 'Passed' : 'Select best answer'}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-bold text-white">{spec.quiz.question}</p>
                  <div className="mt-3 space-y-2">
                    {spec.quiz.options.map((opt, idx) => {
                      const picked = state.selectedAnswer === idx;
                      const isCorrect = idx === spec.quiz.correctIndex;
                      return (
                        <button
                          key={opt}
                          type="button"
                          data-testid={`learn-quiz-opt-${idx}`}
                          onClick={() => onSelectQuizAnswer(idx)}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                            picked && isCorrect
                              ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-100'
                              : picked && !isCorrect
                                ? 'border-rose-400 bg-rose-500/15 text-rose-100'
                                : 'border-sky-400/20 bg-slate-900/65 text-slate-200 hover:border-cyan-400/65'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {state.quizFeedback && (
                  <p
                    className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      state.quizPassed
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-rose-500/15 text-rose-200'
                    }`}
                  >
                    {state.quizFeedback}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Your Learning Tasks */}
          <div className="flex flex-col justify-between gap-3">
            <div>
              <div className="mb-3 flex items-center gap-2 text-base font-bold text-cyan-300">
                <FileText className="h-4 w-4" />
                <span>Your Learning Tasks:</span>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => {
                  const Icon = task.icon;
                  const active = state.activeStep === task.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      data-testid={`learn-task-${task.id}`}
                      onClick={() => onSelectStep(task.id)}
                      className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-cyan-400/80 bg-cyan-500/14 shadow-[0_0_20px_rgba(34,211,238,0.16)]'
                          : 'border-sky-400/20 bg-slate-900/65 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/85 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-white">{task.title}</div>
                        <div className="text-xs text-slate-300">{task.subtitle}</div>
                      </div>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          task.done
                            ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                            : 'border-slate-500 bg-transparent text-transparent'
                        }`}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-sky-400/20 bg-slate-900/65 px-4 py-2.5 text-xs text-slate-300">
              <span className="font-semibold text-cyan-300">Site Rewards:</span> {objective.rewardText}
            </div>
          </div>
        </div>

        {/* Bottom Reward Bar + Primary Action Button */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-sky-400/20 bg-slate-900/65 px-4 py-2.5 text-sm">
            <span className="text-slate-300">Reward:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
              <Star className="h-4 w-4 fill-amber-300" />+{spec.rewardXp} XP
            </span>
            <span className="text-white/20">|</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-100">
              <Package className="h-4 w-4 text-cyan-300" />
              {spec.dataPackLabel}
            </span>
          </div>

          <button
            type="button"
            data-testid="learn-primary-cta-btn"
            onClick={handlePrimaryCta}
            disabled={state.activeStep === 'quiz' && !state.quizPassed && state.notesRead && state.sampleStudied}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold transition ${
              allCompleted
                ? 'bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.4)] hover:bg-emerald-300'
                : 'hud-cta-cyan disabled:opacity-50'
            }`}
          >
            <span>{primaryCtaLabel}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
