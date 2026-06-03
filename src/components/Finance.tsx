import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, Receipt, Award, Printer, Shield, CreditCard, ExternalLink, Loader2, Zap, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReceiptModal from './ReceiptModal';
import { collection, getDocs, updateDoc, doc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { createMPCheckout } from '../services/mercadoPagoService';

export function normalizePlanName(name: string): string {
  if (!name) return "";
  const clean = name.trim().toUpperCase();

  // "ADMINISTRAÇÃO (ISENTO)" (4 Alunos)
  if (clean === "ADMINISTRAÇÃO (ISENTO)" || clean === "ADMINISTRACAO (ISENTO)" || clean === "ADMINISTRAÇÃO" || clean === "ADMINISTRACAO" || clean === "ADMINISTRAÇÃO (ISENTA)" || clean === "ADMINISTRACAO (ISENTA)") {
    return "ADMINISTRAÇÃO (ISENTO)";
  }

  // "ADULTO SEMESTRAL" (12 Alunos)
  if (clean === "ADULTO SEMESTRAL" || clean === "ADULTO-SEMESTRAL" || clean === "PLANO ADULTO SEMESTRAL") {
    return "ADULTO SEMESTRAL";
  }

  // "ADULTO SEMESTRAL 110" (3 Alunos)
  if (clean === "ADULTO SEMESTRAL 110" || clean === "ADULTO SEMESTRAL R$ 110" || clean === "ADULTO SEMESTRAL - R$ 110" || clean === "ADULTO SEMESTRAL - 110" || clean === "ADULTO SEMESTRAL R$110" || clean.endsWith("SEMESTRAL 110") || clean.endsWith("SEMESTRAL R$ 110") || clean.includes("ADULTO SEMESTRAL 110") || clean === "ADULTO SEMESTRAL 110") {
    return "ADULTO SEMESTRAL 110";
  }

  // "ADULTO SEMESTRAL 115" (2 Alunos)
  if (clean === "ADULTO SEMESTRAL 115" || clean === "ADULTO SEMESTRAL R$ 115" || clean === "ADULTO SEMESTRAL - R$ 115" || clean === "ADULTO SEMESTRAL - 115" || clean === "ADULTO SEMESTRAL R$115" || clean.endsWith("SEMESTRAL 115") || clean.endsWith("SEMESTRAL R$ 115") || clean.includes("ADULTO SEMESTRAL 115") || clean === "ADULTO SEMESTRAL 115") {
    return "ADULTO SEMESTRAL 115";
  }

  // "ALUNO BLUE/ADULTO - SEMESTRAL" (9 Alunos)
  if (clean === "ALUNO BLUE/ADULTO - SEMESTRAL" || clean.includes("ALUNO BLUE") || clean.includes("BLUE/ADULTO")) {
    if (clean.includes("DEPENDENTE")) return "INFANTIL DEPENDENTE BLUEFIT";
    return "ALUNO BLUE/ADULTO - SEMESTRAL";
  }

  // "COMBO DUPLA SEMESTRAL" (3 Alunos)
  if (clean === "COMBO DUPLA" || clean === "COMBO DUPLA SEMESTRAL" || clean === "COMBO DUPLA - SEMESTRAL" || clean === "COMBO DUPLA COLETIVO") {
    return "COMBO DUPLA SEMESTRAL";
  }

  // "DEPENDENTE - COMBO FAMÍLIA" (1 Aluno)
  if (clean === "DEPENDENTE" || clean === "DEPENDENTE - COMBO FAMÍLIA" || clean === "DEPENDENTE-COMBO FAMILIA" || clean === "DEPENDENTE - COMBO FAMILIA" || clean.includes("DEPENDENTE - COMBO FAMÍLIA") || clean.includes("DEPENDENTE - COMBO FAMILIA")) {
    return "DEPENDENTE - COMBO FAMÍLIA";
  }

  // "DESCONTO FAMÍLIA - INFANTIL (50%)" (1 Aluno)
  if (clean.includes("DESCONTO FAMÍLIA") || clean.includes("DESCONTO FAMILIA") || clean.includes("FAMÍLIA - INFANTIL") || clean.includes("FAMILIA - INFANTIL") || clean.includes("FAMILIA (50%)") || clean.includes("FAMÍLIA (50%)") || clean.includes("DESCONTO FAMILIA - INFANTIL (50%)")) {
    return "DESCONTO FAMÍLIA - INFANTIL (50%)";
  }

  // "INFANTIL DEPENDENTE BLUEFIT" (1 Aluno)
  if (clean.includes("INFANTIL DEPENDENTE") || clean.includes("DEPENDENTE BLUEFIT") || clean.includes("DEPENDENTE-BLUEFIT") || clean.includes("DEPENDENTE BLUE FIT") || clean.includes("DEPENDENTE-BLUE FIT")) {
    return "INFANTIL DEPENDENTE BLUEFIT";
  }

  // "INFANTIL SEMESTRAL" (8 Alunos)
  if (clean === "INFANTIL SEMESTRAL" || clean === "INFANTIL-SEMESTRAL" || clean === "PLANO INFANTIL SEMESTRAL") {
    return "INFANTIL SEMESTRAL";
  }

  // "INFANTIL TRIMESTRAL" (2 Alunos)
  if (clean === "INFANTIL TRIMESTRAL" || clean === "INFANTIL-TRIMESTRAL") {
    return "INFANTIL TRIMESTRAL";
  }

  // "ISENTO / BOLSISTA" (1 Aluno)
  if (clean === "ISENTO" || clean === "ISENTO / BOLSISTA" || clean === "ISENTO/BOLSISTA" || clean.includes("ISENTO") || clean.includes("BOLSISTA")) {
    if (clean.includes("ADMINISTRAÇÃO") || clean.includes("ADMINISTRACAO")) return "ADMINISTRAÇÃO (ISENTO)";
    return "ISENTO / BOLSISTA";
  }

  // "PROMOÇÃO KIDS NO PIX - R$ 140,00" (2 Alunos)
  if (clean.includes("KIDS NO PIX") || clean.includes("KIDS NO PIX - R$ 140") || clean.includes("PROMOÇÃO - INFANTIL NO PIX") || clean.includes("PROMOCAO - INFANTIL NO PIX") || clean.includes("PROMOÇÃO KIDS NO PIX") || clean.includes("PROMOÇÃO KIDS") || clean.includes("PROMOCAO KIDS") || clean.includes("PROMOÇÃO KIDS NO PIX - R$ 140,00") || clean.includes("PROMOCAO KIDS NO PIX") || clean.includes("PROMOÇÃO KIDS NO PIX")) {
    return "PROMOÇÃO KIDS NO PIX - R$ 140,00";
  }

  // Fallbacks or legacy names:
  if (clean === "INFANTIL MENSAL") return "INFANTIL MENSAL";
  if (clean === "ADULTO MENSAL") return "ADULTO MENSAL";
  if (clean === "ADULTO TRIMESTRAL") return "ADULTO TRIMESTRAL";
  if (clean === "COMBO CASAL SEMESTRAL") return "COMBO CASAL SEMESTRAL";
  if (clean === "COMBO FAMÍLIA SEMESTRAL" || clean === "COMBO FAMILIA SEMESTRAL") return "COMBO FAMÍLIA SEMESTRAL";
  if (clean === "OUTROS") return "OUTROS";

  return clean;
}

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
  const [maintenanceActive, setMaintenanceActive] = useState<boolean>(true);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true);

  useEffect(() => {
    const settingsRef = doc(db, 'artifacts', 'tanqueteam-bjj', 'public', 'data', 'settings', 'finance');
    const unsub = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setMaintenanceActive(docSnap.data().maintenanceActive !== false);
      } else {
        setMaintenanceActive(true); // Default to true
      }
      setSettingsLoading(false);
    }, (err) => {
      console.error("Error listening to finance settings:", err);
      setSettingsLoading(false);
    });
    return () => unsub();
  }, []);

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
      // RECURRING PAYMENT (Always use the initial price link)
      if (recurring) {
        if (matchedPlan?.mercadopagoLink) {
          window.location.href = matchedPlan.mercadopagoLink;
          return;
        } else {
          throw new Error("Link de recorrência não configurado para este plano.");
        }
      }

      // ONE-TIME PAYMENT (Avulso)
      // If late and has a specific late link, use it
      if (isLate && matchedPlan?.mercadopagoLateLink) {
        window.location.href = matchedPlan.mercadopagoLateLink;
        return;
      }

      // Otherwise, use dynamic checkout (handles both on-time and late prices)
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
    normalizePlanName(p.name) === normalizePlanName(planName) ||
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
  let isLate = dynamicPaymentStatus === 'Pendente';

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
        } else if (dynamicPaymentStatus === 'Pendente') {
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

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  // Maintenance block requested by user
  if (maintenanceActive) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)] text-center relative overflow-hidden"
        >
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-red/5 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none"></div>
  
          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-brand-red/20 blur-2xl rounded-full w-24 h-24 -translate-y-2 animate-pulse"></div>
              <div className="relative bg-brand-red/10 dark:bg-brand-red/5 border-2 border-brand-red p-5 rounded-[2rem] shadow-inner">
                <Clock className="w-12 h-12 text-brand-red" />
              </div>
            </div>
  
            <h3 className="text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tighter text-gray-900 dark:text-white mb-4">
              Módulo Financeiro <span className="text-brand-red">em Manutenção</span>
            </h3>
            
            <div className="w-16 h-1 bg-gradient-to-r from-brand-red to-amber-500 rounded-full mb-6"></div>
  
            <p className="text-gray-600 dark:text-gray-300 text-base font-medium leading-relaxed mb-8">
              Estamos atualizando os nossos sistemas de pagamento, faturamento e histórico financeiro para trazer melhorias significativas de desempenho, novas opções de parcelamento e maior estabilidade na integração com o Mercado Pago.
            </p>
  
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-5 rounded-2xl flex items-start gap-4 text-left">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">
                  Informação Importante
                </p>
                <p className="text-xs text-amber-700/90 dark:text-amber-400/80 leading-relaxed font-semibold">
                  Esta atualização não afeta os seus planos vigentes nem o seu direito de acesso às aulas e treinos no tatame. Se sua mensalidade vence hoje ou se precisa renovar seu plano imediatamente, procure diretamente o professor ou a recepção para suporte.
                </p>
              </div>
            </div>
  
            <p className="mt-8 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" /> Tanque Team BJJ — Comprometidos com sua evolução
            </p>
          </div>
        </motion.div>

        {/* WhatsApp Contact Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex gap-3 items-start text-left">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-350 uppercase tracking-tight">Precisa de Suporte Financeiro?</h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                Fale diretamente conosco pelo WhatsApp no número <b>(91) 98453-3817</b> para esclarecer dúvidas sobre cobranças, mensalidades ou envio de comprovantes.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const message = encodeURIComponent("Olá! Sou aluno do Tanque Team e gostaria de falar sobre meu plano/financeiro.");
              window.open("https://wa.me/5591984533817?text=" + message, "_blank");
            }}
            className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white font-bold text-xs rounded-xl uppercase tracking-wider transition shadow flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 fill-white" />
            Chamar WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plan Details & Contract */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Payment Card (Updated) */}
          {!isFreePlan && dynamicPaymentStatus !== 'Isento' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-900 via-brand-dark to-black p-5 sm:p-8 rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 hidden sm:block">
                <CreditCard className="w-48 h-48 text-white" />
              </div>

              <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-red/20 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center sm:items-start gap-4 mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-brand-red rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
                      Pagamento Online
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm font-medium">Transação 100% segura via Mercado Pago</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-white/10 shrink-0">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 mb-6 sm:mb-8">
                  {isLate && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 shadow-lg shadow-amber-500/10"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                        <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-white animate-pulse" />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-wider mb-1">Dica de mestre!</p>
                        <p className="text-xs sm:text-sm text-white/90 font-bold leading-tight">
                          Ative a <span className="text-amber-400 underline decoration-amber-400/50 underline-offset-4">Recorrência Automática</span> e pague o <span className="text-emerald-400 font-extrabold">VALOR COM DESCONTO</span> mesmo estando em atraso!
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-amber-500/70 font-bold mt-1.5 uppercase tracking-tighter">Economize agora: R$ {(basePrice - initialPrice).toFixed(2).replace('.', ',')} de desconto imediato.</p>
                      </div>
                    </motion.div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
                    <div className="flex flex-col">
                      <span className={`text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase italic w-fit mb-1 shadow-sm ${isLate ? 'bg-amber-500 text-white' : 'bg-brand-red text-white'}`}>
                        {isLate ? 'Vencimento Excedido' : 'Valor em Dia'}
                      </span>
                      <span className="text-gray-400 text-[10px] uppercase font-bold italic tracking-wider">
                        {isLate ? (
                          <>Original: <span className="line-through">R$ {initialPrice.toFixed(2).replace('.', ',')}</span></>
                        ) : (
                          <>Valor de Tabela: <span className="line-through">R$ {basePrice.toFixed(2).replace('.', ',')}</span></>
                        )}
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className={`font-black text-2xl sm:text-3xl italic leading-none block ${isLate ? 'text-amber-500' : 'text-brand-red'}`}>
                        R$ {planPrice.toFixed(2).replace('.', ',')}
                      </span>
                      {isLate && (
                        <span className="text-[9px] text-amber-500/70 font-bold uppercase tracking-tighter">Valor Integral c/ Atraso</span>
                      )}
                    </div>
                  </div>
                  <h4 className="text-white font-black text-xl sm:text-2xl uppercase italic tracking-tight">{planName}</h4>
                </div>
                
                <div className="flex flex-col gap-3.5 sm:gap-4">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={isPaying || !matchedPlan?.mercadopagoLink}
                    onClick={() => handlePayment(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black uppercase italic tracking-tighter text-sm sm:text-lg flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20"
                    title={!matchedPlan?.mercadopagoLink ? "Plano de assinatura não configurado pelo administrador." : ""}
                  >
                    <div className="flex flex-col items-center leading-normal sm:leading-tight text-center">
                      <span className="text-[9px] sm:text-[10px] opacity-90 font-bold tracking-widest flex items-center justify-center gap-1.5 flex-wrap">
                        {isLate && <span className="line-through opacity-65">R$ {basePrice.toFixed(2).replace('.', ',')}</span>}
                        <span>PAGUE COM DESCONTO AUTOMÁTICO</span>
                      </span>
                      <span className="flex items-center justify-center gap-1.5 text-sm sm:text-xl font-black mt-0.5">
                        {isPaying ? <Loader2 className="w-4.5 h-4.5 sm:w-6 sm:h-6 animate-spin" /> : <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />}
                        Ativar Recorrência - R$ {initialPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.15)" }}
                    whileTap={{ scale: 0.99 }}
                    disabled={isPaying}
                    onClick={() => handlePayment(false)}
                    className="w-full bg-white/10 border border-white/20 text-white px-4 sm:px-8 py-3 w-full sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase italic tracking-tighter text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4 opacity-70" />}
                    Pagamento Avulso - R$ {planPrice.toFixed(2).replace('.', ',')}
                  </motion.button>
                </div>

                {!matchedPlan?.mercadopagoLink && (
                  <div className="mt-5 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-400 font-bold uppercase italic leading-tight">
                      Link de ativação não configurado. Por favor, fale com o suporte.
                    </p>
                  </div>
                )}
                
                <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-400 font-black uppercase italic mb-1 tracking-wider">Checkout Seguro</p>
                      <p className="text-[10px] text-emerald-400/70 font-medium leading-relaxed italic">
                        Pagamento via PIX/Cartão processado via Mercado Pago com baixa automática no sistema!
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 font-black uppercase italic mb-1 tracking-wider">Menor Valor Garantido</p>
                      <p className="text-[10px] text-blue-400/70 font-medium leading-relaxed italic">
                        A recorrência no cartão garante sempre o valor pontual com desconto, sem risco de atrasos.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-500 font-black uppercase italic mb-1 tracking-wider">Foco no Treino</p>
                      <p className="text-[10px] text-amber-500/70 font-medium leading-relaxed italic">
                        Não se preocupe mais com datas de vencimento. Cadastre uma vez e mantenha seu foco no tatame!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <motion.div 
              whileHover={{ y: -3 }}
              className="bg-white dark:bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl flex items-center justify-between group"
            >
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1 sm:mb-2">Status da Matrícula</p>
                <div className="flex items-center gap-3">
                  {dynamicPaymentStatus === 'Pendente' ? (
                    <div className="bg-red-500 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black uppercase italic tracking-tighter flex items-center gap-1.5 shadow-lg shadow-red-500/20">
                       <AlertTriangle size={12} /> Pendente
                    </div>
                  ) : dynamicPaymentStatus === 'Isento' ? (
                    <div className="bg-gray-500 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black uppercase italic tracking-tighter flex items-center gap-1.5 shadow-lg shadow-gray-500/20">
                       <Award size={12} /> Isento
                    </div>
                  ) : (
                    <div className="bg-emerald-500 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black uppercase italic tracking-tighter flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                       <CheckCircle size={12} /> Regularizado
                    </div>
                  )}
                </div>
              </div>
              <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gray-50 dark:bg-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors duration-300 shrink-0">
                <Shield className="w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -3 }}
              className="bg-white dark:bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl flex items-center justify-between group"
            >
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1 sm:mb-2">Próximo Vencimento</p>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight leading-none">
                    {formattedDueDate}
                  </span>
                  {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7 && dynamicPaymentStatus !== 'Pendente' && (
                    <p className="text-[9px] sm:text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">Vence em {daysUntilDue} dias!</p>
                  )}
                </div>
              </div>
              <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gray-50 dark:bg-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 shrink-0">
                <Calendar className="w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
              </div>
            </motion.div>
          </div>

          {/* Plan Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
              <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2 shrink-0 text-sm sm:text-base">
                <FileText className="w-4 h-4" /> Detalhes do Contrato
              </h3>
              <span className="bg-brand-red/10 text-brand-red text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase italic truncate max-w-[120px] sm:max-w-[250px]" title={planName}>{planName}</span>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Resumo Financeiro</p>
                  {isFreePlan ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <p className="text-xl sm:text-2xl font-black text-gray-500 italic uppercase">Isento de Mensalidade</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border transition-all ${!isLate ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 shadow-lg shadow-emerald-500/5 sm:scale-105' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-40 grayscale'}`}>
                          <p className={`text-[10px] font-bold uppercase mb-1 ${!isLate ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>Valor Pontual (Até Venc.)</p>
                          <p className={`text-xl sm:text-2xl font-black ${!isLate ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 font-bold'}`}>R$ {initialPrice.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className={`p-4 rounded-xl border transition-all ${isLate ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 shadow-lg shadow-amber-500/5 sm:scale-105' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-40 grayscale'}`}>
                          <p className={`text-[10px] font-bold uppercase mb-1 ${isLate ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>Valor Integral (Após Venc.)</p>
                          <p className={`text-xl sm:text-2xl font-black ${isLate ? 'text-amber-700 dark:text-amber-400' : 'text-gray-400 font-bold'}`}>R$ {basePrice.toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-900 dark:bg-black p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner gap-4">
                        <div className="relative z-10">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Custo do Pagamento Avulso</p>
                          <h5 className="text-white font-black text-2xl sm:text-3xl italic tracking-tighter uppercase leading-none">
                            R$ {planPrice.toFixed(2).replace('.', ',')}
                          </h5>
                          <p className="text-[9px] text-gray-500 font-bold mt-1.5 max-w-[200px]">Recorrência automática via cartão mantém sempre o menor valor.</p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
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

          {/* WhatsApp Contact Card */}
          <div className="mt-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex gap-3 items-start">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-350 uppercase tracking-tight">Precisa de Suporte Financeiro?</h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                  Fale diretamente conosco pelo WhatsApp no número <b>(91) 98453-3817</b> para esclarecer dúvidas sobre cobranças, mensalidades ou envio de comprovantes.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const message = encodeURIComponent("Olá! Sou aluno do Tanque Team e gostaria de falar sobre meu plano/financeiro.");
                window.open("https://wa.me/5591984533817?text=" + message, "_blank");
              }}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white font-bold text-xs rounded-xl uppercase tracking-wider transition shadow flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white" />
              Chamar WhatsApp
            </button>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2 text-sm sm:text-base">
                <Receipt className="w-4 h-4" /> Recibos
              </h3>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[400px] lg:max-h-[600px]">
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
                      whileHover={{ scale: 1.01 }}
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
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all scale-100"
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
