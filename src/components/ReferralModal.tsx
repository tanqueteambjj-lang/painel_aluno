import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Gift, 
  Tag, 
  Sparkles,
  MessageCircle 
} from 'lucide-react';
import { generateReferralWhatsAppMessage } from '../utils/referral';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  showAlert?: (title: string, message: string, type: 'success' | 'error' | 'alert' | 'info') => void;
}

export default function ReferralModal({ isOpen, onClose, student, showAlert }: ReferralModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen) return null;

  const referralData = generateReferralWhatsAppMessage(student);
  const referralCode = referralData.referralCode;
  const registrationUrl = referralData.registrationUrl;
  const whatsappUrl = referralData.url;
  const messageText = referralData.text;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
      if (showAlert) showAlert("Cupom Copiado!", `Código ${referralCode} copiado para a área de transferência.`, "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      if (showAlert) showAlert("Link Copiado!", "Link de matrícula com desconto copiado!", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
      if (showAlert) showAlert("Mensagem Copiada!", "Texto de convite do WhatsApp copiado!", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Convite Tanque Team BJJ - Desconto Exclusivo',
          text: messageText,
          url: registrationUrl
        });
      } catch (err) {
        console.debug('Share canceled or not supported', err);
      }
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="referral-modal-backdrop" 
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          id="referral-modal-container"
          className="relative bg-white dark:bg-gray-900 rounded-3xl sm:rounded-[2rem] w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200/80 dark:border-gray-800 my-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Banner (Shrink-0) */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-4 sm:p-6 text-white overflow-hidden shrink-0">
            {/* Background Decorative Pattern */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-28 h-28 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

            <button 
              id="referral-modal-close-btn"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all duration-150 backdrop-blur-sm z-10"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-1.5 sm:mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/30 shadow-inner">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
              </div>
              <span className="bg-yellow-400 text-gray-900 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm">
                Programa de Indicação
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-tight uppercase italic leading-tight pr-8">
              Indique Amigos & Ganhe Desconto!
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm text-emerald-100 font-medium mt-1 leading-relaxed max-w-md">
              A cada amigo que se matricular com seu código, você garante desconto na sua mensalidade!
            </p>
          </div>

          {/* Scrollable Body (Flex-1) */}
          <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain">
            {/* Coupon Code Highlight Card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-green-500/10 border-2 border-dashed border-emerald-500/40 rounded-2xl p-3.5 sm:p-5 relative overflow-hidden text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                <Tag size={13} className="text-emerald-600 dark:text-emerald-400" />
                Seu Código de Indicação
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 my-1.5">
                <span className="font-mono text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-wider bg-white dark:bg-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm border border-emerald-200 dark:border-emerald-800/60 select-all">
                  {referralCode}
                </span>
                <button
                  id="referral-copy-code-btn"
                  onClick={handleCopyCode}
                  className={`px-3.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0 ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white'
                  }`}
                  title="Copiar código de indicação"
                >
                  {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                O desconto é creditado na sua mensalidade a cada novo amigo matriculado!
              </p>
            </div>

            {/* Direct Auto-Fill Registration Link */}
            <div className="space-y-1.5">
              <label className="block text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Link de Matrícula com Cupom Automático
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 sm:py-2.5 text-xs text-gray-700 dark:text-gray-300 font-mono truncate select-all">
                  {registrationUrl}
                </div>
                <button
                  id="referral-copy-link-btn"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Primary Action Button: WhatsApp */}
            <div className="space-y-2 pt-1">
              <a
                id="referral-whatsapp-share-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-green-500/25 flex items-center justify-center gap-2.5 transition-all duration-150 transform active:scale-[0.98] border border-green-400/30 text-center cursor-pointer"
              >
                <MessageCircle size={20} className="fill-white/20 shrink-0" />
                <span>Enviar Convite no WhatsApp</span>
              </a>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="referral-native-share-btn"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border border-gray-200/80 dark:border-gray-700"
                >
                  <Share2 size={15} />
                  <span>Outros Aplicativos de Compartilhamento</span>
                </button>
              )}
            </div>

            {/* Message Preview Box */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3.5 sm:p-4 border border-gray-100 dark:border-gray-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <MessageCircle size={12} /> Pré-visualização da Mensagem
                </span>
                <button
                  id="referral-copy-msg-btn"
                  onClick={handleCopyMessage}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {copiedMessage ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedMessage ? 'Mensagem copiada!' : 'Copiar texto'}</span>
                </button>
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300 font-sans whitespace-pre-wrap bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-150 dark:border-gray-800 leading-relaxed shadow-inner max-h-28 sm:max-h-32 overflow-y-auto">
                {messageText}
              </div>
            </div>

            {/* Rule Callout: 1 indicação válida por mensalidade */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
              <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Sparkles size={15} />
              </div>
              <div className="space-y-0.5">
                <div className="font-black uppercase tracking-wider text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300">
                  Regra de Desconto por Mensalidade
                </div>
                <p className="leading-relaxed text-[11px] text-amber-900/90 dark:text-amber-200/90">
                  <strong>Apenas 1 indicação é válida por mensalidade.</strong> Se você indicar <strong>3 amigos</strong> matriculados, você ganha desconto nos <strong>próximos 3 meses</strong> consecutivos (1 desconto por mês)!
                </p>
              </div>
            </div>

            {/* How it works 3-step grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center space-y-1">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs mx-auto">1</div>
                <div className="text-[11px] font-bold dark:text-white">Envie o Convite</div>
                <p className="text-[10px] text-gray-400 leading-tight">Compartilhe o código ou link com seus amigos.</p>
              </div>

              <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center space-y-1">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs mx-auto">2</div>
                <div className="text-[11px] font-bold dark:text-white">Amigo se Matricula</div>
                <p className="text-[10px] text-gray-400 leading-tight">Seu amigo faz a matrícula informando o seu código.</p>
              </div>

              <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center space-y-1">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs mx-auto">3</div>
                <div className="text-[11px] font-bold dark:text-white">1 Desconto / Mês</div>
                <p className="text-[10px] text-gray-400 leading-tight">Desconto automático nas suas próximas mensalidades.</p>
              </div>
            </div>
          </div>

          {/* Modal Footer (Shrink-0) */}
          <div className="p-3.5 sm:p-4 bg-gray-50/90 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
              <Gift size={13} className="text-emerald-500 shrink-0" />
              Desconto na próxima mensalidade
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition shrink-0"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
