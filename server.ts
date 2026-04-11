import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { adminDb, adminStorage } from "./src/lib/firebase-admin";

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

  // Real-structured Payment Gateway (Simulated for now)
  const activePayments = new Map<string, { status: string; amount: number; method: string; expiresAt: number }>();

  app.post("/api/payments/create", (req, res) => {
    const { amount, method, metadata } = req.body;
    const id = "pay_" + Math.random().toString(36).substring(7);
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    activePayments.set(id, {
      status: "PENDING",
      amount,
      method,
      expiresAt
    });

    // Simulate payment confirmation after 10 seconds for testing (PIX)
    if (method === "pix") {
      setTimeout(() => {
        const payment = activePayments.get(id);
        if (payment && payment.status === "PENDING") {
          payment.status = "CONFIRMED";
          activePayments.set(id, payment);
        }
      }, 10000);
    }

    const response: any = {
      id,
      status: "PENDING",
      amount,
      expiresAt
    };

    if (method === "pix") {
      response.qr_code = `00020126360014BR.GOV.BCB.PIX0114+551199999999952040000530398654${amount.toFixed(2)}5802BR5912PowerControl6009SaoPaulo62070503***6304`;
      response.qr_code_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="; // Mock base64
    }

    res.json(response);
  });

  app.get("/api/payments/status/:id", (req, res) => {
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

  // Confirm card payment (simulated)
  app.post("/api/payments/confirm-card", (req, res) => {
    const { payment_id, card_data } = req.body;
    const payment = activePayments.get(payment_id);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Simulate processing delay
    setTimeout(() => {
      payment.status = "CONFIRMED";
      activePayments.set(payment_id, payment);
    }, 2000);

    res.json({ status: "PROCESSING", message: "Seu pagamento está sendo processado." });
  });

  // FocusNFe Webhook
  app.post("/api/webhooks/fiscal", async (req, res) => {
    const payload = req.body;
    const reference = payload.ref;

    console.log(`Received fiscal webhook for ref: ${reference}, status: ${payload.status}`);

    if (!reference) {
      return res.status(400).json({ error: "Missing reference" });
    }

    try {
      const invoicesRef = adminDb.collection("invoices");
      const q = invoicesRef.where("reference", "==", reference).limit(1);
      const snapshot = await q.get();

      if (snapshot.empty) {
        console.warn(`Invoice not found for reference: ${reference}`);
        return res.status(404).json({ error: "Invoice not found" });
      }

      const doc = snapshot.docs[0];
      const invoiceData = doc.data();
      const companyId = invoiceData.company_id;

      let newStatus = invoiceData.status;
      let xmlStorageUrl = invoiceData.xml_storage_url;

      if (payload.status === "autorizado") {
        newStatus = "Emitida";
        if (payload.caminho_xml_nota_fiscal && payload.chave_nfe && !xmlStorageUrl) {
          try {
            const xmlResponse = await axios.get(payload.caminho_xml_nota_fiscal, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(xmlResponse.data);

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const storagePath = `invoices/${companyId}/${year}/${month}/${payload.chave_nfe}.xml`;

            const file = adminStorage.bucket().file(storagePath);
            await file.save(buffer, {
              metadata: { contentType: 'application/xml' }
            });

            xmlStorageUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${storagePath}`;
          } catch (e) {
            console.error("Failed to persist XML in webhook:", e);
          }
        }
      } else if (payload.status === "erro_autorizacao") {
        newStatus = "Erro";
      } else if (payload.status === "cancelado") {
        newStatus = "Cancelada";
      }

      await doc.ref.update({
        status: newStatus,
        protocol: payload.protocolo || invoiceData.protocol,
        access_key: payload.chave_nfe || invoiceData.access_key,
        xml_url: payload.caminho_xml_nota_fiscal || invoiceData.xml_url,
        xml_storage_url: xmlStorageUrl || invoiceData.xml_storage_url,
        pdf_url: payload.caminho_danfe || invoiceData.pdf_url,
        error_message: payload.mensagem_sefaz || invoiceData.error_message,
        updated_at: new Date().toISOString()
      });

      res.json({ status: "ok" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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
