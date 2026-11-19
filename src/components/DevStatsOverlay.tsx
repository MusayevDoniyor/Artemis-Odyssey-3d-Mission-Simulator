import React, { useEffect, useState } from "react";

interface DevStatsOverlayProps {
  sceneMgrRef: React.RefObject<any>;
  phase: string;
  cameraMode?: string;
}

export const DevStatsOverlay: React.FC<DevStatsOverlayProps> = ({
  sceneMgrRef,
  phase,
  cameraMode,
}) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("stats") === "1" || p.get("stats") === "true";
    }
    return false;
  });

  const [stats, setStats] = useState({
    triangles: 0,
    calls: 0,
    geometries: 0,
    textures: 0,
    lines: 0,
    points: 0,
    fps: 60,
    frameMs: 16.6,
    jsUpdateMs: 1.2,
    renderSubmitMs: 2.4,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) ||
        e.key === "F2"
      ) {
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).__SCENE_STATS__) {
        setStats((window as any).__SCENE_STATS__);
      } else if (sceneMgrRef.current?.getRenderInfo) {
        setStats(sceneMgrRef.current.getRenderInfo());
      }
    }, 100);
    return () => clearInterval(interval);
  }, [visible, sceneMgrRef]);

  if (!visible) return null;

  const callsBudget = 45;
  const trisBudget = 185000;
  const callsOver = stats.calls > callsBudget;
  const trisOver = stats.triangles > trisBudget;

  return (
    <div
      id="dev-stats-overlay"
      className="fixed top-3 right-3 z-50 pointer-events-none bg-slate-950/90 border border-cyan-500/30 text-white font-mono text-xs px-3 py-2 rounded-lg shadow-2xl backdrop-blur-md select-none"
      style={{ minWidth: 230 }}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
        <span>Dev Performance Stats</span>
        <span className="text-slate-400 font-normal">F2 / Ctrl+Shift+D</span>
      </div>
      <div className="text-[11px] text-slate-300 mb-1">
        Scene:{" "}
        <span className="text-white font-semibold capitalize">{phase}</span>
        {cameraMode ? (
          <span className="text-slate-400 text-[10px]"> ({cameraMode})</span>
        ) : null}
      </div>
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/5 text-[11px]">
        <span className="text-emerald-400 font-bold">
          {stats.fps || 60} FPS
        </span>
        <span className="text-slate-300 font-semibold">
          {stats.frameMs || 16.6} ms
        </span>
        <span className="text-slate-400 text-[10px]">
          (JS: {stats.jsUpdateMs ?? 0}ms · GL: {stats.renderSubmitMs ?? 0}ms)
        </span>
      </div>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Draw Calls:</span>
          <span
            className={
              callsOver
                ? "text-amber-400 font-bold"
                : "text-emerald-400 font-bold"
            }
          >
            {stats.calls}{" "}
            <span className="text-slate-500 font-normal text-[10px]">
              / {callsBudget} max
            </span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Triangles:</span>
          <span
            className={
              trisOver
                ? "text-amber-400 font-bold"
                : "text-emerald-400 font-bold"
            }
          >
            {stats.triangles.toLocaleString()}{" "}
            <span className="text-slate-500 font-normal text-[10px]">
              / {trisBudget.toLocaleString()} max
            </span>
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1 border-t border-white/5">
          <span>
            Geometries:{" "}
            <strong className="text-slate-300">{stats.geometries}</strong>
          </span>
          <span>
            Textures:{" "}
            <strong className="text-slate-300">{stats.textures}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
