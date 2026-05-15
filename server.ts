import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

const app = express();
const PORT = 3000;

// Stripe Setup
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || 'sk_test_51TX0MCK3Sea0s4uAI8qtqFHfmREy7NjwXY5XBxcwhK8pqkM1dRFENUizVFfRI2m6lMGcaTipYvWMOhifJDJKf7vU00sQY4HJtL';
const stripe = new Stripe(STRIPE_SECRET);

// Mercado Pago Setup
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803';
const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

// Middleware
app.use(cors());
app.use(express.json());

// Global request logging for debugging production
app.use((req, res, next) => {
  console.log(`[REQUEST] ${new Date().toISOString()} ${req.method} ${req.url} - Origin: ${req.headers.origin} - Referer: ${req.headers.referer} - UA: ${req.headers['user-agent']}`);
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    mode: process.env.NODE_ENV,
    stripe: !!STRIPE_SECRET,
    mp: !!MP_ACCESS_TOKEN
  });
});

// --- STRIPE CHECKOUT ---
const stripeHandler = async (req: express.Request, res: express.Response) => {
  console.log(`[Stripe Handler] ${req.method} ${req.url}`);
  console.log("Request Body:", JSON.stringify(req.body));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed. Use POST.` });
  }

  try {
    const { planName, price, studentId, studentEmail, recurring = false, priceId } = req.body;
    
    if (priceId && priceId.startsWith('prod_')) {
      return res.status(400).json({ 
        error: "ID de Produto detectado. O Stripe exige um 'ID de Preço' (que começa com 'price_'), não um 'ID de Produto' (que começa com 'prod_'). Por favor, verifique as configurações do plano no Painel Administrativo.",
        code: 'invalid_price_id_type'
      });
    }

    if (!studentId) {
      return res.status(400).json({ error: "O ID do aluno é obrigatório. (Backend Error: Missing studentId)" });
    }

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

    const origin = req.headers.origin || (process.env.APP_URL || "http://localhost:3000");
    const appUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    console.log(`Using App URL for success/cancel: ${appUrl}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: (recurring || priceId) ? "subscription" : "payment",
      success_url: `${appUrl}/financeiro?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/financeiro`,
      client_reference_id: studentId,
      metadata: { studentId, planName: planName || "" },
      customer_email: (studentEmail && typeof studentEmail === 'string' && studentEmail.includes('@')) ? studentEmail.trim() : undefined,
    });

    console.log("Stripe Session Created:", session.id);
    return res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Backend Error Detail:", error);
    return res.status(500).json({ 
      error: error.message || "Erro interno ao processar Stripe",
      type: error.type,
      raw: process.env.NODE_ENV !== 'production' ? error : undefined
    });
  }
};

// Register routes using .all to handle method mismatches gracefully
app.all("/api/pay/stripe", stripeHandler);
app.all("/api/pay/stripe/", stripeHandler);

// --- MERCADO PAGO ---
const mpHandler = async (req: express.Request, res: express.Response) => {
  console.log(`[MercadoPago Handler] ${req.method} ${req.url}`);
  console.log("Request Body:", JSON.stringify(req.body));

  try {
    const { action, title, price, payer_email, studentEmail, planId, studentId } = req.body;
    const finalEmail = payer_email || studentEmail || 'administrativo@tanqueteambjj.com.br';
    const origin = req.headers.origin || (process.env.APP_URL || "http://localhost:3000");
    const appUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    if (action === 'subscription') {
      // For subscriptions, we use the Preapproval API
      // Note: Preapproval usually requires a pre-created planId or inline definition
      // We'll use the pre-created planId provided in the request
      if (!planId) {
        return res.status(400).json({ error: "O ID do Plano (Plan ID) é obrigatório para assinaturas." });
      }

      // Using raw fetch for Preapproval as the SDK might have different versions
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preapproval_plan_id: planId,
          reason: title || "Assinatura Tanque Team",
          external_reference: studentId,
          payer_email: finalEmail,
          back_url: `${appUrl}/financeiro`,
          status: "pending" // Will redirect user to pay
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar assinatura no Mercado Pago");
      }

      // init_point is where the user completes the preapproval
      return res.json({ id: data.id, init_point: data.init_point });
    } else {
      // Default: One-time payment via Preference
      const preference = new Preference(mpClient);
      const result = await preference.create({
        body: {
          items: [{ 
            title: title || 'Mensalidade Jiu-Jitsu', 
            quantity: 1, 
            unit_price: Number(price) || 100,
            currency_id: 'BRL'
          }],
          payer: { email: finalEmail },
          back_urls: {
            success: `${appUrl}/financeiro`,
            pending: `${appUrl}/financeiro`,
            failure: `${appUrl}/financeiro`
          },
          auto_return: 'approved',
          external_reference: studentId,
          notification_url: process.env.WEBHOOK_URL, // Optional
        }
      });
      return res.json({ id: result.id, init_point: result.init_point });
    }
  } catch (error: any) {
    console.error("Mercado Pago Backend Error:", error);
    res.status(500).json({ 
      error: error.message || 'Falha ao processar pagamento com Mercado Pago',
      details: error.details
    });
  }
};

app.all("/api/pay/mercadopago", mpHandler);
app.all("/api/pay/mercadopago/", mpHandler);

// --- MERCADO PAGO PLAN CREATOR ---
app.post("/api/mp/create-plan", async (req, res) => {
  console.log("[MP Plan Creator] Request:", req.body);
  try {
    const { reason, amount, repetitions } = req.body;
    const origin = req.headers.origin || (process.env.APP_URL || "http://localhost:3000");
    const appUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || "Plano Tanque Team BJJ",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          repetitions: Number(repetitions) || 12,
          billing_day: 10,
          billing_day_proportional: true,
          transaction_amount: Number(amount) || 100,
          currency_id: "BRL"
        },
        payment_methods_allowed: {
          payment_types: [{ id: "credit_card" }]
        },
        back_url: `${appUrl}/financeiro`
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Erro ao criar plano no Mercado Pago");
    }

    // Retorna o ID gerado (ex: 2c938084...)
    res.json({ id: data.id });
  } catch (error: any) {
    console.error("MP Plan Creator Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- SPA FALLBACK ---
async function setupFrontend() {
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
}

setupFrontend().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
});
