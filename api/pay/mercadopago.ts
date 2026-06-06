import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { MercadoPagoConfig, Preference } = await import('mercadopago');
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803';
    const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    } else if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf8')); } catch { body = {}; }
    } else if (!body) {
      body = {};
    }

    const { action, title, price, payer_email, studentEmail, planId, studentId } = body;

    const finalEmail = (payer_email || studentEmail || 'administrativo@tanqueteambjj.com.br').trim();
    const origin = req.headers.origin || (process.env.APP_URL || "https://ais-pre-ss6fb4rybd5zz4spw5y6hy-121814073773.us-west1.run.app");
    const appUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    if (action === 'subscription') {
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
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: data.message || "Erro ao criar assinatura no Mercado Pago",
          details: data
        });
      }

      return res.status(200).json({ id: data.id, init_point: data.init_point });
    } else {
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

      const result = await preference.create(preferenceData);
      return res.status(200).json({ id: result.id, init_point: result.init_point });
    }
  } catch (error: any) {
    console.error("Mercado Pago Serverless Error:", error);
    return res.status(500).json({ 
      error: error.message || 'Falha ao processar pagamento com Mercado Pago',
      details: error.details || error.toString()
    });
  }
}
