# Artemis Odyssey 3D Mission Simulator

## Project Architecture
- **Framework**: React 19 + Vite 6 + Tailwind CSS v4 + Three.js
- **Entry Points**: `index.html`, `src/main.tsx`, `src/App.tsx`
- **Key Directories**:
  - `src/components`: UI HUDs (`TitleOverlay.tsx`, `LaunchHUD.tsx`, `LandingHUD.tsx`, `RoverHUD.tsx`, `SpaceFlightHUD.tsx`, `NasaDataModal.tsx`)
  - `src/three`: 3D Engine & Procedural Geometries (`SpaceSceneManager.ts`, `models.ts`, `textures.ts`)
  - `src/game`: State management, campaign definitions, flight physics

## Build & Verify Commands
- Install: `npm install`
- Typecheck: `npm run lint` (`tsc --noEmit`)
- Build: `npm run build`
- Dev server: `npm run dev`
