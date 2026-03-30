import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User, Lock, Eye, EyeOff, LogIn, Download, Monitor, ArrowLeft, X, Smartphone, Share, PlusSquare, MoreVertical, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    // Initialize anonymous auth for Firestore access
    signInAnonymously(auth).catch(console.error);

    // PWA Logic
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const checkPWA = () => {
      if (localStorage.getItem('tanque_pwa_prompt_dismissed')) return;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
      if (isStandalone) return;

      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      const android = /android/.test(userAgent);

      if (ios || android) {
        setIsIOS(ios);
        setIsAndroid(android);
        setTimeout(() => setShowInstallPrompt(true), 2000);
      }
    };

    checkPWA();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    }
  };

  const closeInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('tanque_pwa_prompt_dismissed', 'true');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. VERIFICAÇÃO DE ADMINISTRAÇÃO
      if (loginInput === "administrativo@tanqueteambjj.com.br" && passwordInput === "@adm32573515") {
        localStorage.setItem('tanque_user_session', JSON.stringify({
          role: 'admin',
          name: 'Administrador',
          email: loginInput
        }));
        onLoginSuccess();
        return;
      }

      // 1.5 VERIFICAÇÃO DE ADMINISTRAÇÃO 2.0
      if (loginInput === "administrativo2.0" && passwordInput === "@123") {
        localStorage.setItem('tanque_user_session', JSON.stringify({
          role: 'admin',
          name: 'Administrador 2.0',
          email: loginInput
        }));
        onLoginSuccess();
        return;
      }

      // 2. VERIFICAÇÃO DE FINANCEIRO
      if (loginInput === "financeiro@tanqueteambjj.com.br" && passwordInput === "@fin32573515") {
        localStorage.setItem('tanque_user_session', JSON.stringify({
          role: 'financeiro',
          name: 'Gestor Financeiro',
          email: loginInput
        }));
        onLoginSuccess();
        return;
      }

      // 2.5. VERIFICAÇÃO DE JURÍDICO
      if (loginInput === "juridico@tanqueteambjj.com.br" && passwordInput === "@jur32573515") {
        localStorage.setItem('tanque_user_session', JSON.stringify({
          role: 'juridico',
          name: 'Departamento Jurídico',
          email: loginInput
        }));
        onLoginSuccess();
        return;
      }

      // 3. VERIFICAÇÃO DE ALUNO (Firestore)
      const appId = "tanqueteam-bjj";
      const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
      
      let q = query(studentsRef, where('studentLogin', '==', loginInput), where('studentPassword', '==', passwordInput));
      let snapshot = await getDocs(q);

      if (snapshot.empty) {
        q = query(studentsRef, where('email', '==', loginInput), where('studentPassword', '==', passwordInput));
        snapshot = await getDocs(q);
      }

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const studentData = { id: docSnap.id, ...docSnap.data(), role: 'student' };
        localStorage.setItem('tanque_user_session', JSON.stringify(studentData));
        
        setLoginSuccess(true);
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      } else {
        throw new Error("Credenciais inválidas");
      }

    } catch (err: any) {
      console.error("Erro login:", err);
      if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        setError("Erro de permissão. O domínio atual pode não estar autorizado no Firebase, ou as regras do Firestore bloqueiam a leitura.");
      } else {
        setError("Usuário ou senha incorretos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1B1B1B] font-sans antialiased h-screen overflow-hidden relative">
      {/* VÍDEO DE FUNDO VIMEO */}
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden bg-black">
        <iframe 
          src="https://player.vimeo.com/video/1170303398?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1" 
          frameBorder="0" 
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" 
          style={{ position: 'absolute', top: '50%', left: '50%', width: '100vw', height: '56.25vw', minHeight: '100vh', minWidth: '177.77vh', transform: 'translate(-50%, -50%)' }}
        ></iframe>
      </div>

      {/* Camada Escura Overlay */}
      <div className="fixed inset-0 bg-black/80 z-10 backdrop-blur-[2px]"></div>

      {/* Main Container */}
      <div className="w-full h-full flex items-center justify-center px-4 relative z-20">
        
        {/* Decoration Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1B1B1B] via-[#D90429] to-[#1B1B1B]"></div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-md w-full max-w-md p-8 rounded-2xl shadow-2xl relative overflow-hidden border-t-4 border-[#D90429] flex flex-col max-h-[95vh] overflow-y-auto"
        >
          {/* Header / Logo */}
          <div className="text-center mb-8 shrink-0">
            <div className="w-24 h-24 bg-[#1B1B1B] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-[#D90429] ring-opacity-20">
              <img src="https://iili.io/qC543c7.png" alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <h2 className="font-display text-3xl font-bold text-[#1B1B1B]">PORTAL <span className="text-[#D90429]">TANQUE TEAM</span></h2>
            <p className="text-gray-500 text-sm mt-1 font-medium tracking-wide">ÁREA RESTRITA (ALUNO / ADMIN)</p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="bg-red-100 border-l-4 border-[#D90429] text-red-700 p-4 mb-6 rounded text-sm shrink-0" role="alert">
              <p className="font-bold">Erro de Acesso</p>
              <p>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="shrink-0">
            <div className="space-y-5">
              
              {/* Email/Login Input */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 ml-1">Usuário ou E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    required 
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#D90429] focus:border-[#D90429] block pl-10 p-3 transition-colors outline-none" 
                    placeholder="Digite seu login ou e-mail" 
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 ml-1">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#D90429] focus:border-[#D90429] block pl-10 p-3 transition-colors outline-none" 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#D90429] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input id="remember-me" type="checkbox" className="w-4 h-4 text-[#D90429] bg-gray-100 border-gray-300 rounded focus:ring-[#D90429]" />
                  <label htmlFor="remember-me" className="ml-2 font-medium text-gray-600">Lembrar-me</label>
                </div>
                <a href="#" onClick={() => alert('Procure a secretaria para redefinir sua senha.')} className="font-bold text-[#D90429] hover:text-red-800 transition">Esqueceu a senha?</a>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading || loginSuccess}
                className={`w-full text-white font-bold rounded-lg text-lg px-5 py-3 text-center transition-all duration-300 shadow-lg transform active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 ${
                  loginSuccess 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-[#D90429] hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300'
                }`}
              >
                {loading && !loginSuccess ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> VERIFICANDO...
                  </>
                ) : loginSuccess ? (
                  <>
                    <Check className="w-5 h-5" /> SUCESSO!
                  </>
                ) : (
                  <>
                    <span>ENTRAR</span>
                    <LogIn className="w-5 h-5" />
                  </>
                )}
              </button>
              
              {/* PWA Native Install Button */}
              {showInstallBtn && (
                <button 
                  type="button" 
                  onClick={handleInstallClick}
                  className="w-full bg-gray-800 hover:bg-black text-white focus:ring-4 focus:outline-none focus:ring-gray-300 font-bold rounded-lg text-sm px-5 py-3 text-center transition-all duration-300 shadow-md transform active:scale-95 flex justify-center items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Instalar Aplicativo Tanque Team</span>
                </button>
              )}

            </div>
          </form>

          {/* Divider */}
          <div className="mt-8 mb-6 relative shrink-0">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500 font-display tracking-wider">TANQUE TEAM BJJ</span></div>
          </div>

          {/* Footer Links */}
          <div className="text-center space-y-2 shrink-0 pb-2">
            <p className="text-sm text-gray-600">Ainda não tem acesso?</p>
            <a href="http://www.tanqueteambjj.com.br/#register" className="text-[#1B1B1B] font-bold hover:text-[#D90429] transition underline decoration-[#D90429] decoration-2 underline-offset-4">Fazer Matrícula Online</a>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
              <a href="https://placar.tanqueteambjj.com.br" target="_blank" rel="noreferrer" className="text-sm text-[#1B1B1B] hover:text-[#D90429] font-bold flex items-center justify-center gap-2 transition bg-gray-50 py-2 rounded-lg border border-gray-200 shadow-sm">
                <Monitor className="w-4 h-4 text-[#D90429]" /> Placar Digital Tanque Team
              </a>
              <a href="http://www.tanqueteambjj.com.br" className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 transition">
                <ArrowLeft className="w-3 h-3" /> Voltar ao site principal
              </a>
            </div>
          </div>
        </motion.div>
        
        {/* Copyright */}
        <div className="absolute bottom-4 text-white/40 text-xs font-light tracking-wider z-20">
          &copy; 2026 TANQUE TEAM BJJ SYSTEM
        </div>

      </div>

      {/* Modal de Instalação (App Prompt) */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center sm:items-center p-4 pb-10 sm:pb-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative"
            >
              <button onClick={closeInstallPrompt} className="absolute top-3 right-3 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition">
                <X className="w-4 h-4" />
              </button>
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#D90429] to-red-800 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg transform -rotate-3">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-2xl text-gray-800 mb-2">Instale o nosso App!</h3>
                <p className="text-sm text-gray-600 mb-5 px-2">Tenha a sua carteirinha de check-in e horários com acesso rápido na tela inicial do seu celular.</p>

                {isIOS && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-sm text-gray-700 shadow-inner">
                    <p className="font-bold mb-3 text-[#1B1B1B] flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-gray-800" /> No iPhone (Safari):
                    </p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Toque no ícone de Compartilhar <Share className="w-4 h-4 inline text-blue-500 mx-1" /> (na barra inferior)</li>
                      <li>Role para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong> <PlusSquare className="w-4 h-4 inline text-gray-500 mx-1" /></li>
                    </ol>
                  </div>
                )}

                {isAndroid && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left text-sm text-gray-700 shadow-inner">
                    <p className="font-bold mb-3 text-[#1B1B1B] flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-green-500" /> No Android (Chrome):
                    </p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Toque nos 3 pontinhos <MoreVertical className="w-4 h-4 inline text-gray-500 mx-1" /> (no topo direito)</li>
                      <li>Selecione <strong>&quot;Adicionar à tela inicial&quot;</strong> ou <strong>&quot;Instalar aplicativo&quot;</strong> <Smartphone className="w-4 h-4 inline text-gray-500 mx-1" /></li>
                    </ol>
                  </div>
                )}

                <button onClick={closeInstallPrompt} className="w-full mt-6 bg-[#1B1B1B] text-white font-bold py-3 rounded-xl shadow-md hover:bg-gray-800 transition active:scale-95">
                  Entendi, vou adicionar!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
