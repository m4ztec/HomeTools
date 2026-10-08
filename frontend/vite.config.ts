import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    nitro({
      preset: "node-server",
      routeRules: {
        "/api/**": {
          proxy: "http://127.0.0.1:8081/api/**",
        },
      },
    }),
  ],
  resolve: { tsconfigPaths: true },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/backend/**"] },
  },
});
