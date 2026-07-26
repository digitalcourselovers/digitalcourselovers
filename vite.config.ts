import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

function editorPreviewBridge(): Plugin {
  const writeJson = (
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (chunk?: string) => void;
    },
    statusCode: number,
    payload: Record<string, unknown>,
  ) => {
    res.statusCode = statusCode;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  };

  return {
    name: "editor-preview-bridge",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];

        if (pathname === "/__preview_ping") {
          writeJson(res, 200, { ok: true });
          return;
        }

        if (pathname === "/__hmr_gate") {
          writeJson(res, 200, { enabled: false, buffered: [] });
          return;
        }

        if (pathname === "/__hmr_flush") {
          server.ws.send({ type: "full-reload" });
          res.statusCode = 204;
          res.end();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 8080,
    host: true,
    allowedHosts: true,
  },
  plugins: [
    editorPreviewBridge(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    nitro({
      preset: "cloudflare-pages",
    }),
    viteReact(),
  ],
});
