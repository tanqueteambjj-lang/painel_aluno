import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, Receipt, Award, Printer, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReceiptModal from './ReceiptModal';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';

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
  
  let dynamicPaymentStatus = currentUserData?.paymentStatus || 'Em dia';
  let daysUntilDue: number | null = null;

  if (dueDateValue) {
    const dateObj = parseDateString(dueDateValue);
    if (!isNaN(dateObj.getTime())) {
      formattedDueDate = dateObj.toLocaleDateString('pt-BR');
      
      if (!isFreePlan) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dateObj);
        due.setHours(0, 0, 0, 0);
        
        const diffTime = due.getTime() - today.getTime();
        daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          dynamicPaymentStatus = 'Pendente';
        } else {
          dynamicPaymentStatus = 'Em dia';
        }
      }
    }
  }

  if (isFreePlan) {
    dynamicPaymentStatus = 'Isento';
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
    const amountNum = Number(receipt.amount);
    const fullAmountNum = receipt.fullAmount ? Number(receipt.fullAmount) : (basePrice > amountNum ? basePrice : amountNum);
    const discountNum = receipt.discount ? Number(receipt.discount) : (fullAmountNum > amountNum ? fullAmountNum - amountNum : 0);

    setSelectedReceipt({
      date: parseDateString(receipt.timestamp || receipt.date).toLocaleDateString('pt-BR'),
      amount: amountNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      fullAmount: fullAmountNum > amountNum ? fullAmountNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null,
      discount: discountNum > 0 ? discountNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null
    });
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plan Details & Contract */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Status Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Atual</p>
                {dynamicPaymentStatus === 'Pendente' ? (
                  <span className="text-red-500 font-black text-lg flex items-center gap-1 uppercase italic">
                    <AlertTriangle className="w-5 h-5" /> Pendente
                  </span>
                ) : dynamicPaymentStatus === 'Isento' ? (
                  <span className="text-gray-500 font-black text-lg flex items-center gap-1 uppercase italic">
                    <Award className="w-5 h-5" /> Isento
                  </span>
                ) : (
                  <span className="text-green-500 font-black text-lg flex items-center gap-1 uppercase italic">
                    <CheckCircle className="w-5 h-5" /> Em dia
                  </span>
                )}
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <Shield className="w-6 h-6 text-brand-red" />
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Próxima Fatura</p>
                <span className="text-gray-900 dark:text-white font-black text-lg uppercase italic">
                  {formattedDueDate}
                </span>
                {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7 && dynamicPaymentStatus !== 'Pendente' && (
                  <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase">Vence em {daysUntilDue}d</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Plan Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4" /> Detalhes do Contrato
              </h3>
              <span className="bg-brand-red/10 text-brand-red text-[10px] font-black px-3 py-1 rounded-full uppercase italic">{planName}</span>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Valor da Mensalidade</p>
                  {isFreePlan ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <p className="text-2xl font-black text-gray-500 italic uppercase">Isento de Mensalidade</p>
                    </div>
                  ) : basePrice !== planPrice ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                        <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Pontualidade</p>
                        <p className="text-2xl font-black text-green-700 dark:text-green-400">R$ {planPrice.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Valor Integral</p>
                        <p className="text-2xl font-black text-gray-600 dark:text-gray-400">R$ {basePrice.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-gray-900 dark:text-white italic">
                      R$ {planPrice.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matrícula</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm uppercase">{formattedRegistration}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fim do Contrato</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm uppercase">{formattedContractEnd}</p>
                  </div>
                </div>
              </div>
            </div>

            {currentUserData?.hasPromotion && currentUserData?.promoNote && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20 flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <span className="font-black uppercase text-[10px] tracking-wider block mb-0.5">Nota da Promoção</span>
                  {currentUserData.promoNote}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Recibos
              </h3>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[600px]">
              {histArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-2" />
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sem histórico</p>
                </div>
              ) : (
                histArray.map((p: any, idx: number) => {
                  const dateObj = parseDateString(p.timestamp || p.date);
                  return (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="group p-4 bg-white dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900/30 hover:shadow-md transition-all cursor-default"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{dateObj.toLocaleDateString('pt-BR')}</p>
                          <p className="font-black text-gray-900 dark:text-white text-sm uppercase italic">{dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                        </div>
                        <p className="font-black text-green-500 text-base">
                          R${Number(p.amount).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <span className="flex items-center gap-1 text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">
                          <CheckCircle className="w-3 h-3" /> Confirmado
                        </span>
                        <button 
                          onClick={() => handlePrintReceipt(p)}
                          className="flex items-center gap-1 p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">PDF</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })
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
