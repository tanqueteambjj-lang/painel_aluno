import { AlertTriangle, CheckCircle, Clock, FileText, ShieldCheck, QrCode, CreditCard, Loader2, Printer } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import ReceiptModal from './ReceiptModal';

const parseDateString = (dateStr: any) => {
  if (!dateStr) return new Date();
  if (dateStr.toDate) return dateStr.toDate();
  if (typeof dateStr === 'string') {
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
      }
    }
    return new Date(dateStr);
  }
  return new Date(dateStr);
};

export default function Finance({ currentUserData, planInfo, showAlert }: any) {
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const planName = planInfo?.short || currentUserData?.plan || 'Plano Padrão';
  
  let parsedPrice = undefined;
  if (currentUserData?.plan && typeof currentUserData.plan === 'string' && currentUserData.plan.includes(' - R$')) {
    const priceStr = currentUserData.plan.split(' - R$')[1].trim().replace(',', '.');
    const parsed = parseFloat(priceStr);
    if (!isNaN(parsed)) parsedPrice = parsed;
  }
  
  const planPrice = planInfo?.price !== undefined ? planInfo.price : (parsedPrice !== undefined ? parsedPrice : (currentUserData?.planPrice || 150.00));
  const isFreePlan = planPrice === 0 || currentUserData?.paymentStatus === 'Isento' || currentUserData?.plan?.toLowerCase() === 'isento' || currentUserData?.plan?.toLowerCase() === 'dependente';
  const isInvalidPlan = false;

  let formattedDueDate = "Não definido";
  if (currentUserData?.dueDate) {
    const dateObj = currentUserData.dueDate.toDate ? currentUserData.dueDate.toDate() : new Date(currentUserData.dueDate);
    formattedDueDate = dateObj.toLocaleDateString('pt-BR');
  }

  const histArray = Array.isArray(currentUserData?.paymentHistory) ? currentUserData.paymentHistory : Object.values(currentUserData?.paymentHistory || {});
  histArray.sort((a: any, b: any) => parseDateString(b.timestamp || b.date).getTime() - parseDateString(a.timestamp || a.date).getTime());

  const handlePrintReceipt = (receipt: any) => {
    setSelectedReceipt({
      date: parseDateString(receipt.timestamp || receipt.date).toLocaleDateString('pt-BR'),
      amount: Number(receipt.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    });
  };

  const handlePayment = async () => {
    if (isFreePlan) {
      showAlert('Aviso', 'Este plano não requer pagamento.', 'info');
      return;
    }
    if (isInvalidPlan) {
      showAlert('Erro', 'Plano inválido ou não configurado. Entre em contato com a administração.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (currentUserData?.id === 'mock_student_id' || currentUserData?.id === 'test_user') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        showAlert('Sucesso', 'Ambiente de teste: Redirecionamento para pagamento simulado.', 'success');
        setIsProcessing(false);
        return;
      }

      const isPix = typeof paymentMethod !== 'undefined' && paymentMethod === 'pix';
      const endpoint = isPix ? '/api/create-pix-payment' : '/api/create-preference';
      
      const payload = isPix ? {
        transaction_amount: planPrice || 100,
        description: `Plano ${planName}`,
        payer_email: currentUserData?.email || 'test_user_123@testuser.com',
        payer_first_name: currentUserData?.name?.split(' ')[0] || 'Aluno',
        payer_last_name: currentUserData?.name?.split(' ').slice(1).join(' ') || 'Tanque',
        payer_identification: currentUserData?.cpf || '12345678909'
      } : {
        title: `Plano ${planName}`,
        quantity: 1,
        price: planPrice || 100,
        payer_email: currentUserData?.email || 'test_user_123@testuser.com'
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Resposta não-JSON do servidor:", responseText);
        throw new Error(`Erro interno no servidor. Resposta: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao processar pagamento');
      }

      if (isPix) {
        if (data.ticket_url) {
          window.open(data.ticket_url, '_blank');
          showAlert('Sucesso', 'PIX gerado! Verifique a nova aba do seu navegador.', 'success');
        } else {
          throw new Error('Link do PIX não retornado');
        }
      } else {
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          throw new Error('Link de pagamento não retornado');
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar pagamento:', error);
      showAlert('Erro', error.message || 'Ocorreu um erro ao processar o pagamento.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Minha Assinatura
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Gerencie seu plano, pagamentos e histórico.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Plan Details & Payment */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Plan Overview Card (Netflix Style) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Plano Atual</h3>
                  <div className="flex items-center gap-3">
                    <h4 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{planName}</h4>
                    {currentUserData?.paymentStatus === 'Pendente' ? (
                      <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Pendente
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Ativo
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-3xl font-bold text-brand-red">
                    {isFreePlan ? 'Isento' : isInvalidPlan ? '--' : `R$ ${planPrice.toFixed(2).replace('.', ',')}`}
                    {!isFreePlan && !isInvalidPlan && <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">/mês</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Próximo Vencimento</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedDueDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          {!isFreePlan && !isInvalidPlan && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-green-500" /> Pagamento Seguro
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === 'pix' 
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                  }`}
                >
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">PIX</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Aprovação imediata</div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentMethod('credit')}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === 'credit' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">Cartão de Crédito</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Até 12x via Mercado Pago</div>
                  </div>
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handlePayment}
                disabled={!paymentMethod || isProcessing}
                className="w-full py-4 rounded-xl font-bold text-white bg-brand-red hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-md"
              >
                {isProcessing ? (
                  <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processando...</span>
                ) : (
                  <>Realizar Pagamento {paymentMethod === 'pix' ? 'com PIX' : paymentMethod === 'credit' ? 'com Cartão' : ''}</>
                )}
              </motion.button>
              
              <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Pagamento processado com segurança pelo Mercado Pago
              </p>
            </div>
          )}
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Histórico de Faturas
            </h3>
            
            <div className="space-y-4">
              {histArray.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Nenhum pagamento registrado.</p>
                </div>
              ) : (
                histArray.map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">
                        {parseDateString(p.timestamp || p.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {parseDateString(p.timestamp || p.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          {Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center justify-end gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" /> Pago
                        </p>
                      </div>
                      <button 
                        onClick={() => handlePrintReceipt(p)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Imprimir Recibo"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ReceiptModal 
        isOpen={!!selectedReceipt} 
        onClose={() => setSelectedReceipt(null)} 
        receiptData={selectedReceipt}
        userData={currentUserData}
        planShort={planName}
      />
    </div>
  );
}
