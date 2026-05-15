import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Stripe lazy-loaded
  let stripe: Stripe | null = null;
  function getStripe() {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY || 'sk_test_51TX0MCK3Sea0s4uAI8qtqFHfmREy7NjwXY5XBxcwhK8pqkM1dRFENUizVFfRI2m6lMGcaTipYvWMOhifJDJKf7vU00sQY4HJtL';
      stripe = new Stripe(key);
    }
    return stripe;
  }

  // Mercado Pago Configuration
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803' });

  app.use(cors());
  app.use(express.json());

  // Global request logging for debugging production
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
  });

  app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.sendStatus(200);
  });

  // --- STRIPE ENDPOINTS ---
  app.post("/api/checkout/stripe", async (req, res) => {
    console.log("Processing Stripe Checkout POST...");
    try {
      const { planName, price, studentId, studentEmail, recurring = false, priceId } = req.body;
      console.log("Request payload:", { planName, price, studentId, studentEmail, recurring, priceId });
      
      if (!studentId) {
        return res.status(400).json({ error: "O ID do aluno é obrigatório." });
      }

      const stripeClient = getStripe();
      const unitAmount = Math.round(Number(price || 0) * 100);

      if (!priceId && unitAmount <= 0) {
        return res.status(400).json({ error: "O valor do plano deve ser maior que zero." });
      }

      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId ? {
        price: priceId,
        quantity: 1,
      } : {
        price_data: {
          currency: "brl",
          product_data: {
            name: planName || "Mensalidade Jiu-Jitsu",
          },
          unit_amount: unitAmount,
          ...(recurring ? { recurring: { interval: 'month' } } : {})
        },
        quantity: 1,
      };

      const origin = req.headers.origin || "http://localhost:3000";
      const appUrl = (process.env.APP_URL && process.env.APP_URL.startsWith('http')) ? process.env.APP_URL : origin;

      const sessionParam: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items: [lineItem],
        mode: (recurring || priceId) ? "subscription" : "payment",
        success_url: `${appUrl}/financeiro?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/financeiro`,
        client_reference_id: studentId,
        metadata: { studentId, planName: planName || "" },
      };

      if (studentEmail && studentEmail.trim() !== "" && studentEmail.includes('@')) {
        sessionParam.customer_email = studentEmail;
      }

      const session = await stripeClient.checkout.sessions.create(sessionParam);
      console.log("Session created:", session.id);
      return res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Checkout error:", error);
      return res.status(500).json({ 
        error: error.message || "Erro interno no Stripe SDK",
        type: error.type || "StripeError"
      });
    }
  });

  // --- MERCADO PAGO ENDPOINTS ---
  app.post('/api/mp/preference', async (req, res) => {
    try {
      const { title, price, payer_email } = req.body;
      const preference = new Preference(mpClient);
      const result = await preference.create({
        body: {
          items: [{ title: title || 'Plano', quantity: 1, unit_price: Number(price) || 100 }],
          payer: { email: payer_email || 'test@test.com' },
          back_urls: {
            success: process.env.APP_URL || (req.headers.origin || 'http://localhost:3000'),
            failure: process.env.APP_URL || (req.headers.origin || 'http://localhost:3000')
          },
          auto_return: 'approved',
        }
      });
      res.json({ id: result.id, init_point: result.init_point });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create preference', details: error.message });
    }
  });

  // --- VITE / STATIC MIDDLEWARE ---
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
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
