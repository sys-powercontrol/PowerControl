import express from "express";
import app from "./src/serverApp";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    // Rewrite /sw.js to /dev-sw.js in development to ensure seamless compatibility with Vite PWA dev options
    app.get("/sw.js", (req, res, next) => {
      req.url = "/dev-sw.js";
      next();
    });

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
