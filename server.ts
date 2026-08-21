import express from "express";
import app from "./src/serverApp";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const PORT = 3000;
  const publicDir = path.join(process.cwd(), "public");

  // Always serve public directory static files first with correct MIME types
  app.use(express.static(publicDir));

  // Explicit handlers for service worker and web manifest
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(path.join(publicDir, "sw.js"));
  });

  app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(path.join(publicDir, "manifest.json"));
  });

  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
