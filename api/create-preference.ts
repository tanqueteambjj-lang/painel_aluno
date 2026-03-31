export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { MercadoPagoConfig, Preference } = await import('mercadopago');
    
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse body:', e);
      }
    }
    
    const { title, quantity, price, payer_email } = body || {};

    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803' 
    });

    const preference = new Preference(client);

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
          success: process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
          failure: process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
          pending: process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        },
        auto_return: 'approved',
      }
    });

    res.status(200).json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error: any) {
    console.error('Error creating preference:', error);
    res.status(500).json({ error: 'Failed to create preference', details: error.message });
  }
}