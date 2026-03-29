import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User, Lock, Eye, EyeOff, Monitor, ArrowLeft, LogIn, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const appId = "tanqueteam-bjj";
      let userData: any = null;

      // Query the students collection for a matching username/email and password
      const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
      
      // We will check if the input matches either the 'email' field or a 'username' field if you have one.
      // Assuming the username is stored in the 'email' field for now based on previous context, 
      // or you might have a dedicated 'username' field. Let's check 'email' first.
      const q = query(studentsRef, where('email', '==', email), where('password', '==', password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Found a matching student
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        userData = { role: 'student', id: docSnap.id, name: data.name, plan: data.plan };
      } else {
         // If not found, you might want to check a separate admin collection or hardcode admin credentials for testing
         // For now, if it fails the DB check, we throw an error.
         throw new Error("Invalid credentials");
      }

      localStorage.setItem('tanque_user_session', JSON.stringify(userData));
      onLoginSuccess();

    } catch (err: any) {
      console.error('Login error:', err);
      setError('Usuário ou senha incorretos. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-black">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1564415315949-220c40df8fab?q=80&w=2070&auto=format&fit=crop")' }}
      ></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-[#f4f4f4] rounded-xl shadow-2xl overflow-hidden m-4"
      >
        <div className="p-8 md:p-10 flex flex-col items-center">
          
          {/* Logo */}
          <div className="w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-6 shadow-lg border-4 border-white">
            <img src="https://iili.io/qC543c7.png" alt="Tanque Team Logo" className="w-16 h-16 object-contain" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-[#1a1a1a] tracking-tight mb-1 text-center font-display uppercase">
            PORTAL <span className="text-[#dc2626]">TANQUE TEAM</span>
          </h1>
          <p className="text-xs font-bold text-gray-500 tracking-widest mb-8 text-center uppercase">
            ÁREA RESTRITA (ALUNO / ADMIN)
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm text-center font-medium">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-shadow"
                  placeholder="Seu e-mail ou usuário"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-[#eef2ff] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#dc2626] focus:ring-[#dc2626] border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer">
                  Lembrar-me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-bold text-[#dc2626] hover:text-red-800 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-[#dc2626] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#dc2626] transition-colors disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  ENTRAR <LogIn className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full flex items-center justify-center mt-8 mb-6">
            <div className="border-t border-gray-300 flex-grow"></div>
            <span className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest bg-[#f4f4f4]">
              Tanque Team BJJ
            </span>
            <div className="border-t border-gray-300 flex-grow"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">Ainda não tem acesso?</p>
            <a href="https://www.tanqueteambjj.com.br" className="text-sm font-bold text-[#1a1a1a] border-b-2 border-[#1a1a1a] hover:text-[#dc2626] hover:border-[#dc2626] transition-colors pb-0.5">
              Fazer Matrícula Online
            </a>
          </div>

          {/* Placar Digital Button */}
          <button 
            onClick={() => window.location.href = "https://www.tanqueteambjj.com.br"}
            className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-[#1a1a1a] bg-white hover:bg-gray-50 transition-colors mb-6"
          >
            <Monitor className="w-4 h-4 mr-2 text-[#dc2626]" />
            Placar Digital Tanque Team
          </button>

          {/* Back to Site */}
          <a href="https://www.tanqueteambjj.com.br" className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" /> Voltar ao site principal
          </a>

        </div>
      </motion.div>
    </div>
  );
}
