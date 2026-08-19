import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Gift, 
  Tag, 
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
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          id="referral-modal-container"
          className="relative bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 my-8"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 sm:p-7 text-white overflow-hidden">
            {/* Background Decorative Pattern */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-32 h-32 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

            <button 
              id="referral-modal-close-btn"
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all duration-150 backdrop-blur-sm"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner">
                <Gift className="w-6 h-6 text-yellow-300" />
              </div>
              <span className="bg-yellow-400/90 text-gray-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                Programa de Indicação
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight uppercase italic leading-tight">
              Indique um Amigo & Ganhe Desconto!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-1 leading-relaxed">
              Compartilhe seu código com amigos. Eles ganham desconto na matrícula e você ganha desconto na mensalidade!
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Coupon Code Highlight Card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-green-500/10 border-2 border-dashed border-emerald-500/40 rounded-2xl p-5 relative overflow-hidden text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                <Tag size={14} className="text-emerald-600 dark:text-emerald-400" />
                Seu Cupom Exclusivo de Indicação
              </div>

              <div className="flex items-center justify-center gap-3 my-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-wider bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-emerald-200 dark:border-emerald-800/60 select-all">
                  {referralCode}
                </span>
                <button
                  id="referral-copy-code-btn"
                  onClick={handleCopyCode}
                  className={`p-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white'
                  }`}
                  title="Copiar código do cupom"
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Qualquer amigo que usar este cupom garante desconto imediato na matrícula.
              </p>
            </div>

            {/* Direct Auto-Fill Registration Link */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Link de Matrícula com Cupom Automático
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-300 font-mono truncate select-all">
                  {registrationUrl}
                </div>
                <button
                  id="referral-copy-link-btn"
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: WhatsApp & Native Share */}
            <div className="space-y-3 pt-1">
              <a
                id="referral-whatsapp-share-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-green-500/25 flex items-center justify-center gap-3 transition-all duration-150 transform active:scale-[0.98] border border-green-400/30 text-center cursor-pointer"
              >
                <MessageCircle size={22} className="fill-white/20" />
                <span>Enviar Convite no WhatsApp</span>
              </a>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="referral-native-share-btn"
                  onClick={handleNativeShare}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  <span>Mais Opções de Compartilhamento</span>
                </button>
              )}
            </div>

            {/* Message Preview Box */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/60 space-y-2">
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
              <div className="text-xs text-gray-700 dark:text-gray-300 font-sans whitespace-pre-wrap bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 leading-relaxed shadow-inner max-h-36 overflow-y-auto">
                {messageText}
              </div>
            </div>

            {/* How it works 3-step grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center space-y-1">
                <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs mx-auto">1</div>
                <div className="text-[11px] font-bold dark:text-white">Envie o Link</div>
                <p className="text-[10px] text-gray-400 leading-tight">Mande seu cupom via WhatsApp para amigos e familiares.</p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center space-y-1">
                <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs mx-auto">2</div>
                <div className="text-[11px] font-bold dark:text-white">Amigo se Matricula</div>
                <p className="text-[10px] text-gray-400 leading-tight">Ele preenche a matrícula com desconto especial.</p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center space-y-1">
                <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center font-black text-xs mx-auto">3</div>
                <div className="text-[11px] font-bold dark:text-white">Você Ganha Desconto</div>
                <p className="text-[10px] text-gray-400 leading-tight">Desconto creditado na sua mensalidade no dojô!</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
