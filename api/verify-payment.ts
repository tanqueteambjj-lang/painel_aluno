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
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ error: 'Missing payment_id' });
    }

    const { MercadoPagoConfig, Payment } = await import('mercadopago');
    
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803' 
    });

    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: String(payment_id) });

    return res.status(200).json({ 
      status: paymentInfo.status,
      amount: paymentInfo.transaction_amount,
      method: paymentInfo.payment_method_id
    });
  } catch (error: Error | unknown) {
    console.error('MercadoPago Verify Error:', error);
    return res.status(400).json({ 
      error: 'Failed to verify payment', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
