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
          
          {/* Payment Card (New) */}
          {!isFreePlan && dynamicPaymentStatus !== 'Isento' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-24 h-24 text-white" />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-6 bg-brand-red rounded-full"></span>
                  Pagamento Automático
                </h3>
                
                <div className="mb-4">
                  <span className="bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded uppercase italic mr-2">Plano Atual</span>
                  <span className="text-white font-bold text-sm uppercase italic">{planName}</span>
                </div>
                
                <p className="text-gray-400 text-sm mb-6 max-w-md">
                  Realize o pagamento da sua mensalidade de forma segura via Mercado Pago. Você pode optar por um pagamento avulso ou ativar a recorrência automática.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <button
                    disabled={isPaying}
                    onClick={() => handlePayment(false)}
                    className="flex-1 min-w-[200px] bg-white text-zinc-950 px-6 py-4 rounded-xl font-black uppercase italic tracking-tighter text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  >
                    {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                    Pagar Avulso (R$ {planPrice.toFixed(2).replace('.', ',')})
                  </button>
                  
                  <button
                    disabled={isPaying || !matchedPlan?.mercadopagoLink}
                    onClick={() => handlePayment(true)}
                    className="flex-1 min-w-[200px] border-2 border-brand-red text-brand-red px-6 py-4 rounded-xl font-black uppercase italic tracking-tighter text-sm flex items-center justify-center gap-2 hover:bg-brand-red hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!matchedPlan?.mercadopagoLink ? "Plano de assinatura não configurado pelo administrador." : ""}
                  >
                    {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
                    Ativar Recorrência
                  </button>
                  {!matchedPlan?.mercadopagoLink && (
                    <p className="w-full text-center text-[10px] text-red-500 font-bold uppercase italic mt-2 animate-pulse">
                      Atenção: A recorrência automática ainda não foi configurada para este plano. Por favor, pague o avulso ou fale com o professor.
                    </p>
                  )}
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">
                  <Shield className="w-3 h-3" /> Transação Criptografada & Segura
                </div>
              </div>
            </motion.div>
          )}

          {/* PIX Payment Option (New) */}
          {!isFreePlan && dynamicPaymentStatus !== 'Isento' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 mt-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-xl italic shadow-lg">
                  PIX
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic leading-none">Pagamento via PIX</h3>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">Liberação Manual via WhatsApp</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Chave CNPJ:</p>
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-900 dark:text-white font-black text-lg select-all">65.678.191/0001-90</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText("65678191000190");
                          showAlert("Copiado!", "Chave PIX copiada para a área de transferência.", "success");
                        }}
                        className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg font-black uppercase hover:bg-emerald-100 transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Valor do seu Plano:</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 italic">R$ {planPrice.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 font-black text-xs">1</div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Efetue a transferência PIX no valor de <span className="font-bold text-zinc-900 dark:text-white">R$ {planPrice.toFixed(2).replace('.', ',')}</span>.
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 font-black text-xs">2</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      <p className="font-bold text-zinc-900 dark:text-white mb-1 uppercase text-[10px]">Obrigatório:</p>
                      Envie o comprovante para o nosso WhatsApp para validarmos seu acesso:
                      <button 
                        onClick={() => window.open('https://wa.me/5591984533817', '_blank')}
                        className="mt-2 w-full bg-emerald-500 text-white font-black uppercase italic py-2 rounded-lg text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Enviar Comprovante (91 98453-3817)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
              <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4" /> Detalhes do Contrato
              </h3>
              <span className="bg-brand-red/10 text-brand-red text-[10px] font-black px-3 py-1 rounded-full uppercase italic truncate max-w-[150px] sm:max-w-[250px]" title={planName}>{planName}</span>
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
