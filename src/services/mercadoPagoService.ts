export const createMPCheckout = async (params: {
  title: string;
  price: number;
  studentId: string;
  studentEmail: string;
  action: 'payment' | 'subscription';
  planId?: string;
}) => {
  try {
    console.log(`[MercadoPagoService] Calling MP API... Action: ${params.action}`);
    const response = await fetch('/api/pay/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log(`[MercadoPagoService] API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar sessão de pagamento no Mercado Pago');
    }

    const data = await response.json();
    
    if (data.init_point) {
      // Redirect user to Mercado Pago checkout
      window.location.href = data.init_point;
    } else {
      throw new Error('Ponto de início de pagamento não recebido');
    }
  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    throw error;
  }
};
