import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Stripe lazy-loaded for safety if keys missing on startup
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

// --- STRIPE ENDPOINTS ---

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { planName, price, studentId, studentEmail, recurring = false, priceId } = req.body;
    const stripeClient = getStripe();

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId ? {
      price: priceId,
      quantity: 1,
    } : {
      price_data: {
        currency: "brl",
        product_data: {
          name: planName || "Mensalidade Jiu-Jitsu",
        },
        unit_amount: Math.round(Number(price) * 100),
        ...(recurring ? { 
            recurring: { 
                interval: 'month' 
            } 
        } : {})
      },
      quantity: 1,
    };

    const sessionParam: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: recurring ? "subscription" : "payment",
      success_url: `${process.env.APP_URL || (req.headers.origin || "http://localhost:3000")}/financeiro?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || (req.headers.origin || "http://localhost:3000")}/financeiro`,
      customer_email: studentEmail,
      client_reference_id: studentId,
      metadata: {
        studentId,
        planName,
      },
    };

    const session = await stripeClient.checkout.sessions.create(sessionParam);
    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- MERCADO PAGO ENDPOINTS (Restored from server.mjs) ---

app.post('/api/create-preference', async (req, res) => {
  try {
    const { title, quantity, price, payer_email } = req.body;
    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'item-ID-1234',
            title: title || 'Plano Tanque Team',
            quantity: quantity || 1,
            unit_price: Number(price) || 100
          }
        ],
        payer: {
          email: payer_email || 'test_user_123@testuser.com'
        },
        back_urls: {
          success: process.env.APP_URL || (req.headers.origin || 'http://localhost:3000'),
          failure: process.env.APP_URL || (req.headers.origin || 'http://localhost:3000'),
          pending: process.env.APP_URL || (req.headers.origin || 'http://localhost:3000')
        },
        auto_return: 'approved',
      }
    });
    res.json({ id: result.id, init_point: result.init_point });
  } catch (error: any) {
    console.error('Error creating preference:', error);
    res.status(500).json({ error: 'Failed to create preference', details: error.message });
  }
});

app.post('/api/create-pix-payment', async (req, res) => {
  try {
    const { transaction_amount, description, payer_email, payer_first_name, payer_last_name, payer_identification } = req.body;
    const payment = new Payment(mpClient);
    const requestOptions = {
      idempotencyKey: Math.random().toString(36).substring(7),
    };
    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: payer_email,
          first_name: payer_first_name,
          last_name: payer_last_name,
          identification: {
            type: 'CPF',
            number: payer_identification || '12345678909'
          }
        }
      },
      requestOptions
    });
    res.json({
      id: result.id,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
    });
  } catch (error: any) {
    console.error('Error creating PIX payment:', error);
    res.status(500).json({ error: 'Failed to create PIX payment', details: error.message });
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
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
