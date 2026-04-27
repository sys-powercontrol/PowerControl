import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { MercadoPagoConfig, Payment } from 'mercadopago';
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

  app.post("/api/payments/create", async (req, res) => {
    const { amount, method, metadata } = req.body;
    
    if (method === "pix") {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(400).json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado no servidor." });
      }

      try {
        const client = new MercadoPagoConfig({ accessToken });
        const paymentClient = new Payment(client);

        const response = await paymentClient.create({
          body: {
            transaction_amount: Number(amount),
            description: 'Venda PDV PowerControl',
            payment_method_id: 'pix',
            payer: {
              email: 'cliente@powercontrol.com',
              first_name: 'Cliente',
              last_name: 'PDV'
            }
          }
        });

        const id = response.id!.toString();
        const qrCode = response.point_of_interaction?.transaction_data?.qr_code;
        const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;

        activePayments.set(id, {
          status: "PENDING",
          amount,
          method,
          expiresAt: Date.now() + 30 * 60 * 1000,
          isMercadoPago: true
        } as any);

        return res.json({
          id,
          status: "PENDING",
          amount,
          expiresAt: Date.now() + 30 * 60 * 1000,
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64
        });
      } catch (error) {
        console.error("MercadoPago erro:", error);
        return res.status(500).json({ error: "Erro ao gerar PIX no Mercado Pago." });
      }
    } else {
        const id = "pay_" + Math.random().toString(36).substring(7);
        const expiresAt = Date.now() + 30 * 60 * 1000;
        activePayments.set(id, { status: "PENDING", amount, method, expiresAt });
        res.json({ id, status: "PENDING", amount, expiresAt });
    }
  });

  app.get("/api/payments/status/:id", async (req, res) => {
    const { id } = req.params;
    const payment = activePayments.get(id);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (Date.now() > payment.expiresAt && payment.status === "PENDING") {
      payment.status = "EXPIRED";
      activePayments.set(id, payment);
      return res.json(payment);
    }

    if ((payment as any).isMercadoPago && payment.status === "PENDING") {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (accessToken) {
        try {
          const client = new MercadoPagoConfig({ accessToken });
          const paymentClient = new Payment(client);
          const response = await paymentClient.get({ id: Number(id) });
          
          if (response.status === "approved") {
            payment.status = "CONFIRMED";
            activePayments.set(id, payment);
          } else if (response.status === "cancelled" || response.status === "rejected") {
            payment.status = "EXPIRED";
            activePayments.set(id, payment);
          }
        } catch (e) {
          console.error("Erro consultando status MP:", e);
        }
      }
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

  
  // Fiscal Webhooks
  app.post("/api/webhooks/fiscal/focus", async (req, res) => {
    try {
      const payload = req.body;
      const protocol = payload.protocolo; // Based on focus format
      const status = payload.status;
      
      const snapshot = await adminDb.collection('invoices').where('protocol', '==', protocol).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        let newStatus = 'Processando';
        if (status === 'autorizado') newStatus = 'Emitida';
        if (status === 'erro_autorizacao' || status === 'denegado') newStatus = 'Rejeitada';
        if (status === 'cancelado') newStatus = 'Cancelada';

        await doc.ref.update({
           status: newStatus,
           xml_url: payload.caminho_xml_nota_fiscal || doc.data().xml_url,
           pdf_url: payload.caminho_danfe || doc.data().pdf_url,
           message: payload.mensagem_sefaz || doc.data().message,
           access_key: payload.chave_nfe || doc.data().access_key,
        });
      }
      res.json({ received: true });
    } catch (e) {
      console.error("Focus webhook error:", e);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/webhooks/fiscal/webmania", async (req, res) => {
    try {
      const payload = req.body;
      const uuid = payload.uuid;
      const status = payload.status;
      
      const snapshot = await adminDb.collection('invoices').where('protocol', '==', uuid).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        let newStatus = 'Processando';
        if (status === 'aprovado') newStatus = 'Emitida';
        if (status === 'reprovado') newStatus = 'Rejeitada';
        if (status === 'cancelado') newStatus = 'Cancelada';

        await doc.ref.update({
           status: newStatus,
           xml_url: payload.xml || doc.data().xml_url,
           pdf_url: payload.danfe || doc.data().pdf_url,
           message: payload.motivo || doc.data().message,
           access_key: payload.chave || doc.data().access_key,
        });
      }
      res.json({ received: true });
    } catch (e) {
      console.error("Webmania webhook error:", e);
      res.status(500).json({ error: "Internal error" });
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
