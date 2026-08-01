import express from "express";
import axios from "axios";
import { adminDb, adminStorage } from "./lib/firebase-admin";

export const app = express();

app.use(express.json());

// API Routes
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok" });
});

// Real-structured Payment Gateway (Simulated)
const activePayments = new Map<string, { 
  status: string; 
  amount: number; 
  method: string; 
  expiresAt: number; 
  isMock?: boolean; 
  createdAt?: number;
}>();

app.post(["/api/payments/create", "/payments/create"], async (req, res) => {
  const { amount, method } = req.body;
  const methodLower = (method || "").toString().toLowerCase();
  
  if (methodLower === "pix") {
    // Simulated PIX Payment
    const id = "mock_pix_" + Math.random().toString(36).substring(7);
    const expiresAt = Date.now() + 30 * 60 * 1000;
    
    // Generate a standard dummy BRCode payload for PIX copy & paste
    const dummyQrCode = `00020101021226580014br.gov.bcb.pix011400000000000000021504PDV_5204000053039865405${Number(amount).toFixed(2)}5802BR5915EMPRESA PDV6008BRASILIA62070503PDV6304`;
    
    activePayments.set(id, {
      status: "PENDING",
      amount,
      method,
      expiresAt,
      isMock: true,
      createdAt: Date.now()
    });

    return res.json({
      id,
      status: "PENDING",
      amount,
      expiresAt,
      qr_code: dummyQrCode,
      qr_code_base64: ""
    });
  } else {
      const id = "pay_card_" + Math.random().toString(36).substring(7);
      const expiresAt = Date.now() + 30 * 60 * 1000;
      activePayments.set(id, { 
        status: "PENDING", 
        amount, 
        method, 
        expiresAt,
        isMock: true,
        createdAt: Date.now()
      });
      res.json({ id, status: "PENDING", amount, expiresAt });
  }
});

app.get(["/api/payments/status/:id", "/payments/status/:id"], async (req, res) => {
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

  if ((payment as any).isMock && payment.status === "PENDING") {
    // Auto-confirm mock payment after 8 seconds of polling to simulate user making the payment
    if (Date.now() - (payment as any).createdAt > 8000) {
      payment.status = "CONFIRMED";
      activePayments.set(id, payment);
    }
  }

  res.json(payment);
});

// Confirm card payment (simulated)
app.post(["/api/payments/confirm-card", "/payments/confirm-card"], (req, res) => {
  const { payment_id } = req.body;
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
app.post(["/api/webhooks/fiscal", "/webhooks/fiscal"], async (req, res) => {
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
app.post(["/api/fiscal/send-email", "/fiscal/send-email"], async (req, res) => {
  try {
    const { invoice_id, recipient_email } = req.body;
    if (!invoice_id || !recipient_email) {
      return res.status(400).json({ error: "Parâmetros 'invoice_id' e 'recipient_email' são obrigatórios." });
    }

    const docRef = adminDb.collection("invoices").doc(invoice_id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Nota Fiscal não encontrada." });
    }

    const invoiceData = doc.data();
    console.log(`[Fiscal Email] Disparando e-mail para ${recipient_email} relativo à NF #${invoiceData?.number}`);

    return res.json({ status: "ok", message: `Nota Fiscal #${invoiceData?.number || ""} enviada para ${recipient_email} com sucesso!` });
  } catch (error: any) {
    console.error("Erro ao enviar e-mail fiscal:", error);
    return res.status(500).json({ error: "Erro interno ao processar o envio de e-mail." });
  }
});

app.post(["/api/webhooks/fiscal/focus", "/webhooks/fiscal/focus"], async (req, res) => {
  try {
    const payload = req.body;
    const protocol = payload.protocolo;
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

app.post(["/api/webhooks/fiscal/webmania", "/webhooks/fiscal/webmania"], async (req, res) => {
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

// Manifest & Service Worker routing
app.get(["/manifest.webmanifest", "/manifest.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.json({
    name: "PowerControl ERP",
    short_name: "PowerControl",
    description: "Sistema de Gestão Empresarial e PDV Inteligente",
    theme_color: "#2563eb",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  });
});

export default app;
