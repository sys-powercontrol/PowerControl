import * as fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');

// Add mercadopago import after axios
serverTs = serverTs.replace('import axios from "axios";',
`import axios from "axios";
import { MercadoPagoConfig, Payment } from 'mercadopago';`);

// Replace /api/payments/create and /api/payments/status/:id logic
const patternCreate = /app\.post\("\/api\/payments\/create", \(req, res\) => \{[\s\S]*?(?=app\.get\("\/api\/payments\/status\/:id")/;
const replacementCreate = `app.post("/api/payments/create", async (req, res) => {
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

  `;

serverTs = serverTs.replace(patternCreate, replacementCreate);

const patternStatus = /app\.get\("\/api\/payments\/status\/:id", \(req, res\) => \{[\s\S]*?(?=\/\/ Confirm card payment \(simulated\))/;
const replacementStatus = `app.get("/api/payments/status/:id", async (req, res) => {
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

  `;

serverTs = serverTs.replace(patternStatus, replacementStatus);

fs.writeFileSync('server.ts', serverTs);
