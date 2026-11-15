import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { CAMERA_VIEW_PRESETS } from '../game/constants';

interface CameraViewControlsProps {
  onSelectPreset: (yaw: number, pitch: number) => void;
  onZoom: (delta: number) => void;
  onReset: () => void;
  compact?: boolean;
  className?: string;
}

export function CameraViewControls({
  onSelectPreset,
  onZoom,
  onReset,
  compact = false,
  className = '',
}: CameraViewControlsProps) {
  return (
    <div
      data-testid="camera-view-controls"
      aria-label="3D Camera View Controls"
      className={`hud-panel pointer-events-auto inline-flex flex-wrap items-center gap-1 rounded-xl px-2 py-1.5 ${className}`}
    >
      <span className="px-1.5 font-hud text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
        View
      </span>
      {CAMERA_VIEW_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onSelectPreset(preset.yaw, preset.pitch);
          }}
          title={`Camera Angle: ${preset.label}`}
          className={`rounded-md border border-slate-700/90 bg-slate-900 font-hud font-bold whitespace-nowrap text-slate-200 transition hover:border-cyan-400 hover:bg-slate-800 hover:text-white ${
            compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          }`}
        >
          {preset.label}
        </button>
      ))}

      <div className="mx-0.5 h-4 w-px bg-slate-700" />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Zoom In Camera"
        title="Zoom In"
        onClick={(e) => {
          e.currentTarget.blur();
          onZoom(-4.5);
        }}
        className="rounded-md border border-slate-700/90 bg-slate-900 p-1 text-slate-200 transition hover:border-cyan-400 hover:text-white"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        tabIndex={-1}
        aria-label="Zoom Out Camera"
        title="Zoom Out"
        onClick={(e) => {
          e.currentTarget.blur();
          onZoom(4.5);
        }}
        className="rounded-md border border-slate-700/90 bg-slate-900 p-1 text-slate-200 transition hover:border-cyan-400 hover:text-white"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        tabIndex={-1}
        aria-label="Reset Camera View"
        title="Reset Camera View"
        onClick={(e) => {
          e.currentTarget.blur();
          onReset();
        }}
        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/35 bg-slate-900 px-2 py-1 font-hud text-[10px] font-bold text-cyan-200 uppercase transition hover:border-cyan-400 hover:text-white"
      >
        <RotateCcw className="h-3 w-3" />
        Reset
      </button>
    </div>
  );
}
