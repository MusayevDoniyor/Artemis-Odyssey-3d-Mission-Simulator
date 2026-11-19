import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": import.meta.dirname,
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) {
              return "vendor-three";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "vendor-lucide";
            }
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom")
            ) {
              return "vendor-react";
            }
            if (id.includes("src/three/models")) {
              return "three-models";
            }
            if (id.includes("src/three/SpaceSceneManager")) {
              return "three-scenemanager";
            }
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
