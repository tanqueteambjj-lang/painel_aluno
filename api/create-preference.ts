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
    console.log("Starting preference creation...");
    
    // Dynamically import mercadopago to avoid top-level crashes
    const { MercadoPagoConfig, Preference } = await import('mercadopago');
    console.log("MercadoPago imported successfully.");

    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803' 
    });

    const preference = new Preference(client);
    
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    } else if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf8')); } catch { body = {}; }
    } else if (!body) {
      body = {};
    }
    
    const { title, quantity, price, payer_email } = body || {};
    console.log("Payload parsed:", { title, quantity, price, payer_email });

    const result = await preference.create({
      body: {
        items: [{
          id: 'item-ID-1234',
          title: title || 'Plano Tanque Team',
          quantity: Number(quantity) || 1,
          unit_price: Number(price) || 100
        }],
        payer: {
          email: payer_email || 'test_user_123@testuser.com'
        },
        back_urls: {
          success: process.env.APP_URL || 'https://tanqueteambjj.com.br',
          failure: process.env.APP_URL || 'https://tanqueteambjj.com.br',
          pending: process.env.APP_URL || 'https://tanqueteambjj.com.br'
        },
        auto_return: 'approved',
      }
    });

    console.log("Preference created successfully:", result.id);
    return res.status(200).json({ id: result.id, init_point: result.init_point });
  } catch (error: Error | unknown) {
    console.error('MercadoPago Preference Error:', error);
    // Return a 200 with error details so Vercel doesn't just show a generic 500 page if it crashes the response
    return res.status(400).json({ 
      error: 'Failed to create preference', 
      details: error instanceof Error ? error.message : String(error),
      stack: error?.stack
    });
  }
}
