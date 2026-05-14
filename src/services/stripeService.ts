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
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
    }

    const { url } = await response.json();
    return url;
  } catch (error: any) {
    console.error('Stripe Service Error:', error);
    throw error;
  }
};

export const redirectToCheckout = async (url: string) => {
  window.location.href = url;
};
