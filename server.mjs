import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Mercado Pago Configuration
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803' });

    app.post('/api/create-pix-payment', async (req, res) => {
      try {
        const { transaction_amount, description, payer_email, payer_first_name, payer_last_name, payer_identification } = req.body;

        // We don't need to check process.env.MERCADOPAGO_ACCESS_TOKEN anymore since we have a fallback
        // if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
        //   return res.status(500).json({ error: 'Mercado Pago Access Token not configured on the server.' });
        // }

    const payment = new Payment(client);
    
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
            number: payer_identification || '12345678909' // Default/mock CPF if not provided
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
  } catch (error) {
    console.error('Error creating PIX payment:', error);
    res.status(500).json({ error: 'Failed to create PIX payment', details: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
