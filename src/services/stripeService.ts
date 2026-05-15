import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51TX0MCK3Sea0s4uAQLUoP63xDqVMHhf9s2pZQg6P4ncx6QBNdv8i4Ub7QMFswEEJuubdojF0yXp4d9aSkFgqbEOf00PS5TI44A');

export const createCheckoutSession = async (params: {
  planName: string;
  price: number;
  studentId: string;
  studentEmail: string;
  recurring?: boolean;
  priceId?: string;
}) => {
  try {
    console.log(`[StripeService] Calling checkout API... Path: /api/pay/stripe`);
    const response = await fetch('/api/pay/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log(`[StripeService] API Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage = 'Erro ao criar sessão de pagamento';
      const text = await response.text();
      console.warn(`Stripe error: ${response.status} ${response.statusText} at ${response.url}. Response: ${text}`);
      
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If 405, it might be an HTML error page from the proxy
        if (response.status === 405) {
          errorMessage = `Método Não Permitido (405). O servidor recusou a requisição POST. (URL: ${response.url}) Conteúdo: ${text.substring(0, 50)}...`;
        } else {
          errorMessage = text || `Erro do servidor (${response.status})`;
        }
      }
      throw new Error(errorMessage);
    }

    try {
      const data = await response.json();
      return data.url;
    } catch (e) {
      console.error('Failed to parse successful Stripe response:', e);
      throw new Error('O servidor retornou uma resposta inválida. Tente novamente.');
    }
  } catch (error: any) {
    console.error('Stripe Service Error:', error);
    throw error;
  }
};

export const redirectToCheckout = async (url: string) => {
  window.location.href = url;
};
