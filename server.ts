import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Simulated PIX Payment Gateway
  const activePayments = new Map<string, { status: string; amount: number; expiresAt: number }>();

  app.post("/api/payments/pix", (req, res) => {
    const { amount } = req.body;
    const id = Math.random().toString(36).substring(7);
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    activePayments.set(id, {
      status: "PENDING",
      amount,
      expiresAt
    });

    // Simulate payment confirmation after 15 seconds for testing
    setTimeout(() => {
      const payment = activePayments.get(id);
      if (payment && payment.status === "PENDING") {
        payment.status = "CONFIRMED";
        activePayments.set(id, payment);
      }
    }, 15000);

    res.json({
      id,
      payload: `00020126360014BR.GOV.BCB.PIX0114+551199999999952040000530398654${amount.toFixed(2)}5802BR5912PowerControl6009SaoPaulo62070503***6304`,
      expiresAt
    });
  });

  app.get("/api/payments/pix/:id", (req, res) => {
    const { id } = req.params;
    const payment = activePayments.get(id);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (Date.now() > payment.expiresAt && payment.status === "PENDING") {
      payment.status = "EXPIRED";
      activePayments.set(id, payment);
    }

    res.json(payment);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
