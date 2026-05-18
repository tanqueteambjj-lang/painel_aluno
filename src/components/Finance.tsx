import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, Receipt, Award, Printer, Shield, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReceiptModal from './ReceiptModal';
import { collection, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { createMPCheckout } from '../services/mercadoPagoService';

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

export default function Finance({ currentUserData, planInfo, showAlert }: any) {
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    // Process successful payment redirect from Mercado Pago
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const collectionStatus = urlParams.get('collection_status');
    const isSuccess = status === 'approved' || collectionStatus === 'approved';
    
    if (isSuccess && currentUserData?.id) {
       showAlert("Pagamento Recebido!", "Seu pagamento via Mercado Pago foi processado com sucesso. Em breve seu acesso será validado.", "success");
       // Clear params from URL
       window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'pending' || status === 'in_process') {
       showAlert("Pagamento em Processamento", "Seu pagamento está sendo analisado pelo Mercado Pago. Assim que aprovado, seu status será atualizado.", "info");
       window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'rejected') {
       showAlert("Pagamento Recusado", "O Mercado Pago não pôde processar seu pagamento. Por favor, tente novamente ou use outro cartão.", "error");
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUserData, showAlert]);

  const handlePayment = async (recurring: boolean = false) => {
    if (!currentUserData?.id) {
      showAlert("Erro", "Desenvolvedor: ID do aluno não encontrado.", "error");
      return;
    }

    setIsPaying(true);
    try {
      if (recurring) {
        if (matchedPlan?.mercadopagoLink) {
          window.location.href = matchedPlan.mercadopagoLink;
          return;
        } else {
          throw new Error("Link de recorrência não configurado para este plano.");
        }
      }

      if (!currentUserData.email) {
        console.warn("Aluno sem e-mail cadastrado. Usando e-mail da academia para o Mercado Pago.");
      }

      await createMPCheckout({
        title: `Pagamento Avulso - ${planName} - Tanque Team BJJ`,
        price: planPrice,
        studentId: currentUserData.id,
        studentEmail: currentUserData.email || 'administrativo@tanqueteambjj.com.br',
        action: 'payment'
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      showAlert("Erro no Pagamento", error.message || "Não foi possível iniciar o pagamento.", "error");
    } finally {
      setIsPaying(false);
    }
  };

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
  
  const initialPrice = matchedPlan?.price !== undefined ? matchedPlan.price : (planInfo?.price !== undefined ? planInfo.price : (parsedPrice !== undefined ? parsedPrice : (currentUserData?.planPrice || 150.00)));
  const basePrice = matchedPlan?.basePrice !== undefined ? matchedPlan.basePrice : initialPrice;
  
  const isFreePlan = initialPrice === 0 || currentUserData?.paymentStatus === 'Isento' || currentUserData?.plan?.toLowerCase() === 'isento' || currentUserData?.plan?.toLowerCase() === 'dependente';
  const isInvalidPlan = false;

  let formattedDueDate = "Não definido";
  const dueDateValue = currentUserData?.dueDate || currentUserData?.nextDueDate;
  
  let dynamicPaymentStatus = currentUserData?.paymentStatus || 'Em dia';
  let daysUntilDue: number | null = null;
  let isLate = false;

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
          isLate = true;
        } else {
          dynamicPaymentStatus = 'Em dia';
        }
      }
    }
  }

  // Auto-adjust price: if late, use integral price (basePrice)
  const planPrice = isLate ? basePrice : initialPrice;

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
          
          {/* Payment Card (Updated) */}
          {!isFreePlan && dynamicPaymentStatus !== 'Isento' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-900 via-brand-dark to-black p-8 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <CreditCard className="w-48 h-48 text-white" />
              </div>

              <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-red/20 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3 mb-2">
                      <div className="w-2 h-8 bg-brand-red rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
                      Pagamento Online
                    </h3>
                    <p className="text-gray-400 text-sm font-medium">Transação 100% segura via Mercado Pago</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic w-fit mb-1 ${isLate ? 'bg-amber-500/20 text-amber-500' : 'bg-brand-red text-white'}`}>
                        {isLate ? 'Vencimento Excedido' : 'Valor em Dia'}
                      </span>
                      {isLate && (
                        <span className="text-gray-400 text-[10px] uppercase font-bold italic line-through tracking-wider">
                          R$ {initialPrice.toFixed(2).replace('.', ',')} (Pontual)
                        </span>
                      )}
                    </div>
                    <span className={`font-black text-2xl italic leading-none ${isLate ? 'text-amber-500' : 'text-brand-red'}`}>
                      R$ {planPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <h4 className="text-white font-black text-2xl uppercase italic tracking-tight">{planName}</h4>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(239,68,68,0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isPaying || !matchedPlan?.mercadopagoLink}
                    onClick={() => handlePayment(true)}
                    className="flex-1 bg-gradient-to-r from-brand-red to-red-600 text-white px-8 py-5 rounded-2xl font-black uppercase italic tracking-tighter text-base flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative group/btn overflow-hidden"
                    title={!matchedPlan?.mercadopagoLink ? "Plano de assinatura não configurado pelo administrador." : ""}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 skew-x-[45deg]"></div>
                    {isPaying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Clock className="w-6 h-6" />}
                    Ativar Recorrência Automática
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.15)" }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isPaying}
                    onClick={() => handlePayment(false)}
                    className="bg-white/10 border border-white/20 text-white px-8 py-5 rounded-2xl font-black uppercase italic tracking-tighter text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5 opacity-70" />}
                    Pagamento Avulso (Único)
                  </motion.button>
                </div>

                {!matchedPlan?.mercadopagoLink && (
                  <div className="mt-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-400 font-bold uppercase italic leading-tight">
                      Link de ativação não configurado. Por favor, fale com o suporte.
                    </p>
                  </div>
                )}
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-emerald-400/80 font-bold uppercase italic leading-relaxed">
                      Pagamento via PIX agora processado via Mercado Pago com baixa automática no sistema!
                    </p>
                  </div>
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-[10px] text-blue-400/80 font-bold uppercase italic leading-relaxed">
                      Planos com desconto exigem recorrência no cartão para garantir a manutenção do contrato.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Status da Matrícula</p>
                <div className="flex items-center gap-3">
                  {dynamicPaymentStatus === 'Pendente' ? (
                    <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-black uppercase italic tracking-tighter flex items-center gap-1.5 shadow-lg shadow-red-500/20">
                       <AlertTriangle size={14} /> Pendente
                    </div>
                  ) : dynamicPaymentStatus === 'Isento' ? (
                    <div className="bg-gray-500 text-white px-4 py-1.5 rounded-full text-sm font-black uppercase italic tracking-tighter flex items-center gap-1.5 shadow-lg shadow-gray-500/20">
                       <Award size={14} /> Isento
                    </div>
                  ) : (
                    <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-sm font-black uppercase italic tracking-tighter flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                       <CheckCircle size={14} /> Regularizado
                    </div>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors duration-300">
                <Shield className="w-7 h-7 transition-transform group-hover:scale-110" />
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Próximo Vencimento</p>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight leading-none">
                    {formattedDueDate}
                  </span>
                  {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7 && dynamicPaymentStatus !== 'Pendente' && (
                    <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">Vence em {daysUntilDue} dias!</p>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <Calendar className="w-7 h-7 transition-transform group-hover:scale-110" />
              </div>
            </motion.div>
          </div>

          {/* Plan Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4" /> Detalhes do Contrato
              </h3>
              <span className="bg-brand-red/10 text-brand-red text-[10px] font-black px-3 py-1 rounded-full uppercase italic truncate max-w-[150px] sm:max-w-[250px]" title={planName}>{planName}</span>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Resumo Financeiro</p>
                  {isFreePlan ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <p className="text-2xl font-black text-gray-500 italic uppercase">Isento de Mensalidade</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border transition-all ${!isLate ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 shadow-lg shadow-emerald-500/5 scale-105' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-40 grayscale'}`}>
                          <p className={`text-[10px] font-bold uppercase mb-1 ${!isLate ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>Valor Pontual (Até Venc.)</p>
                          <p className={`text-2xl font-black ${!isLate ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 font-bold'}`}>R$ {initialPrice.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className={`p-4 rounded-xl border transition-all ${isLate ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 shadow-lg shadow-amber-500/5 scale-105' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-40 grayscale'}`}>
                          <p className={`text-[10px] font-bold uppercase mb-1 ${isLate ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>Valor Integral (Após Venc.)</p>
                          <p className={`text-2xl font-black ${isLate ? 'text-amber-700 dark:text-amber-400' : 'text-gray-400 font-bold'}`}>R$ {basePrice.toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>

                        <div className="flex justify-between items-center bg-gray-900 dark:bg-black p-5 rounded-2xl border border-white/5 shadow-inner">
                        <div className="relative z-10">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Custo do Pagamento Avulso</p>
                          <h5 className="text-white font-black text-3xl italic tracking-tighter uppercase leading-none">
                            R$ {planPrice.toFixed(2).replace('.', ',')}
                          </h5>
                          <p className="text-[9px] text-gray-500 font-bold mt-1 max-w-[200px]">Recorrência automática via cartão mantém sempre o menor valor.</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isLate ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 rounded-lg text-white text-[9px] font-black uppercase italic animate-pulse">
                              <AlertTriangle size={10} /> Valor Integral (Atraso)
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 rounded-lg text-white text-[9px] font-black uppercase italic shadow-lg shadow-emerald-500/20">
                              <CheckCircle size={10} /> Valor Pontual (Em Dia)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
                          <p className="font-black text-gray-900 dark:text-white text-sm uppercase italic leading-tight">{dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                          {p.plan && (
                            <p className="text-[9px] font-bold text-brand-red uppercase italic mt-0.5">{p.plan}</p>
                          )}
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
