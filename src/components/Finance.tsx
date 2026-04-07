import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, CreditCard, Printer, Receipt, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import ReceiptModal from './ReceiptModal';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(`${dateStr}T12:00:00`);
    }
    return new Date(dateStr);
  }
  return new Date(dateStr);
};

export default function Finance({ currentUserData, planInfo }: any) {
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansRef = collection(db, 'artifacts', 'tanqueteam-bjj', 'public', 'data', 'plans');
        const snapshot = await getDocs(plansRef);
        const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbPlans(plansData);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };
    fetchPlans();
  }, []);

  const planName = planInfo?.short || currentUserData?.plan || 'Plano Padrão';
  
  // Try to find the matching plan from DB
  const matchedPlan = dbPlans.find(p => 
    p.name?.toLowerCase() === planName.toLowerCase() || 
    (currentUserData?.plan && currentUserData.plan.toLowerCase().includes(p.name?.toLowerCase()))
  );
  
  let parsedPrice = undefined;
  if (currentUserData?.plan && typeof currentUserData.plan === 'string' && currentUserData.plan.includes(' - R$')) {
    const priceStr = currentUserData.plan.split(' - R$')[1].trim().replace(',', '.');
    const parsed = parseFloat(priceStr);
    if (!isNaN(parsed)) parsedPrice = parsed;
  }
  
  const planPrice = matchedPlan?.price !== undefined ? matchedPlan.price : (planInfo?.price !== undefined ? planInfo.price : (parsedPrice !== undefined ? parsedPrice : (currentUserData?.planPrice || 150.00)));
  const basePrice = matchedPlan?.basePrice !== undefined ? matchedPlan.basePrice : planPrice;
  
  const isFreePlan = planPrice === 0 || currentUserData?.paymentStatus === 'Isento' || currentUserData?.plan?.toLowerCase() === 'isento' || currentUserData?.plan?.toLowerCase() === 'dependente';
  const isInvalidPlan = false;

  let formattedDueDate = "Não definido";
  const dueDateValue = currentUserData?.dueDate || currentUserData?.nextDueDate;
  if (dueDateValue) {
    const dateObj = parseDateString(dueDateValue);
    if (!isNaN(dateObj.getTime())) {
      formattedDueDate = dateObj.toLocaleDateString('pt-BR');
    }
  }

  let formattedContractEnd = "Não definido";
  if (currentUserData?.contractEndDate) {
    const dateObj = parseDateString(currentUserData.contractEndDate);
    if (!isNaN(dateObj.getTime())) {
      formattedContractEnd = dateObj.toLocaleDateString('pt-BR');
    }
  }

  let formattedRegistration = "Não definido";
  if (currentUserData?.registrationDate) {
    const dateObj = parseDateString(currentUserData.registrationDate);
    if (!isNaN(dateObj.getTime())) {
      formattedRegistration = dateObj.toLocaleDateString('pt-BR');
    }
  }

  const histArray = Array.isArray(currentUserData?.paymentHistory) ? currentUserData.paymentHistory : Object.values(currentUserData?.paymentHistory || {});
  histArray.sort((a: any, b: any) => parseDateString(b.timestamp || b.date).getTime() - parseDateString(a.timestamp || a.date).getTime());

  const handlePrintReceipt = (receipt: any) => {
    setSelectedReceipt({
      date: parseDateString(receipt.timestamp || receipt.date).toLocaleDateString('pt-BR'),
      amount: Number(receipt.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Financeiro & Contrato
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Acompanhe as informações do seu plano e histórico de pagamentos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Plan Details & Contract */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status da Assinatura</h3>
                <div className="flex items-center gap-3">
                  {currentUserData?.paymentStatus === 'Pendente' ? (
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Pendente
                    </span>
                  ) : isFreePlan ? (
                    <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                      <Award className="w-4 h-4" /> Isento
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Em dia
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 md:items-end">
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-600">
                  <Clock className="w-5 h-5 text-brand-red" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Próximo Vencimento</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedDueDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-gray-500" /> Detalhes do Contrato
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Plano Contratado</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{planName}</p>
                </div>
                
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Valor Mensal</p>
                  {isFreePlan ? (
                    <p className="text-xl font-bold text-brand-red">Isento</p>
                  ) : isInvalidPlan ? (
                    <p className="text-xl font-bold text-gray-400">--</p>
                  ) : basePrice !== planPrice ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-xl border border-green-100 dark:border-green-800/30">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-green-600 dark:text-green-400 mb-1">Até o vencimento</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300 leading-none">R$ {planPrice.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex-1 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/30">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-red-600 dark:text-red-400 mb-1">Após o vencimento</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300 leading-none">R$ {basePrice.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      R$ {planPrice.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Data de Matrícula</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> {formattedRegistration}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Vencimento do Contrato</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> {formattedContractEnd}
                  </p>
                </div>
              </div>
            </div>

            {currentUserData?.hasPromotion && currentUserData?.promoNote && (
              <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-800/30">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-1">Condição Especial Aplicada</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{currentUserData.promoNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-500" /> Histórico de Pagamentos
            </h3>
            
            <div className="space-y-4">
              {histArray.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                    <Receipt className="w-8 h-8 text-gray-300 dark:text-gray-500" />
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
