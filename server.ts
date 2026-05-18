import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "ss6fb4rybd5zz4spw5y6hy" // Keep the actual Firebase Project ID for initialization
  });
}
const firestoreAdmin = admin.firestore();

// Application ID used for data storage path
const APP_DATA_ID = "tanqueteam-bjj"; 

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
    
    if (!studentId && action !== 'mp_plan_creator') {
       console.warn("[MercadoPago Handler] studentId is missing in request body");
    }

    const finalEmail = (payer_email || studentEmail || 'administrativo@tanqueteambjj.com.br').trim();
    // Default to the known production URL if headers are missing
    const origin = req.headers.origin || (process.env.APP_URL || "https://ais-pre-ss6fb4rybd5zz4spw5y6hy-121814073773.us-west1.run.app");
    const appUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    console.log(`[MercadoPago Handler] Origin: ${origin}, AppURL: ${appUrl}, Email: ${finalEmail}, Action: ${action}`);

    if (action === 'subscription') {
      console.log(`[MercadoPago Handler] Processing SUBSCRIPTION for Plan: ${planId}`);
      if (!planId) {
        return res.status(400).json({ error: "O ID do Plano (Plan ID) é obrigatório para assinaturas." });
      }

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
          status: "pending"
        })
      });

      const data = await response.json();
      console.log(`[MercadoPago Handler] MP Subscription Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.error("[MercadoPago Handler] MP Subscription Error Data:", data);
        return res.status(response.status).json({ 
          error: data.message || "Erro ao criar assinatura no Mercado Pago",
          details: data
        });
      }

      return res.json({ id: data.id, init_point: data.init_point });
    } else {
      console.log(`[MercadoPago Handler] Processing ONE-TIME PAYMENT. Price: ${price}`);
      // Default: One-time payment via Preference
      const preference = new Preference(mpClient);
      const preferenceData = {
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
          notification_url: process.env.WEBHOOK_URL || undefined,
        }
      };

      console.log("[MercadoPago Handler] Preference Payload:", JSON.stringify(preferenceData));

      const result = await preference.create(preferenceData);
      console.log("[MercadoPago Handler] Preference Created Success:", result.id);
      
      // We wrap result in JSON and return
      return res.json({ id: result.id, init_point: result.init_point });
    }
  } catch (error: any) {
    console.error("Mercado Pago Backend Error:", error);
    // Ensure we always return JSON
    return res.status(500).json({ 
      error: error.message || 'Falha ao processar pagamento com Mercado Pago',
      details: error.details || error.toString()
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

// --- MERCADO PAGO WEBHOOK ---
app.post("/api/webhooks/mercadopago", async (req, res) => {
  const { query, body } = req;
  const topic = query.topic || query.type || body.type;
  const id = query.id || (body.data && body.data.id);

  console.log(`[MP Webhook] Received - Topic: ${topic}, ID: ${id}`);

  // We only care about payments and sub approvals
  if (topic === 'payment' || topic === 'subscription_preapproval') {
    try {
      let paymentData;
      
      if (topic === 'payment') {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
          headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });
        paymentData = await response.json();
      } else {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
          headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });
        paymentData = await response.json();
      }

      // Handle successful status
      const status = paymentData.status;
      if (status === 'approved' || status === 'authorized') {
        const studentEmail = paymentData.payer?.email || paymentData.payer_email;
        const externalRef = paymentData.external_reference; // studentId
        const amount = paymentData.transaction_amount || (paymentData.auto_recurring && paymentData.auto_recurring.transaction_amount);

        console.log(`[MP Webhook] Success! Approved payment for ${studentEmail}. External Ref (Student ID): ${externalRef}`);

        const studentsPath = `artifacts/${APP_DATA_ID}/public/data/students`;
        
        let studentDocToUpdate: admin.firestore.DocumentReference | null = null;

        // 1. Try to find by external_reference (Student ID)
        if (externalRef && externalRef !== "null" && externalRef !== "undefined" && externalRef !== "") {
          const docRef = firestoreAdmin.collection(studentsPath).doc(externalRef);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            studentDocToUpdate = docRef;
          }
        }

        // 2. If not found by ID, try finding by email
        if (!studentDocToUpdate && studentEmail) {
          console.log(`[MP Webhook] Student ID not provided or not found. Searching by email: ${studentEmail}`);
          const snapshot = await firestoreAdmin.collection(studentsPath).where("email", "==", studentEmail).limit(1).get();
          if (!snapshot.empty) {
            studentDocToUpdate = snapshot.docs[0].ref;
          }
        }

        if (studentDocToUpdate) {
          console.log(`[MP Webhook] Updating student status for: ${studentDocToUpdate.id}`);
          await studentDocToUpdate.update({
            'financeiro.status': 'em dia',
            'financeiro.ultimoPagamento': admin.firestore.FieldValue.serverTimestamp(),
            'financeiro.valorPago': amount || 0,
            'financeiro.metodo': 'Mercado Pago',
            'updatedAt': admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[MP Webhook] Student ${studentDocToUpdate.id} updated successfully to 'em dia'.`);
        } else {
          console.warn(`[MP Webhook] Student NOT FOUND for email ${studentEmail} or reference ${externalRef}. Status remains unchanged.`);
        }
      }
    } catch (error) {
      console.error("[MP Webhook] Processing Error:", error);
    }
  }

  res.sendStatus(200); // Always return 200 to MP to stop retries
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
