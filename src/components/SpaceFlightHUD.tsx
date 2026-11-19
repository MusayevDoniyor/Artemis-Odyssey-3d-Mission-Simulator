import {
  ArrowDown,
  ArrowRight,
  Battery,
  BookOpen,
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  Compass,
  Database,
  ExternalLink,
  Mouse,
  Orbit,
  Radio,
  Rocket,
  RotateCcw,
  Scale,
  Settings,
  Shield,
  Trophy,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { useState } from "react";
import type { MusicState } from "../game/audio";
import {
  PRIMARY_SOLAR_BAR_IDS,
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeKeplerBodyPosition,
  getLiveSolarTargetPosition,
  getNasaFactSheetUrl,
} from "../game/solarSystemData";
import type { DataProvenance } from "../game/planetaryCatalog";
import type {
  CampaignMissionId,
  GameMenuTab,
  ResourceState,
  SpaceCameraMode,
  SpaceFlightState,
  SpaceSasMode,
  SpaceTargetId,
  SpaceTimeWarp,
} from "../game/types";
import { NASAInsignia } from "./NASAInsignia";
import { PlanetThumb } from "./PlanetThumb";

interface SpaceFlightHUDProps {
  space: SpaceFlightState;
  resources: ResourceState;
  campaignMission: CampaignMissionId;
  donkiFlareActive: boolean;
  nasaOnline: boolean;
  freeExploreMode: boolean;
  focusedSolarBodyId: string | null;
  exploredSolarBodyIds: string[];
  selectedBodyPin: { xPct: number; yPct: number; visible: boolean } | null;
  solarScaleMode: SolarScaleMode;
  spaceCameraMode: SpaceCameraMode;
  localAnchorId: "earth" | "moon" | "mars";
  horizonsProvenance: {
    source: string;
    provenance: DataProvenance;
    isLive: boolean;
  };
  solarEpochYears: number;
  musicState?: MusicState;
  muted?: boolean;
  onUnlockAudio?: () => void;
  onFocusSolarBody: (bodyId: string | null) => void;
  onExploreSolarBody: (bodyId: string) => void;
  onFlyToSolarBody?: (bodyId: string) => void;
  onChangeSolarScaleMode: (mode: SolarScaleMode) => void;
  onChangeSpaceCameraMode: (mode: SpaceCameraMode) => void;
  onChangeLocalAnchorId: (anchor: "earth" | "moon" | "mars") => void;
  onResetCamera: () => void;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  onOpenBriefing: () => void;
  onOpenHardwareBay: () => void;
  onOpenNotebook: () => void;
  onToggleAutoPilot: () => void;
  onToggleShieldBoost: () => void;
  onCompleteSatelliteMission: () => void;
  onCompleteGatewayMission: () => void;
  onEnterLunarOrbit: () => void;
  onEnterMarsOrbit: () => void;
  onSetTimeWarp?: (warp: SpaceTimeWarp) => void;
  onSetThrottle?: (throttle: number) => void;
  onSetSasMode?: (mode: SpaceSasMode) => void;
}

export function SpaceFlightHUD({
  space,
  resources,
  campaignMission,
  donkiFlareActive,
  nasaOnline,
  freeExploreMode,
  focusedSolarBodyId,
  exploredSolarBodyIds,
  selectedBodyPin,
  solarScaleMode,
  spaceCameraMode,
  localAnchorId,
  horizonsProvenance,
  solarEpochYears,
  musicState,
  muted,
  onUnlockAudio,
  onFocusSolarBody,
  onExploreSolarBody,
  onFlyToSolarBody,
  onChangeSolarScaleMode,
  onChangeSpaceCameraMode,
  onChangeLocalAnchorId,
  onResetCamera,
  onOpenMenuTab,
  onOpenBriefing,
  onOpenHardwareBay,
  onOpenNotebook,
  onToggleAutoPilot,
  onToggleShieldBoost,
  onCompleteSatelliteMission,
  onCompleteGatewayMission,
  onEnterLunarOrbit,
  onEnterMarsOrbit,
  onSetTimeWarp,
  onSetThrottle,
  onSetSasMode,
}: SpaceFlightHUDProps) {
  const [showPlanetsStrip, setShowPlanetsStrip] = useState(false);
  const [objectiveCollapsed, setObjectiveCollapsed] = useState(false);

  const navSpec = space.navBodyId
    ? (SOLAR_SYSTEM_BODIES.find((b) => b.id === space.navBodyId) ?? null)
    : null;
  const activeLivePos = navSpec
    ? computeKeplerBodyPosition(
        navSpec,
        solarEpochYears,
        solarScaleMode,
        SOLAR_SUN_ORIGIN_X,
        SOLAR_SUN_ORIGIN_Z,
        localAnchorId,
      )
    : getLiveSolarTargetPosition(
        space.targetId,
        solarEpochYears,
        solarScaleMode,
        SOLAR_SUN_ORIGIN_X,
        SOLAR_SUN_ORIGIN_Z,
        localAnchorId,
      );
  const distToTarget = Math.hypot(
    activeLivePos.x - space.shipX,
    activeLivePos.z - space.shipZ,
  );
  const shipSpeed = Math.hypot(space.vx, space.vz);
  const sat = space.orbitalSat;
  const isMoving = shipSpeed > 0.4;

  const selectedBody = focusedSolarBodyId
    ? (SOLAR_SYSTEM_BODIES.find((b) => b.id === focusedSolarBodyId) ?? null)
    : null;

  const targetNames: Record<SpaceTargetId, string> = {
    "relay-orbit": "HERMES Relay",
    moon: "Moon Orbit",
    gateway: "Lunar Gateway",
    mars: "Mars Orbit",
  };

  let objectiveText = freeExploreMode
    ? navSpec && space.autoPilot
      ? `Flying Orion to ${navSpec.name}.`
      : "Explore the Solar System and learn about the planets!"
    : `Fly Orion toward ${targetNames[space.targetId]}.`;
  if (!freeExploreMode) {
    if (campaignMission === "artemis-2") {
      if (space.arrivedMoon || space.inSatDeployZone || sat.linkLocked) {
        objectiveText = "Lunar Free-Return Flyby nominal (~7,400 km). Align Earth entry corridor.";
      } else {
        objectiveText = "Fly Orion toward the Moon on Free-Return Trajectory (~7,400 km perilune).";
      }
    } else if (
      space.targetId === "relay-orbit" &&
      space.inSatDeployZone &&
      !sat.linkLocked
    ) {
      objectiveText = "Hold E or Space to deploy Orbital Relay.";
    } else if (space.arrivedGateway && campaignMission === "artemis-4") {
      objectiveText = "Docked with Gateway. Complete mission below.";
    } else if (space.arrivedMoon) {
      objectiveText = "Lunar orbit reached. Start powered descent.";
    } else if (space.arrivedMars) {
      objectiveText = "Mars orbit reached. Begin atmospheric entry.";
    }
  }

  const maxUnits = solarScaleMode === "local" ? 440 : 165;
  const toRadarRadius = (rUnits: number): number => {
    if (solarScaleMode === "scientific") {
      return Math.min(
        54,
        (Math.log1p(Math.max(0, rUnits)) / Math.log1p(6500)) * 54,
      );
    }
    return Math.min(54, (Math.max(0, rUnits) / maxUnits) * 54);
  };

  const mapDotPos = (
    bodyId: string,
  ): { rx: number; ry: number; rOrbit: number } => {
    const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
    if (!spec) return { rx: 72, ry: 72, rOrbit: 0 };
    if (solarScaleMode === "local") {
      const pos = computeKeplerBodyPosition(
        spec,
        solarEpochYears,
        "local",
        0,
        0,
        localAnchorId,
      );
      const rDist = Math.hypot(pos.x, pos.z);
      const ang = Math.atan2(pos.z, pos.x);
      const normR = toRadarRadius(rDist);
      return {
        rx: 72 + Math.cos(ang) * normR,
        ry: 72 + Math.sin(ang) * normR,
        rOrbit: normR,
      };
    }
    if (spec.id === "sun") return { rx: 72, ry: 72, rOrbit: 0 };
    const pos = computeKeplerBodyPosition(
      spec,
      solarEpochYears,
      solarScaleMode,
      0,
      0,
      localAnchorId,
    );
    if (spec.id === "moon") {
      const earthPt = mapDotPos("earth");
      const localMoonR = solarScaleMode === "scientific" ? 2.6 : 3.4;
      return {
        rx: earthPt.rx + Math.cos(pos.angleRad) * localMoonR,
        ry: earthPt.ry + Math.sin(pos.angleRad) * localMoonR,
        rOrbit: localMoonR,
      };
    }
    const normR = toRadarRadius(pos.orbitalRadius);
    const rx = 72 + Math.cos(pos.angleRad) * normR;
    const ry = 72 + Math.sin(pos.angleRad) * normR;
    return { rx, ry, rOrbit: normR };
  };

  const shipRelX =
    solarScaleMode === "local" ? space.shipX : space.shipX - SOLAR_SUN_ORIGIN_X;
  const shipRelZ =
    solarScaleMode === "local" ? space.shipZ : space.shipZ - SOLAR_SUN_ORIGIN_Z;
  const shipNormDist = toRadarRadius(Math.hypot(shipRelX, shipRelZ));
  const shipAngle = Math.atan2(shipRelZ, shipRelX);
  const shipMapX = 72 + Math.cos(shipAngle) * shipNormDist;
  const shipMapY = 72 + Math.sin(shipAngle) * shipNormDist;

  // Contextual landing visibility: show Land on Moon / Land on Mars only when relevant to destination or state
  const showLandMoon =
    (space.arrivedMoon ||
      (freeExploreMode &&
        (focusedSolarBodyId === "moon" ||
          focusedSolarBodyId === "earth" ||
          space.navBodyId === "moon"))) &&
    campaignMission !== "mars-pathfinder";
  const showLandMars =
    space.arrivedMars ||
    (freeExploreMode &&
      (focusedSolarBodyId === "mars" || space.navBodyId === "mars"));

  const showContextualRow =
    (space.inSatDeployZone && !sat.linkLocked) ||
    (sat.linkLocked && campaignMission === "artemis-2") ||
    (space.arrivedGateway && campaignMission === "artemis-4") ||
    showLandMoon ||
    showLandMars ||
    isMoving;

  const showMetersGroup =
    !freeExploreMode || space.inRadiationZone || space.fuelPct < 35;

  const exploreButtonLabel =
    selectedBody?.id === "moon"
      ? "Explore Moon"
      : selectedBody?.id === "mars" || selectedBody?.id === "earth"
        ? "Explore Planet"
        : "Inspect World";

  const exploredPrimaryCount = exploredSolarBodyIds.filter((id) =>
    (PRIMARY_SOLAR_BAR_IDS as readonly string[]).includes(id),
  ).length;
  const objectiveProgressPct = freeExploreMode
    ? Math.min(
        100,
        Math.round((exploredPrimaryCount / PRIMARY_SOLAR_BAR_IDS.length) * 100),
      )
    : Math.min(100, Math.round((space.visitedTargets.length / 4) * 100));

  const isSelectedBodyExplored = selectedBody
    ? exploredSolarBodyIds.includes(selectedBody.id)
    : false;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3.5 lg:px-6 lg:py-4">
      {/* Orion First-Person Cockpit Visor & Head-Up Display Overlay */}
      {spaceCameraMode === "cockpit" && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          {/* Cockpit Window Frame Silhouette / Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(2,6,23,0.72)_85%,rgba(2,6,23,0.96)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-10 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/80 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-12 border-r border-cyan-500/15 bg-gradient-to-r from-slate-950/70 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-12 border-l border-cyan-500/15 bg-gradient-to-l from-slate-950/70 to-transparent" />

          {/* Central Optical Flight Reticle */}
          <div className="relative flex flex-col items-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="h-2 w-2 rounded-full border border-cyan-300 bg-cyan-400/30" />
              <div className="absolute h-px w-8 bg-cyan-400/50" />
              <div className="absolute h-8 w-px bg-cyan-400/50" />
              <div className="absolute h-12 w-12 rounded-full border border-dashed border-cyan-400/30" />
            </div>

            {/* Flight Attitude & Target Callouts */}
            <div className="mt-2 flex flex-col items-center gap-0.5 font-mono-tech text-[10px] text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
              <span className="font-bold tracking-widest uppercase">
                ORION CM-002 · COCKPIT FPV
              </span>
              <span>
                HDG{" "}
                {Math.round(
                  ((space.headingRad * 180) / Math.PI + 360) % 360,
                )}
                ° · SAS: {space.sasMode ?? "MANUAL"}
              </span>
              {space.distanceToTargetKm != null && (
                <span className="text-amber-300">
                  RNG TO {space.targetId.toUpperCase()}:{" "}
                  {Math.round(space.distanceToTargetKm).toLocaleString()} KM
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating In-World Pin over Selected Planet */}
      {selectedBody && selectedBodyPin?.visible && (
        <div
          style={{
            left: `${Math.min(68, Math.max(22, selectedBodyPin.xPct))}%`,
            top: `${Math.min(72, Math.max(15, selectedBodyPin.yPct))}%`,
          }}
          className="pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-full transition-[left,top] duration-150"
        >
          <div className="hud-soft flex items-center gap-1.5 rounded-xl border-cyan-400/65 px-3 py-1 text-xs font-bold tracking-wide text-white shadow-xl lg:text-sm">
            <span>{selectedBody.shortName}</span>
          </div>
          <div className="mx-auto -mt-0.5 h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-cyan-400" />
        </div>
      )}

      {/* TOP AREA: Unified Navigation Header + Sub-Top Objective / Campaign Meters */}
      <div className="flex flex-col gap-2.5 lg:gap-3">
        <header className="flex items-center justify-between gap-2 lg:gap-4">
          {/* Left: Brand Logo */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-2.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            <svg
              width="30"
              height="30"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M16 4L27 27H21.5L16 15.5L10.5 27H5L16 4Z"
                fill="#FFFFFF"
              />
              <path
                d="M6.5 22.5C12 18 20 15 28.5 16.5"
                stroke="#22D3EE"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <div className="h-6 w-px bg-white/20" />
            <div className="leading-tight">
              <span className="block font-display text-xs font-extrabold tracking-[0.14em] text-white lg:text-sm">
                ARTEMIS
              </span>
              <span className="block font-display text-xs font-extrabold tracking-[0.14em] text-cyan-300 lg:text-sm">
                ODYSSEY
              </span>
            </div>
          </div>

          {/* Center: Unified Navigation Bar */}
          <nav
            aria-label="Primary Solar Navigation"
            className="hud-soft pointer-events-auto flex items-center gap-0.5 rounded-2xl p-1 lg:gap-1 lg:p-1.5"
          >
            <button
              type="button"
              onClick={() => onFocusSolarBody(focusedSolarBodyId || "earth")}
              className="hud-nav-active inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap lg:gap-2 lg:px-3.5 lg:text-sm"
            >
              <Orbit className="h-3.5 w-3.5 text-cyan-300 lg:h-4 lg:w-4" />
              Solar System
            </button>
            <button
              type="button"
              onClick={onOpenBriefing}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:gap-2 lg:px-3 lg:text-sm"
            >
              <Rocket className="h-3.5 w-3.5 text-sky-300 lg:h-4 lg:w-4" />
              Missions
            </button>
            <button
              type="button"
              onClick={onOpenHardwareBay}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:gap-2 lg:px-3 lg:text-sm"
            >
              <Box className="h-3.5 w-3.5 text-sky-300 lg:h-4 lg:w-4" />
              Hardware Bay
            </button>
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:gap-2 lg:px-3 lg:text-sm"
            >
              <BookOpen className="h-3.5 w-3.5 text-sky-300 lg:h-4 lg:w-4" />
              Astronaut Notebook
            </button>
            <button
              type="button"
              onClick={() => onOpenMenuTab("achievements")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:gap-2 lg:px-3 lg:text-sm"
            >
              <Trophy className="h-3.5 w-3.5 text-cyan-300 lg:h-4 lg:w-4" />
              Achievements
            </button>
            <button
              type="button"
              onClick={() => onOpenMenuTab("settings")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:gap-2 lg:px-3 lg:text-sm"
            >
              <Settings className="h-3.5 w-3.5 text-slate-300 lg:h-4 lg:w-4" />
              Settings
            </button>
          </nav>

          {/* Right: Enable Audio (when blocked) + NASA Data Online Status + Insignia */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            {musicState?.audioBlocked &&
              musicState.musicEnabled &&
              !muted &&
              onUnlockAudio && (
                <button
                  type="button"
                  onClick={onUnlockAudio}
                  className="hud-cta-cyan inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-hud text-[11px] font-bold tracking-wider uppercase shadow-[0_0_16px_rgba(34,211,238,0.4)]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Enable Audio
                </button>
              )}
            <div className="hud-soft inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-100 lg:px-3.5 lg:text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  nasaOnline
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : "bg-amber-400"
                }`}
              />
              <span>{nasaOnline ? "Online" : "Archived"}</span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-200">NASA Data</span>
            </div>
            <NASAInsignia size={28} />
          </div>
        </header>

        {/* Sub-Top Row: Exploration Objective (Left), Scale/Camera/Provenance Bar (Center), Campaign Meters (Right) */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <section
            data-testid="hud-group-objective"
            className={`hud-soft pointer-events-auto overflow-hidden rounded-2xl transition-all duration-200 text-slate-100 ${
              objectiveCollapsed ? "w-[240px] px-3 py-1.5" : "w-[300px] px-3.5 py-2.5 lg:w-[324px]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setObjectiveCollapsed((c) => !c)}
                className="flex items-center gap-2 text-xs font-bold tracking-wide text-cyan-300 lg:text-sm text-left hover:text-white transition"
                title={objectiveCollapsed ? "Expand Objective" : "Collapse Objective"}
              >
                <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-cyan-400" />
                <span>
                  {freeExploreMode
                    ? "Objective"
                    : "Deep Space Transit"}
                </span>
                {objectiveCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                )}
              </button>
              <span className="shrink-0 text-xs font-bold text-white tabular-nums lg:text-sm">
                {freeExploreMode
                  ? `${Math.min(PRIMARY_SOLAR_BAR_IDS.length, exploredPrimaryCount)} / ${PRIMARY_SOLAR_BAR_IDS.length}`
                  : `${space.visitedTargets.length} / 4`}
              </span>
            </div>
            {!objectiveCollapsed && (
              <>
                <p className="mt-1 text-xs leading-snug text-slate-200 lg:text-sm">
                  {objectiveText}
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all duration-300"
                    style={{ width: `${objectiveProgressPct}%` }}
                  />
                </div>
              </>
            )}
          </section>

          {/* Center-Top: Compact Scale Mode, Camera Mode & Data Provenance Controls */}
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            <div className="hud-soft flex flex-wrap items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[11px]">
              {/* Scale Mode Switcher */}
              <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.04] p-0.5">
                {(
                  [
                    { id: "exploration", label: "Educational" },
                    { id: "scientific", label: "True Scale" },
                    { id: "local", label: "Local" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`scale-mode-${m.id}`}
                    onClick={() => onChangeSolarScaleMode(m.id)}
                    className={`rounded-lg px-2 py-1 font-semibold transition ${
                      solarScaleMode === m.id
                        ? "bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/60"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {solarScaleMode === "local" && (
                <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.04] p-0.5">
                  {(["earth", "moon", "mars"] as const).map((anchor) => (
                    <button
                      key={anchor}
                      type="button"
                      onClick={() => onChangeLocalAnchorId(anchor)}
                      className={`rounded-lg px-1.5 py-1 text-[10px] font-bold uppercase transition ${
                        localAnchorId === anchor
                          ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {anchor}
                    </button>
                  ))}
                </div>
              )}

              <div className="mx-0.5 h-4 w-px bg-white/15" />

              {/* Space Camera Modes */}
              <div className="flex items-center gap-0.5">
                <Camera className="mr-0.5 h-3.5 w-3.5 text-cyan-300" />
                {(
                  [
                    { id: "overview", label: "Overview" },
                    { id: "focus", label: "Focus" },
                    { id: "orbit", label: "Orbit" },
                    { id: "track", label: "Track" },
                    { id: "cockpit", label: "Cockpit (FPV)" },
                    { id: "free", label: "Free" },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    data-testid={`cam-mode-${cam.id}`}
                    onClick={() => onChangeSpaceCameraMode(cam.id)}
                    className={`rounded-lg px-1.5 py-1 font-semibold transition ${
                      spaceCameraMode === cam.id
                        ? "bg-sky-500/25 text-white ring-1 ring-sky-400/60"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onResetCamera}
                  title="Reset Camera View"
                  className="ml-0.5 inline-flex items-center gap-1 rounded-lg border border-white/10 px-1.5 py-1 font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Honest Data Provenance Badge */}
            <div
              title={horizonsProvenance.source}
              className="hud-soft inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
            >
              <Database className="h-3 w-3 text-cyan-300" />
              <span
                className={
                  solarScaleMode === "exploration"
                    ? "text-amber-200"
                    : horizonsProvenance.isLive
                      ? "text-emerald-300"
                      : "text-sky-200"
                }
              >
                {solarScaleMode === "exploration"
                  ? "Distances compressed 24× (Educational Scale)"
                  : solarScaleMode === "scientific"
                    ? "TRUE SCALE · 1:1 ASTRONOMICAL"
                    : `${horizonsProvenance.provenance} · ${horizonsProvenance.source}`}
              </span>
            </div>
          </div>

          {showMetersGroup && (
            <div
              data-testid="hud-group-meters"
              className="flex flex-col items-end gap-2"
            >
              {!freeExploreMode && (
                <div className="hud-soft pointer-events-auto flex items-center divide-x divide-white/10 rounded-2xl px-3.5 py-2 tabular-nums">
                  <div className="flex items-center gap-2 pr-3.5">
                    <Battery
                      className={`h-4 w-4 lg:h-5 lg:w-5 ${resources.power <= 20 ? "text-rose-400" : "text-amber-400"}`}
                    />
                    <div>
                      <span className="block text-sm leading-none font-bold text-white lg:text-base">
                        {Math.round(resources.power)}%
                      </span>
                      <span className="text-[11px] text-slate-400">Power</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3.5">
                    <Wind className="h-4 w-4 text-sky-300 lg:h-5 lg:w-5" />
                    <div>
                      <span className="block text-sm leading-none font-bold text-white lg:text-base">
                        {Math.round(resources.oxygen)}%
                      </span>
                      <span className="text-[11px] text-slate-400">Air</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3.5">
                    <Shield
                      className={`h-4 w-4 lg:h-5 lg:w-5 ${resources.shield <= 20 ? "text-rose-400" : "text-amber-400"}`}
                    />
                    <div>
                      <span
                        className={`block text-sm leading-none font-bold lg:text-base ${
                          resources.shield <= 20
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        {Math.round(resources.shield)}%
                      </span>
                      <span className="text-[11px] text-slate-400">Shield</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-3.5">
                    <Compass className="h-4 w-4 text-amber-400 lg:h-5 lg:w-5" />
                    <div>
                      <span className="block text-sm leading-none font-bold text-white lg:text-base">
                        {Math.round(distToTarget)} u
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {solarScaleMode === "exploration"
                          ? "Target [24× scale]"
                          : "Target"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(space.inRadiationZone ||
                space.fuelPct < 35 ||
                (!freeExploreMode && (space.commsDelaySec ?? 0) > 1.0)) && (
                <div className="flex flex-wrap justify-end gap-2">
                  {space.commsDelaySec != null && space.commsDelaySec > 1.0 && (
                    <span className="hud-soft rounded-xl px-3 py-1 text-xs font-semibold text-amber-200 tabular-nums">
                      {space.commsDelaySec < 60
                        ? `${space.commsDelaySec.toFixed(2)}s radio lag`
                        : `${(space.commsDelaySec / 60).toFixed(1)}m radio lag`}
                    </span>
                  )}
                  {space.fuelPct < 35 && (
                    <span className="hud-soft rounded-xl px-3 py-1 text-xs font-semibold text-amber-200 tabular-nums">
                      Fuel {Math.round(space.fuelPct)}%
                    </span>
                  )}
                  {space.inRadiationZone && (
                    <button
                      type="button"
                      onClick={onToggleShieldBoost}
                      className="hud-soft-alert pointer-events-auto rounded-xl px-3 py-1 text-xs font-semibold text-rose-200 transition hover:border-rose-300"
                    >
                      {donkiFlareActive ? "Solar Storm" : "Radiation Zone"}
                      {space.radiationDoseRateUsvH != null
                        ? ` (${space.radiationDoseRateUsvH.toFixed(0)} µSv/h)`
                        : ""}{" "}
                      ·{" "}
                      {space.shieldBoostActive ? "Shield On" : "Enable Shield"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT-SIDE SELECTED PLANET INFO CARD */}
      {selectedBody && (
        <aside
          data-testid="solar-planet-info-card"
          className="hud-soft pointer-events-auto fixed top-1/2 right-3.5 z-10 max-h-[calc(100vh-236px)] w-[292px] -translate-y-1/2 overflow-y-auto rounded-2xl p-4 text-slate-100 lg:right-6 lg:w-[314px]"
        >
          {/* Planet Header Lockup */}
          <div className="flex items-start justify-between gap-2.5 border-b border-white/10 pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/10 p-1 shadow-[0_0_20px_rgba(34,211,238,0.18)]">
                <PlanetThumb bodyId={selectedBody.id} size="lg" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-lg leading-tight font-bold text-white lg:text-xl">
                    {selectedBody.name}
                  </h2>
                  {isSelectedBodyExplored && (
                    <span
                      title="Explored"
                      className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-cyan-300"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs font-medium text-cyan-300/90 lg:text-sm">
                  {selectedBody.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Switch to Orion View"
              title="Back to Orion Camera"
              onClick={() => onFocusSolarBody(null)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Clean Tabular Scientific Data Rows */}
          <dl className="mt-2.5 divide-y divide-white/[0.06] text-xs tabular-nums lg:text-[13px]">
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <CircleDot className="h-3.5 w-3.5 text-cyan-300" />
                Diameter
              </dt>
              <dd className="text-right font-semibold text-white">
                {selectedBody.diameterDisplay}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <Scale className="h-3.5 w-3.5 text-cyan-300" />
                Mass
              </dt>
              <dd className="text-right font-semibold text-white">
                {selectedBody.massDisplay}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <ArrowDown className="h-3.5 w-3.5 text-cyan-300" />
                Gravity
              </dt>
              <dd className="text-right font-semibold text-white">
                {selectedBody.gravityDisplay}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-cyan-300" />
                Orbital Period
              </dt>
              <dd className="text-right font-semibold text-white">
                {selectedBody.orbitalPeriodDisplay}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <Orbit className="h-3.5 w-3.5 text-cyan-300" />
                Avg. Distance
              </dt>
              <dd className="text-right font-semibold text-white">
                {selectedBody.avgDistanceDisplay}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <Compass className="h-3.5 w-3.5 text-cyan-300" />
                Tilt / Inclination
              </dt>
              <dd className="text-right font-semibold text-white">
                {selectedBody.axialTiltDeg}° · i {selectedBody.inclinationDeg}°
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <Orbit className="h-3.5 w-3.5 text-cyan-300" />
                Eccentricity
              </dt>
              <dd className="text-right font-semibold text-white">
                e = {selectedBody.eccentricity.toFixed(4)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="inline-flex shrink-0 items-center gap-2 text-slate-400">
                <Database className="h-3.5 w-3.5 text-cyan-300" />
                Data Source
              </dt>
              <dd className="text-right text-[11px] font-bold text-emerald-300">
                <a
                  href={getNasaFactSheetUrl(selectedBody.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline decoration-cyan-400/50"
                  title="View official NASA Planetary Fact Sheet"
                >
                  <span>{selectedBody.provenance}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-2.5 border-t border-white/10 pt-2.5 text-xs leading-relaxed text-slate-300 lg:text-[13px]">
            {selectedBody.fact}
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              data-testid="explore-planet-btn"
              onClick={() => onExploreSolarBody(selectedBody.id)}
              className="hud-cta-cyan inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:text-base"
            >
              <span>{exploreButtonLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            {onFlyToSolarBody && selectedBody.id !== "sun" && (
              <button
                type="button"
                data-testid="fly-orion-body-btn"
                onClick={() => onFlyToSolarBody(selectedBody.id)}
                className="hud-btn-glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition lg:text-sm"
              >
                <Rocket className="h-3.5 w-3.5 text-cyan-300" />
                <span>Fly Orion Here</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* BOTTOM ROW: Compact Circular Minimap (Left), Planet Bar + Contextual Actions (Center), Controls (Right) */}
      <div className="flex items-end justify-between gap-3">
        {/* Bottom-Left: Compact Circular Solar System Minimap */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab("map")}
          title="Open Full Solar Map [M]"
          className="hud-soft group pointer-events-auto relative h-28 w-28 shrink-0 rounded-full p-1 transition hover:border-cyan-300/75 lg:h-[120px] lg:w-[120px]"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle
              cx="72"
              cy="72"
              r="62"
              fill="#070c18"
              stroke="rgba(56,189,248,0.34)"
              strokeWidth="1.2"
            />
            <text
              x="72"
              y="13"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="#cbd5e1"
            >
              N
            </text>

            {/* Concentric Orbit Rings (Heliocentric in Explore/Real AU, Range Rings in Local) */}
            {solarScaleMode === "local" ? (
              [12, 30, 47.1].map((rRing, idx) => (
                <circle
                  key={`local-ring-${idx}`}
                  cx="72"
                  cy="72"
                  r={rRing}
                  fill="none"
                  stroke={
                    idx === 2
                      ? "rgba(34,211,238,0.45)"
                      : "rgba(148,163,184,0.22)"
                  }
                  strokeWidth={idx === 2 ? "1.0" : "0.75"}
                />
              ))
            ) : (
              <>
                {[
                  "mercury",
                  "venus",
                  "earth",
                  "mars",
                  "jupiter",
                  "saturn",
                  "uranus",
                  "neptune",
                  "pluto",
                ].map((id) => {
                  const pt = mapDotPos(id);
                  const isSelectedOrbit = focusedSolarBodyId === id;
                  const isEarthOrMars = id === "earth" || id === "mars";
                  return (
                    <circle
                      key={`ring-${id}`}
                      cx="72"
                      cy="72"
                      r={pt.rOrbit}
                      fill="none"
                      stroke={
                        isSelectedOrbit
                          ? "rgba(34,211,238,0.68)"
                          : isEarthOrMars
                            ? "rgba(125,211,252,0.36)"
                            : "rgba(148,163,184,0.22)"
                      }
                      strokeWidth={isSelectedOrbit ? "1.1" : "0.75"}
                    />
                  );
                })}

                {/* Local Lunar Orbit Circle around Earth */}
                {(() => {
                  const earthPt = mapDotPos("earth");
                  const localMoonR =
                    solarScaleMode === "scientific" ? 2.6 : 3.4;
                  return (
                    <circle
                      cx={earthPt.rx}
                      cy={earthPt.ry}
                      r={localMoonR}
                      fill="none"
                      stroke={
                        focusedSolarBodyId === "moon" ||
                        focusedSolarBodyId === "earth"
                          ? "rgba(34,211,238,0.65)"
                          : "rgba(148,163,184,0.38)"
                      }
                      strokeWidth="0.7"
                    />
                  );
                })()}

                {/* Sun Core */}
                <circle cx="72" cy="72" r="8" fill="rgba(251,191,36,0.22)" />
                <circle cx="72" cy="72" r="5.5" fill="#fbbf24" />
              </>
            )}

            {/* Planet Dots */}
            {PRIMARY_SOLAR_BAR_IDS.filter((id) => id !== "sun").map((id) => {
              const pt = mapDotPos(id);
              const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === id);
              const hex = spec
                ? `#${spec.color.toString(16).padStart(6, "0")}`
                : "#38bdf8";
              const isSelected = focusedSolarBodyId === id;
              return (
                <g key={`dot-${id}`}>
                  {isSelected && (
                    <circle
                      cx={pt.rx}
                      cy={pt.ry}
                      r={id === "moon" ? 4.0 : 5.6}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.4"
                    />
                  )}
                  <circle
                    cx={pt.rx}
                    cy={pt.ry}
                    r={id === "jupiter" ? 3.2 : id === "moon" ? 1.6 : 2.4}
                    fill={hex}
                  />
                </g>
              );
            })}

            {/* Orion Spacecraft Marker */}
            <circle
              cx={shipMapX}
              cy={shipMapY}
              r="2.6"
              fill="#ffffff"
              stroke="#f59e0b"
              strokeWidth="1.2"
            />
          </svg>
          <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md border border-cyan-400/40 bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-cyan-200 opacity-0 transition group-hover:opacity-100">
            Map [M]
          </span>
        </button>

        {/* Bottom-Center: Contextual Transit Actions, Speed Indicator & 11-World Selector Bar */}
        <div
          data-testid="hud-group-speed"
          className="flex min-w-0 flex-col items-center gap-2"
        >
          {/* Time Warp Ladder & Flight Control Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Time Warp Ladder */}
            {(() => {
              const currentWarp = space.timeWarp ?? 1;
              return (
                <div
                  data-testid="time-warp-ladder"
                  className="hud-soft pointer-events-auto flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-mono-tech"
                >
                  <div
                    className="flex items-center gap-1.5 pr-2 border-r border-white/10 text-slate-300"
                    title={`Simulation Rate: ${currentWarp}x (~${Math.round(currentWarp * 70).toLocaleString()}x real time)`}
                  >
                    <Clock className="h-3 w-3 text-cyan-300" />
                    <span className="font-bold text-white">{currentWarp}x</span>
                  </div>
                  {([0.5, 1, 2, 5, 10, 50, 100, 500, 1000] as const).map((tw) => (
                    <button
                      key={tw}
                      type="button"
                      data-testid={`warp-btn-${tw}`}
                      onClick={() => onSetTimeWarp?.(tw)}
                      title={`Set Time Warp to ${tw}x [Use [ and ] keys]`}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition ${
                        currentWarp === tw
                          ? "bg-cyan-400/25 border border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                          : "text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {tw}x
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* SAS Modes & Fine Throttle */}
            <div
              data-testid="flight-sas-throttle"
              className="hud-soft pointer-events-auto flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs font-mono-tech"
            >
              {/* Throttle Controls */}
              <div
                className="flex items-center gap-1.5"
                title="Fine Throttle: Click/drag bar · [-]/[C] Down (-10%) · [+]/[Shift] Up (+10%) · [Z] Full · [X] Cut"
              >
                <span className="text-[10px] font-bold text-slate-400">
                  THR:
                </span>
                <button
                  type="button"
                  data-testid="throttle-minus-btn"
                  onClick={() => onSetThrottle?.(Math.max(0, Math.round(((space.throttle ?? 0) - 0.1) * 10) / 10))}
                  title="Throttle -10% [C]"
                  className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] font-bold text-slate-300 hover:text-white hover:bg-white/15"
                >
                  -
                </button>
                <div
                  data-testid="throttle-slider"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = Math.min(1, Math.max(0, clickX / rect.width));
                    onSetThrottle?.(Math.round(pct * 20) / 20);
                  }}
                  className="group relative h-2.5 w-16 cursor-pointer overflow-hidden rounded-full bg-slate-800 border border-white/15 hover:border-cyan-400/60 transition"
                  title="Click anywhere on slider to set throttle (0% to 100%)"
                >
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-75"
                    style={{
                      width: `${Math.round((space.throttle ?? 0) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  data-testid="throttle-plus-btn"
                  onClick={() => onSetThrottle?.(Math.min(1, Math.round(((space.throttle ?? 0) + 0.1) * 10) / 10))}
                  title="Throttle +10% [Shift]"
                  className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] font-bold text-slate-300 hover:text-white hover:bg-white/15"
                >
                  +
                </button>
                <span className="w-7 text-right text-[10px] font-bold text-white tabular-nums">
                  {Math.round((space.throttle ?? 0) * 100)}%
                </span>
                <button
                  type="button"
                  data-testid="throttle-cut-btn"
                  onClick={() => onSetThrottle?.(0)}
                  title="Cut Throttle [X]"
                  className="rounded border border-rose-500/40 bg-rose-500/15 px-1 py-0.5 text-[9px] font-bold text-rose-300 hover:bg-rose-500/30"
                >
                  CUT
                </button>
                <button
                  type="button"
                  data-testid="throttle-full-btn"
                  onClick={() => onSetThrottle?.(1.0)}
                  title="Full Throttle [Z]"
                  className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1 py-0.5 text-[9px] font-bold text-cyan-300 hover:bg-cyan-500/30"
                >
                  FULL
                </button>
              </div>

              <div className="h-3.5 w-px bg-white/15" />

              {/* SAS Modes */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">
                  SAS:
                </span>
                {(["MANUAL", "PROGRADE", "RETROGRADE", "TARGET"] as const).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`sas-btn-${mode.toLowerCase()}`}
                      onClick={() => onSetSasMode?.(mode)}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                        (space.sasMode ?? "MANUAL") === mode
                          ? "bg-amber-400/25 border border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                          : "text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {mode === "PROGRADE"
                        ? "⨁ PRO"
                        : mode === "RETROGRADE"
                          ? "⨂ RETRO"
                          : mode}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Planets Strip Toggle Button */}
            <button
              type="button"
              data-testid="toggle-planet-strip-btn"
              onClick={() => setShowPlanetsStrip((prev) => !prev)}
              className={`hud-soft pointer-events-auto flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                showPlanetsStrip || spaceCameraMode === "overview"
                  ? "border border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                  : "border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              title="Toggle Solar System Worlds Strip"
            >
              <Orbit className="h-3.5 w-3.5 text-cyan-300" />
              <span>Planets</span>
              {showPlanetsStrip || spaceCameraMode === "overview" ? (
                <ChevronDown className="h-3 w-3 text-cyan-300" />
              ) : (
                <ChevronUp className="h-3 w-3 text-slate-400" />
              )}
            </button>
          </div>

          {showContextualRow && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {campaignMission !== "artemis-2" && space.inSatDeployZone && !sat.linkLocked && (
                <button
                  type="button"
                  data-testid="deploy-sat-btn"
                  data-hold-keys="action"
                  className="hud-cta-cyan pointer-events-auto inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold lg:text-sm"
                >
                  <Radio className="h-4 w-4" />
                  Hold E to Deploy Relay (
                  {Math.round((sat.solarDeployedPct + sat.dishAlignedPct) / 2)}
                  %)
                </button>
              )}

              {campaignMission === "artemis-2" && (space.arrivedMoon || space.inSatDeployZone || sat.linkLocked) && (
                <button
                  type="button"
                  data-testid="complete-sat-mission-btn"
                  onClick={onCompleteSatelliteMission}
                  className="hud-cta-cyan pointer-events-auto rounded-xl px-4 py-1.5 text-xs font-bold lg:text-sm"
                >
                  Lunar Flyby Complete — Return to Earth
                </button>
              )}

              {space.arrivedGateway && campaignMission === "artemis-4" && (
                <button
                  type="button"
                  data-testid="complete-gateway-mission-btn"
                  onClick={onCompleteGatewayMission}
                  className="hud-cta-cyan pointer-events-auto rounded-xl px-4 py-1.5 text-xs font-bold lg:text-sm"
                >
                  Gateway Docked — Complete Artemis IV
                </button>
              )}

              {showLandMoon && (
                <button
                  type="button"
                  data-testid="land-moon-btn"
                  onClick={onEnterLunarOrbit}
                  className="hud-btn-glass pointer-events-auto inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition hover:border-cyan-400 lg:text-sm"
                >
                  <Rocket className="h-3.5 w-3.5 text-cyan-300" />
                  Land on Moon
                </button>
              )}

              {showLandMars && (
                <button
                  type="button"
                  data-testid="land-mars-btn"
                  onClick={onEnterMarsOrbit}
                  className="hud-btn-glass pointer-events-auto inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition hover:border-cyan-400 lg:text-sm"
                >
                  <Rocket className="h-3.5 w-3.5 text-cyan-300" />
                  Land on Mars
                </button>
              )}

              {(isMoving ||
                solarScaleMode !== "exploration" ||
                space.trajectoryRegime) && (
                <div
                  data-testid="hud-telemetry-pill"
                  className="hud-soft flex items-center gap-2.5 rounded-full border border-cyan-400/25 bg-slate-950/85 px-4 py-1.5 text-xs font-mono-tech tabular-nums shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md"
                >
                  <span className="font-bold tracking-wide text-white">
                    {space.orbitalSpeedKmS != null
                      ? `${space.orbitalSpeedKmS.toFixed(2)} km/s`
                      : `${shipSpeed.toFixed(1)} u/s`}
                  </span>

                  {space.altitudeKm != null && (
                    <>
                      <span className="h-3 w-px bg-white/20" />
                      <span className="text-slate-300">
                        Alt{" "}
                        <strong className="font-semibold text-white">
                          {space.altitudeKm.toLocaleString()}
                        </strong>{" "}
                        km
                      </span>
                    </>
                  )}

                  {(space.trajectoryRegime || space.dominantBodyName) && (
                    <>
                      <span className="h-3 w-px bg-white/20" />
                      <span className="font-semibold text-sky-300">
                        {space.trajectoryRegime ||
                          `${space.dominantBodyName} Orbit`}
                      </span>
                    </>
                  )}

                  {space.distanceToTargetKm != null && (
                    <>
                      <span className="h-3 w-px bg-white/20" />
                      <span className="text-amber-300">
                        Target{" "}
                        {Math.round(
                          space.distanceToTargetKm,
                        ).toLocaleString()}{" "}
                        km
                      </span>
                    </>
                  )}

                  {space.autoPilot && (
                    <span className="rounded border border-amber-400/40 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-300 uppercase">
                      Auto
                    </span>
                  )}

                  {space.radiationDoseRateUsvH != null &&
                    space.radiationDoseRateUsvH > 100 && (
                      <span className="rounded border border-rose-500/40 bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-rose-300 uppercase">
                        {space.radiationDoseRateUsvH.toFixed(0)} µSv/h
                      </span>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Compact 11-Body Selector Strip (Shown when toggled or in Overview camera mode) */}
          {(showPlanetsStrip || spaceCameraMode === "overview") && (
            <div
              data-testid="solar-planet-strip"
              className="hud-soft pointer-events-auto flex max-w-[calc(100vw-310px)] items-center gap-0.5 overflow-x-auto rounded-2xl px-2 py-1.5 lg:max-w-[calc(100vw-350px)]"
            >
              {PRIMARY_SOLAR_BAR_IDS.map((bodyId) => {
                const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
                if (!spec) return null;
                const isSelected = focusedSolarBodyId === bodyId;
                return (
                  <button
                    key={bodyId}
                    type="button"
                    data-testid={`solar-bar-${bodyId}`}
                    onClick={() => onFocusSolarBody(bodyId)}
                    className={`group relative flex min-w-[46px] shrink-0 flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 transition-all duration-200 lg:min-w-[52px] ${
                      isSelected
                        ? "border border-cyan-400/90 bg-cyan-500/18 shadow-[0_0_16px_rgba(34,211,238,0.26)]"
                        : "border border-transparent hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`transition-transform duration-200 ${
                        isSelected ? "scale-105" : "group-hover:scale-105"
                      }`}
                    >
                      <PlanetThumb bodyId={bodyId} size="xs" />
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-wide lg:text-[11px] ${
                        isSelected
                          ? "text-white"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {spec.shortName}
                    </span>
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="h-0.5 w-5 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom-Right: Streamlined Navigation Controls Hint Pill */}
        <div
          data-testid="hud-group-hints"
          className="hud-soft pointer-events-auto flex shrink-0 items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-mono-tech"
        >
          <span className="text-[11px] font-bold text-cyan-300">WASD</span>
          <span className="text-[11px] text-slate-300">Steer</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="text-[11px] font-bold text-cyan-300">Shift/C</span>
          <span className="text-[11px] text-slate-300">Thr</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="text-[11px] font-bold text-cyan-300">V</span>
          <span className="text-[11px] text-slate-300">FPV</span>
          {!freeExploreMode && (
            <>
              <span className="h-3 w-px bg-white/15" />
              <button
                type="button"
                onClick={onToggleAutoPilot}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${
                  space.autoPilot
                    ? "border-amber-400/50 bg-amber-400/25 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                    : "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                title="Toggle Orion Autopilot [G key]"
              >
                G {space.autoPilot ? "Auto On" : "Auto"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
