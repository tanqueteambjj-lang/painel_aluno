import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req: any, res: any) {
  // Configuração de CORS (IMPORTANTE: 'true' deve ser string)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

    const payment = new Payment(client);
    
    // Garante que o body seja lido corretamente
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    
    const { transaction_amount, description, payer_email, payer_first_name, payer_last_name, payer_identification } = body || {};

    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount) || 100,
        description: description || 'Plano Tanque Team',
        payment_method_id: 'pix',
        payer: {
          email: payer_email || 'test_user_123@testuser.com',
          first_name: payer_first_name || 'Aluno',
          last_name: payer_last_name || 'Tanque',
          identification: {
            type: 'CPF',
            number: payer_identification || '12345678909'
          }
        }
      },
      requestOptions: {
        idempotencyKey: Math.random().toString(36).substring(7),
      }
    });

    return res.status(200).json({
      id: result.id,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
    });
  } catch (error: any) {
    console.error('Error creating PIX payment:', error);
    return res.status(500).json({ error: 'Failed to create PIX payment', details: error.message });
  }
}