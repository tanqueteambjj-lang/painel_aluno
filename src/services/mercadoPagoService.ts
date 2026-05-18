export const createMPCheckout = async (params: {
  title: string;
  price: number;
  studentId: string;
  studentEmail: string;
  action: 'payment' | 'subscription';
  planId?: string;
}) => {
  try {
    console.log(`[MercadoPagoService] Calling MP API... Action: ${params.action}`, params);
    const response = await fetch('/api/pay/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log(`[MercadoPagoService] API Response Status: ${response.status}`);
    const contentType = response.headers.get('content-type');
    
    let data: any;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error(`[MercadoPagoService] Expected JSON but received: ${text.substring(0, 200)}...`);
      throw new Error(`O servidor retornou uma resposta inválida (Status ${response.status}). Verifique os logs do servidor.`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erro ao criar sessão de pagamento no Mercado Pago');
    }

    if (data.init_point) {
      console.log(`[MercadoPagoService] Redirecting to: ${data.init_point}`);
      window.location.href = data.init_point;
    } else {
      console.error('[MercadoPagoService] No init_point in response:', data);
      throw new Error('Ponto de início de pagamento não recebido (ID do Mercado Pago pode estar ausente)');
    }
  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    throw error;
  }
};
