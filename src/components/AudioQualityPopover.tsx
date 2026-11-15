import { SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import type { AudioSettings, QualityPreset } from '../game/types';

interface AudioQualityPopoverProps {
  audio: AudioSettings;
  quality: QualityPreset;
  onUpdateAudio: (partial: Partial<AudioSettings>) => void;
  onChangeQuality: (quality: QualityPreset) => void;
}

const QUALITY_OPTIONS: Array<{ id: QualityPreset; label: string }> = [
  { id: 'low', label: 'LOW' },
  { id: 'med', label: 'MED' },
  { id: 'high', label: 'HIGH' },
];

export function AudioQualityPopover({
  audio,
  quality,
  onUpdateAudio,
  onChangeQuality,
}: AudioQualityPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        data-testid="audio-quality-btn"
        aria-label="Audio & Graphics Settings"
        onClick={() => setOpen((v) => !v)}
        className="hud-panel inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-hud text-xs font-bold whitespace-nowrap text-slate-200 uppercase hover:border-cyan-400"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300" />
        Settings
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Audio & Quality Console"
          className="hud-panel tactical-frame absolute top-full right-0 z-30 mt-2 w-72 rounded-xl p-4 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-display text-xs font-bold text-cyan-300 uppercase">
              Audio &amp; Graphics Bus
            </span>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => setOpen(false)}
              className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-300 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-hud font-bold text-slate-200 uppercase">Sound Output</span>
              <button
                type="button"
                onClick={() => onUpdateAudio({ muted: !audio.muted })}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-hud text-[11px] font-bold uppercase ${
                  audio.muted
                    ? 'border border-rose-400/50 bg-rose-500/15 text-rose-200'
                    : 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                }`}
              >
                {audio.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {audio.muted ? 'Muted' : 'Active'}
              </button>
            </div>

            <label className="block">
              <div className="mb-1 flex justify-between font-mono-tech text-[11px] text-slate-300">
                <span>Master Volume</span>
                <span>{Math.round(audio.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audio.masterVolume * 100)}
                onChange={(e) => onUpdateAudio({ masterVolume: Number(e.target.value) / 100 })}
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex justify-between font-mono-tech text-[11px] text-slate-300">
                <span>Effects &amp; Alarms</span>
                <span>{Math.round(audio.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audio.sfxVolume * 100)}
                onChange={(e) => onUpdateAudio({ sfxVolume: Number(e.target.value) / 100 })}
                className="w-full accent-amber-400"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex justify-between font-mono-tech text-[11px] text-slate-300">
                <span>Thruster Ambience</span>
                <span>{Math.round(audio.ambienceVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audio.ambienceVolume * 100)}
                onChange={(e) => onUpdateAudio({ ambienceVolume: Number(e.target.value) / 100 })}
                className="w-full accent-emerald-400"
              />
            </label>

            <div className="border-t border-slate-800 pt-2.5">
              <div className="mb-1.5 font-hud text-[11px] font-bold text-slate-200 uppercase">
                3D Render Quality
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onChangeQuality(q.id)}
                    className={`rounded-md py-1.5 font-hud text-[11px] font-bold uppercase ${
                      quality === q.id
                        ? 'bg-cyan-400 text-slate-950'
                        : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
