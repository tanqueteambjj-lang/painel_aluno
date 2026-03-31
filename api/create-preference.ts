import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req: any, res: any) {
  // Configuração de CORS para evitar bloqueios
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803' 
    });

    const preference = new Preference(client);
    const { title, quantity, price, payer_email } = req.body || {};

    const result = await preference.create({
      body: {
        items: [
          {
            id: 'item-ID-1234',
            title: title || 'Plano Tanque Team',
            quantity: Number(quantity) || 1,
            unit_price: Number(price) || 100
          }
        ],
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

    return res.status(200).json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error: any) {
    console.error('Error creating preference:', error);
    return res.status(500).json({ error: 'Failed to create preference', details: error.message });
  }
}