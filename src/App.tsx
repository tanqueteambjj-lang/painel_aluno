'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc } from 'firebase/firestore';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import QrModal from '@/components/QrModal';
import HistoryModal from '@/components/HistoryModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import Feed from '@/components/Feed';
import Finance from '@/components/Finance';
import { Lock, Menu, Moon, Sun, LogOut, ChartLine, Users, UserCog, Calendar, Medal, CheckCircle, AlertTriangle, Link as LinkIcon, Trophy, Flame, Dumbbell, ShieldHalf, Crown, Zap, Star, Swords, Footprints, FileText, Share2, Check, X, Clock, QrCode, Printer, Loader2, CreditCard } from 'lucide-react';
import { AlertDialog, ConfirmDialog, AlertType } from '@/components/CustomDialogs';
import { motion, AnimatePresence } from 'motion/react';

const PLAN_DICT: Record<string, { price: number, short: string }> = {
  'infantil-mensal': { price: 189.90, short: 'Infantil Mensal' },
  'infantil-trimestral': { price: 168.90, short: 'Infantil Trimestral' },
  'infantil-semestral': { price: 157.90, short: 'Infantil Semestral' },
  'adulto-mensal': { price: 168.90, short: 'Adulto Mensal' },
  'adulto-trimestral': { price: 147.90, short: 'Adulto Trimestral' },
  'adulto-semestral': { price: 126.90, short: 'Adulto Semestral' },
  'mensal': { price: 168.90, short: 'Mensal' },
  'trimestral': { price: 147.90, short: 'Trimestral' },
  'semestral': { price: 126.90, short: 'Semestral' },
  'anual': { price: 100.00, short: 'Anual' },
  'plano-mensal': { price: 168.90, short: 'Plano Mensal' },
  'plano-trimestral': { price: 147.90, short: 'Plano Trimestral' },
  'plano-semestral': { price: 126.90, short: 'Plano Semestral' },
  'plano-anual': { price: 100.00, short: 'Plano Anual' },
  'combo-dupla': { price: 250.00, short: 'Combo Dupla' },
  'combo-familia': { price: 362.02, short: 'Combo Família' },
  'administracao': { price: 0.00, short: 'Administração' },
  'dependente': { price: 0.00, short: 'Dependente' },
  'isento': { price: 0.00, short: 'Isento' }
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("A sincronizar dados com o sistema...");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [dependents, setDependents] = useState<any[]>([]);
  const [viewingDependentId, setViewingDependentId] = useState<string | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());

  const [sharingBadge, setSharingBadge] = useState<any>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const isSharingRef = useRef(false);

  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'info' as AlertType });
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const appId = "tanqueteam-bjj"; // Hardcoded for this specific app context

  const handleShareBadge = (badge: any) => {
    setSharingBadge(badge);
    setShareMessage("");
  };

  const confirmShareBadge = async () => {
    if (!sharingBadge || !currentUserData || isSharingRef.current) return;
    isSharingRef.current = true;
    setIsSharing(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Check if user already shared today
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'feed'),
        where('studentId', '==', currentUserData.id)
      );
      const snap = await getDocs(q);
      
      let hasSharedToday = false;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.timestamp >= todayStart) {
          hasSharedToday = true;
        }
      });

      if (hasSharedToday) {
        showAlert("Aviso", "Você já compartilhou no feed hoje. Volte amanhã!", "error");
        setSharingBadge(null);
        setShareMessage("");
        return;
      }

      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      const post = {
        studentId: currentUserData.id,
        studentName: currentUserData.name,
        studentPhoto: currentUserData.photoBase64 || null,
        badgeName: sharingBadge.name,
        badgeDesc: sharingBadge.desc,
        badgeIcon: sharingBadge.icon?.displayName || sharingBadge.icon?.name || 'Trophy',
        beltStr: currentUserData.belt || null,
        message: shareMessage,
        timestamp: now.toISOString(),
        expiresAt,
        likes: 0,
        likedBy: []
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), post);
      setSharingBadge(null);
      setShareMessage("");
      showAlert("Sucesso", "Conquista compartilhada no Feed com sucesso!", "success");
    } catch (e) {
      console.error("Erro ao compartilhar conquista:", e);
      showAlert("Erro", "Erro ao compartilhar conquista.", "error");
    } finally {
      isSharingRef.current = false;
      setIsSharing(false);
    }
  };

  useEffect(() => {
    const initTheme = () => {
      const isDark = localStorage.getItem('tanque_theme') === 'dark' || 
        (!('tanque_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    initTheme();

    const initApp = async () => {
      try {
        // 1. Authenticate anonymously first so we can read from Firestore
        await signInAnonymously(auth);
      } catch (e: any) {
        console.error("Auth erro:", e);
        if (e.code === 'auth/unauthorized-domain') {
          console.warn("Domínio não autorizado no Firebase. Por favor, adicione este domínio no painel do Firebase Authentication.");
          // We don't block here immediately, let's see if Firestore allows public reads.
        } else {
          // For other errors, we might want to log them but not necessarily block if public reads are allowed.
        }
      }

      // 2. Check for UID in URL parameters (e.g., from external login redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const urlUid = urlParams.get('uid');

      if (urlUid) {
        try {
          // Fetch user data from Firestore using the UID from URL
          const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', urlUid);
          const studentSnap = await getDoc(studentRef);
          
          if (studentSnap.exists()) {
            const data = studentSnap.data();
            const userData = { role: 'student', id: urlUid, name: data.name, plan: data.plan };
            localStorage.setItem('tanque_user_session', JSON.stringify(userData));
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setAuthError("Matrícula não encontrada no sistema.");
            setLoading(false);
            return;
          }
        } catch (error: any) {
          console.error("Error fetching user from URL uid:", error);
          if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
            setAuthError("Erro de permissão. O domínio atual pode não estar autorizado no Firebase, ou as regras do Firestore bloqueiam a leitura.");
            setLoading(false);
            return;
          }
        }
      }

      let sessionData = localStorage.getItem('tanque_user_session');
      
      // Mock for preview if no session
      if (!sessionData && process.env.NODE_ENV === 'development') {
        sessionData = JSON.stringify({ role: 'student', id: 'mock_student_id', name: 'Aluno Preview', plan: 'adulto-mensal' });
        localStorage.setItem('tanque_user_session', sessionData);
      }

      if (!sessionData) {
        // Instead of redirecting to external site, show the internal login component
        setShowLogin(true);
        setLoading(false);
        return;
      }

      const user = JSON.parse(sessionData);
      if (user.role !== 'student' && process.env.NODE_ENV !== 'development') {
        setAuthError("Acesso negado. Apenas alunos podem acessar este painel.");
        setLoading(false);
        return;
      }

      try {
        await loadStudentData(user.id);

        // Check for Mercado Pago return
        const paymentId = urlParams.get('payment_id');
        const status = urlParams.get('status');
        
        if (paymentId && status === 'approved') {
          try {
            // Verify payment with backend
            const verifyRes = await fetch(`/api/verify-payment?payment_id=${paymentId}`);
            const verifyData = await verifyRes.json();
            
            if (verifyRes.ok && verifyData.status === 'approved') {
              const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', user.id);
              const studentSnap = await getDoc(studentRef);
              if (studentSnap.exists()) {
                const studentData = studentSnap.data();
                const history = studentData.paymentHistory || [];
                
                // Check if this payment_id is already in history to avoid duplicates
                const alreadyProcessed = history.some((p: any) => p.id === paymentId);
                
                if (!alreadyProcessed) {
                  // Calculate new due date (add 1 month to current due date or today)
                  const currentDueDateValue = studentData.dueDate || studentData.nextDueDate;
                  let currentDueDate = currentDueDateValue ? new Date(currentDueDateValue) : new Date();
                  if (isNaN(currentDueDate.getTime())) {
                    // Try parsing DD/MM/YYYY if it's a string
                    if (typeof currentDueDateValue === 'string' && currentDueDateValue.includes('/')) {
                      const parts = currentDueDateValue.split('/');
                      if (parts.length === 3) {
                        currentDueDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
                      }
                    }
                    if (isNaN(currentDueDate.getTime())) currentDueDate = new Date();
                  }
                  
                  // If due date is in the past, start from today
                  if (currentDueDate < new Date()) {
                    currentDueDate = new Date();
                  }
                  
                  const newDueDate = new Date(currentDueDate);
                  newDueDate.setMonth(newDueDate.getMonth() + 1);
                  
                  // Determine amount from plan
                  let planPrice = verifyData.amount || 150; // Use actual paid amount or default
                  
                  const newPayment = {
                    id: paymentId,
                    date: new Date().toISOString(),
                    amount: planPrice,
                    method: verifyData.method || urlParams.get('payment_type') || 'mercadopago',
                    status: 'approved'
                  };
                  
                  await updateDoc(studentRef, {
                    paymentStatus: 'Em dia',
                    nextDueDate: newDueDate.toISOString().split('T')[0], // Save as YYYY-MM-DD for consistency
                    dueDate: newDueDate.toISOString(), // Keep both for backward compatibility
                    paymentHistory: [...history, newPayment]
                  });
                  
                  // Reload student data to reflect changes
                  await loadStudentData(user.id);
                  
                  // Show success message
                  showAlert('Pagamento Aprovado', 'Seu pagamento foi processado com sucesso e sua assinatura foi atualizada.', 'success');
                }
              }
            } else {
              console.warn("Pagamento não aprovado ou não verificado:", verifyData);
            }
            
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (err) {
            console.error("Error updating payment status:", err);
          }
        }

        await loadNotices();
      } catch (e: any) {
        console.error("Data load erro:", e);
        if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
          setAuthError("Erro de permissão. O domínio atual pode não estar autorizado no Firebase, ou as regras do Firestore bloqueiam a leitura.");
        } else {
          setAuthError("Erro ao carregar dados do servidor.");
        }
      } finally {
        setLoading(false);
      }
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('tanque_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tanque_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tanque_theme', 'light');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tanque_user_session');
    window.location.href = 'https://www.tanqueteambjj.com.br/login.html';
  };

  const loadStudentData = async (studentId: string) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data: any = { id: docSnap.id, ...docSnap.data() };
        setCurrentUserData(data);
        
        if (data.plan && data.plan.includes('combo')) {
          await loadDependents(data.id);
        } else {
          setDependents([]);
        }
        await loadRanking();
      } else {
        // Fallback for mock
        if (process.env.NODE_ENV === 'development') {
          setCurrentUserData({ 
            id: studentId, 
            name: 'Aluno Preview', 
            plan: 'adulto-mensal',
            belt: 'Faixa Branca - 0º Grau',
            enrollmentStatus: 'Ativo',
            paymentStatus: 'Em dia',
            attendance: []
          });
        } else {
          setAuthError("Matrícula não encontrada no sistema.");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do aluno:", error);
    }
  };

  const loadDependents = async (titularId: string) => {
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const querySnapshot = await getDocs(q);
      
      const deps: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const dep: any = { id: docSnap.id, ...docSnap.data() };
        if(dep.titularId === titularId && dep.plan === 'dependente' && !dep.archived) {
          deps.push(dep);
        }
      });
      setDependents(deps);
    } catch (e) {
      console.error("Erro dependentes:", e);
    }
  };

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

  const loadNotices = async () => {
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'notices'));
      const snap = await getDocs(q);
      const fetchedNotices: any[] = [];
      const now = new Date();
      
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.expiresAt && parseDateString(data.expiresAt) < now) return;
        fetchedNotices.push({ id: docSnap.id, ...data });
      });
      
      fetchedNotices.sort((a, b) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime());
      setNotices(fetchedNotices);
    } catch (e) {
      console.error("Erro ao carregar avisos:", e);
    }
  };

  const loadRanking = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const snap = await getDocs(q);
      
      let rank: any[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if(data.archived || data.enrollmentStatus === 'Inativo') return;
        
        let monthCount = 0;
        if(data.attendance && data.attendance.length > 0) {
          data.attendance.forEach((d: string) => {
            const dateObj = new Date(d + 'T12:00:00');
            if(dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) monthCount++;
          });
        }
        if(monthCount > 0) rank.push({ name: data.name, belt: data.belt, classes: monthCount });
      });

      rank.sort((a,b) => b.classes - a.classes);
      setRanking(rank.slice(0, 5));
    } catch(e) { 
      console.error("Ranking error:", e); 
    }
  };

  const switchToDependent = async (depId: string) => {
    setViewingDependentId(depId);
    await loadStudentData(depId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToTitular = async () => {
    setViewingDependentId(null);
    const sessionData = localStorage.getItem('tanque_user_session');
    if (sessionData) {
      const user = JSON.parse(sessionData);
      await loadStudentData(user.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderBeltSVG = (beltStr: string) => {
    if (!beltStr) return null;
    const colors: Record<string, string> = { 'Branca': '#ffffff', 'Cinza': '#9ca3af', 'Amarela': '#fbbf24', 'Laranja': '#f97316', 'Verde': '#10b981', 'Azul': '#3b82f6', 'Roxa': '#8b5cf6', 'Marrom': '#78350f', 'Preta': '#000000' };
    let color = '#ffffff'; let degree = 0; let colorName = 'Branca';
    
    for (const [name, hex] of Object.entries(colors)) {
      if (beltStr.includes(name)) { color = hex; colorName = name; break; }
    }
    
    const degreeMatch = beltStr.match(/(\d)º/);
    if (degreeMatch) degree = parseInt(degreeMatch[1]);
    
    const width = 200; const height = 40; const tipWidth = 40; const stripeWidth = 6; const stripeGap = 5;
    const barColor = (colorName === 'Preta') ? '#dc2626' : '#000000';
    const stripeColor = '#ffffff';
    
    const stripes = [];
    for (let i = 0; i < degree; i++) {
        const x = width - 10 - (i * (stripeWidth + stripeGap)) - stripeWidth;
        stripes.push(<rect key={i} x={x} y="0" width={stripeWidth} height={height} fill={stripeColor} />);
    }
    
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <rect x="0" y="0" width={width} height={height} fill={color} />
        <rect x={width - tipWidth} y="0" width={tipWidth} height={height} fill={barColor} />
        {stripes}
      </svg>
    );
  };

  const calculateConsecutiveDays = (attendanceArray: string[]) => {
    if (!attendanceArray || attendanceArray.length === 0) return 0;
    
    const dates = attendanceArray.map(d => {
        const parts = d.split('-');
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        dt.setHours(0,0,0,0);
        return dt;
    }).sort((a, b) => b.getTime() - a.getTime());

    const today = new Date();
    today.setHours(0,0,0,0);

    const uniqueDates: Date[] = [];
    let lastTime = 0;
    dates.forEach(d => {
        if (d.getTime() !== lastTime) {
            uniqueDates.push(d);
            lastTime = d.getTime();
        }
    });

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    let expectedDate = new Date(today);

    if (uniqueDates[0].getTime() !== today.getTime()) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        if (uniqueDates[0].getTime() !== expectedDate.getTime()) {
            return 0; 
        }
    }

    for (let i = 0; i < uniqueDates.length; i++) {
        if (uniqueDates[i].getTime() === expectedDate.getTime()) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
  };

  const checkForRecentGraduation = (progressLog: any[], currentBeltStr: string) => {
    if (!progressLog || progressLog.length === 0) return null;
    
    const graduations = progressLog.filter(log => log.type === 'graduation');
    if (graduations.length === 0) return null;
    
    graduations.sort((a, b) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime());
    const latestGrad = graduations[0];
    
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const gradDate = parseDateString(latestGrad.date);
    
    if (gradDate >= fiveDaysAgo) {
        // Se o texto contém 1º, 2º, 3º ou 4º Grau, é apenas um grau. Caso contrário (ex: 0º Grau ou sem grau), é faixa nova.
        const isDegree = !!latestGrad.text.match(/[1-9]º Grau/);
        return {
            isNewBelt: !isDegree,
            beltStr: currentBeltStr,
            date: gradDate
        };
    }
    
    return null;
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark"
      >
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="rounded-full border-4 border-t-4 border-gray-200 border-t-brand-red h-12 w-12 mb-4 mx-auto"
          />
          <motion.h2 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-white font-display text-xl"
          >
            A CARREGAR DOJO...
          </motion.h2>
          <p className="text-gray-400 text-xs mt-2">{loadingText}</p>
        </div>
      </motion.div>
    );
  }

  if (showLogin) {
    return <Login onLoginSuccess={() => {
      setShowLogin(false);
      setLoading(true);
      // We need to re-run initApp, but since it's inside useEffect, 
      // we can just force a reload or call a function.
      // The easiest way is to just reload the page to re-run the initialization
      window.location.reload();
    }} />;
  }

  if (authError) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 text-white p-4 text-center">
        <Lock className="w-12 h-12 mb-4 text-brand-red" />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-gray-300 mb-6">{authError}</p>
        <button onClick={() => {
          localStorage.removeItem('tanque_user_session');
          setAuthError(null);
          window.location.href = 'https://www.tanqueteambjj.com.br/login.html';
        }} className="px-6 py-2 bg-brand-red rounded hover:bg-red-700 transition font-bold">
          Ir para Login
        </button>
      </div>
    );
  }

  if (!currentUserData) return null;

  const firstName = (currentUserData.name || "Aluno").split(' ')[0];
  const rawPlanKey = currentUserData.plan || 'N/A';
  // Extract base plan name if it contains " - R$"
  const basePlanName = rawPlanKey.split(' - R$')[0].trim();
  const planKey = basePlanName.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const planInfo = PLAN_DICT[planKey] || { short: basePlanName.toUpperCase(), price: undefined };
  const totalAtt = currentUserData.attendance ? currentUserData.attendance.length : 0;
  const streak = calculateConsecutiveDays(currentUserData.attendance || []);
  const recentGrad = checkForRecentGraduation(currentUserData.progressLog, currentUserData.belt || "Faixa Branca - 0º Grau");

  const isNotWhiteBelt = currentUserData.belt && !currentUserData.belt.includes('Branca');
  const currentDegree = currentUserData.belt ? (parseInt(currentUserData.belt.match(/(\d)º/)?.[1] || '0')) : 0;
  const currentBeltName = currentUserData.belt ? currentUserData.belt.split('-')[0].trim() : 'Faixa Branca';

  // Calendar Logic
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
  const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
  let monthAttCount = 0;
  
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isPresent = currentUserData.attendance?.includes(dateStr);
    if (isPresent) monthAttCount++;
    
    calendarDays.push(
      <div key={`day-${i}`} className={`calendar-day ${isPresent ? 'present' : 'bg-gray-50 dark:bg-gray-700/50 shadow-sm'}`}>
        {i}
      </div>
    );
  }

  const hasGraduation = (log: any[], keyword: string) => log?.some(entry => entry.type === 'graduation' && entry.text.includes(keyword));
  const earnedDegree1 = hasGraduation(currentUserData.progressLog, '1º Grau');
  const earnedDegree2 = hasGraduation(currentUserData.progressLog, '2º Grau');
  const earnedDegree3 = hasGraduation(currentUserData.progressLog, '3º Grau');
  const earnedDegree4 = hasGraduation(currentUserData.progressLog, '4º Grau');
  const earnedNewBelt = currentUserData.progressLog?.some((entry: any) => entry.type === 'graduation' && (!entry.text.match(/[1-9]º Grau/)));

  // Badges Logic
  const badges = [
    { name: "Primeiro Passo", desc: "A jornada começa aqui.", icon: Footprints, color: "text-blue-500", req: 0 },
    { name: "Iniciante", desc: "10 Treinos concluídos.", icon: Flame, color: "text-orange-500", req: 10 },
    { name: "Consistente", desc: "25 Treinos concluídos.", icon: Dumbbell, color: "text-gray-500", req: 25 },
    { name: "Guerreiro", desc: "50 Treinos concluídos.", icon: ShieldHalf, color: "text-purple-500", req: 50 },
    { name: "Veterano", desc: "100 Treinos. Jiu-Jitsu na veia.", icon: Crown, color: "text-yellow-500", req: 100 },
    { name: "Focado", desc: "5 dias seguidos no tatame.", icon: Zap, color: "text-red-500", customReq: streak >= 5 },
    { name: "1º Grau", desc: "Avançou para o primeiro grau.", icon: Star, color: "text-yellow-600", customReq: earnedDegree1 },
    { name: "2º Grau", desc: "Avançou para o segundo grau.", icon: Star, color: "text-yellow-600", customReq: earnedDegree2 },
    { name: "3º Grau", desc: "Avançou para o terceiro grau.", icon: Star, color: "text-yellow-600", customReq: earnedDegree3 },
    { name: "4º Grau", desc: "Avançou para o quarto grau.", icon: Star, color: "text-yellow-600", customReq: earnedDegree4 },
    { name: "Nova Faixa", desc: "Avançou para uma nova faixa.", icon: Medal, color: "text-brand-red", customReq: earnedNewBelt },
    { name: "Mestre", desc: "500 Treinos. Uma lenda viva.", icon: Swords, color: "text-red-600", req: 500 }
  ];

  return (
    <div className="flex h-screen overflow-hidden relative w-full bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <Sidebar 
        view={view} 
        setView={(v: string) => { setView(v); setIsMobileMenuOpen(false); }} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        toggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        handleLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-brand-dark border-b border-gray-800 text-white p-4 flex justify-between items-center shadow-md z-20 no-print shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white hover:text-brand-red focus:outline-none transition">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <div className="relative h-8 w-8 mr-2 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://iili.io/qC543c7.png" loading="lazy" className="w-full h-full object-contain" alt="Logo" />
              </div>
              <span className="font-display font-bold text-lg">TANQUE TEAM</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="text-yellow-400 hover:text-yellow-300 focus:outline-none transition">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-500 focus:outline-none transition">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dependent Banner */}
        {viewingDependentId && (
          <div className="bg-purple-600 dark:bg-purple-800 text-white px-4 py-3 flex justify-between items-center shadow-md z-10 no-print shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-200" />
              <span className="text-sm">A gerir dependente: <strong>{currentUserData.name}</strong></span>
            </div>
            <button onClick={switchToTitular} className="bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded text-xs font-bold transition shadow-sm border border-transparent dark:border-purple-600 flex items-center">
              Voltar<span className="hidden sm:inline ml-1">ao Titular</span>
            </button>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative">
          <AnimatePresence mode="wait">
            {/* DASHBOARD VIEW */}
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Welcome Section */}
              <div className="mb-8 flex justify-between items-end">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 shadow-md overflow-hidden flex-shrink-0 relative">
                    {currentUserData.photoBase64 ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentUserData.photoBase64} loading="lazy" className="w-full h-full object-cover" alt="Profile" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-2xl font-bold font-display">
                        {firstName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm uppercase font-bold tracking-wider mb-1">Bem-vindo(a) de volta,</p>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-dark dark:text-white">{firstName}</h1>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transform -translate-y-1 ${currentUserData.archived ? 'bg-gray-500' : currentUserData.enrollmentStatus === 'Inativo' ? 'bg-red-500' : 'bg-green-500'}`}>
                        {currentUserData.archived ? 'Arquivado' : currentUserData.enrollmentStatus === 'Inativo' ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-brand-red" /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* Check-in Button */}
              <div className="mb-8 no-print">
                <button onClick={() => setIsQrModalOpen(true)} className="w-full bg-gradient-to-r from-brand-dark to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-xl flex items-center justify-between transition transform hover:-translate-y-1 border border-gray-700 dark:border-gray-600">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 bg-brand-red rounded-full flex items-center justify-center shadow-inner shrink-0">
                      <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="block text-lg md:text-xl font-display uppercase tracking-widest text-brand-red">Carteirinha Digital</span>
                      <span className="block text-xs md:text-sm text-gray-300 dark:text-gray-400 font-normal mt-1">Toque aqui para abrir o seu QR Code e realizar o Check-in na Recepção</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mb-8 no-print">
                <button onClick={() => window.open(`https://api.whatsapp.com/send?text=E aí! Bora treinar Jiu-Jitsu na Tanque Team? 🥋🔥 Vem fazer uma aula experimental! Acesse: https://www.tanqueteambjj.com.br`, '_blank')} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition transform hover:-translate-y-1">
                  <Share2 className="w-6 h-6" />
                  <span className="text-base md:text-lg">Chamar um Amigo pro Treino</span>
                </button>
              </div>

              {/* Notices */}
              {notices.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-display text-xl font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-yellow-500 w-5 h-5" /> Quadro de Avisos
                  </h3>
                  <div className="space-y-3">
                    {notices.map(notice => (
                      <div key={notice.id} className={`p-4 border rounded-xl shadow-sm animate-fade-in ${notice.type === 'alert' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : notice.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : notice.type === 'danger' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                        <div className="flex items-start gap-3">
                          <div className="text-xl mt-0.5">
                            {notice.type === 'alert' ? <AlertTriangle className="text-yellow-500 w-5 h-5" /> : notice.type === 'success' ? <CheckCircle className="text-green-500 w-5 h-5" /> : notice.type === 'danger' ? <X className="text-red-500 w-5 h-5" /> : <AlertTriangle className="text-blue-500 w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className={`font-bold text-sm md:text-base leading-tight ${notice.type === 'alert' ? 'text-yellow-800 dark:text-yellow-200' : notice.type === 'success' ? 'text-green-800 dark:text-green-200' : notice.type === 'danger' ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>{notice.title}</h4>
                            <p className="text-sm mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{notice.text}</p>
                            <p className="text-[10px] opacity-70 mt-2 font-medium text-gray-500 dark:text-gray-400">Publicado em: {parseDateString(notice.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Belt Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-brand-red relative overflow-hidden flex flex-col justify-between">
                      {recentGrad && (
                        <div className="absolute top-0 left-0 w-full bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-1 z-10">
                          <span>{recentGrad.isNewBelt ? `🎉 PARABÉNS PELA NOVA FAIXA! (${currentUserData.belt}) 🎉` : `⭐ PARABÉNS PELO NOVO GRAU! (${currentUserData.belt}) ⭐`}</span>
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between items-start mb-4 mt-2">
                          <div>
                            <h3 className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">Graduação Atual</h3>
                            <p className="text-xl font-bold text-brand-dark dark:text-white mt-1">{currentUserData.belt || "Faixa Branca - 0º Grau"}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-brand-dark dark:text-gray-300">
                            <Medal className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="w-full h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 shadow-inner overflow-hidden relative">
                          {renderBeltSVG(currentUserData.belt || "Faixa Branca - 0º Grau")}
                        </div>
                        {recentGrad && (
                          <button 
                            onClick={() => handleShareBadge({
                              name: recentGrad.isNewBelt ? "Nova Faixa" : "Novo Grau",
                              desc: `Avançou para ${currentUserData.belt}`,
                              icon: recentGrad.isNewBelt ? Medal : Star,
                              color: recentGrad.isNewBelt ? "text-brand-red" : "text-yellow-600"
                            })}
                            className="mt-4 w-full bg-brand-red text-white text-sm font-bold py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-md"
                          >
                            <Share2 className="w-4 h-4" /> Compartilhar no Feed
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-gray-800 dark:border-gray-600">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">Financeiro</h3>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${currentUserData.paymentStatus === 'Pendente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : currentUserData.paymentStatus === 'Isento' || planKey === 'dependente' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {currentUserData.paymentStatus === 'Pendente' ? <><AlertTriangle className="w-3 h-3 mr-1" /> Pendente</> : currentUserData.paymentStatus === 'Isento' || planKey === 'dependente' ? <><LinkIcon className="w-3 h-3 mr-1" /> Isento</> : <><CheckCircle className="w-3 h-3 mr-1" /> Em dia</>}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${currentUserData.paymentStatus === 'Pendente' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : currentUserData.paymentStatus === 'Isento' || planKey === 'dependente' ? 'bg-gray-50 dark:bg-gray-700 text-gray-400' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                          {currentUserData.paymentStatus === 'Pendente' ? <X className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Plano: <span className="font-bold text-brand-dark dark:text-white uppercase">{planInfo.short}</span></p>
                        <div className="flex flex-col gap-2 mt-3">
                          <button onClick={() => setIsHistoryModalOpen(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold flex items-center transition justify-center mt-1">
                            <Clock className="w-3 h-3 mr-1" /> Ver Histórico de Pagamentos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-t-4 border-blue-500 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-red" /> Calendário de Treinos
                    </h3>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1">
                      <button onClick={() => {
                        let m = currentCalendarMonth - 1; let y = currentCalendarYear;
                        if (m < 0) { m = 11; y--; }
                        setCurrentCalendarMonth(m); setCurrentCalendarYear(y);
                      }} className="w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-brand-red rounded-full transition">&lt;</button>
                      <span className="text-xs font-bold text-brand-dark dark:text-gray-200 min-w-[80px] text-center uppercase">{monthNames[currentCalendarMonth].substring(0,3)}. {currentCalendarYear}</span>
                      <button onClick={() => {
                        let m = currentCalendarMonth + 1; let y = currentCalendarYear;
                        if (m > 11) { m = 0; y++; }
                        setCurrentCalendarMonth(m); setCurrentCalendarYear(y);
                      }} className="w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-brand-red rounded-full transition">&gt;</button>
                    </div>
                  </div>
                  
                  <div className="mb-4 flex-grow">
                    <div className="grid grid-cols-7 mb-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="calendar-header-day dark:text-gray-500">{d}</div>)}
                    </div>
                    <div className="calendar-grid">
                      {calendarDays}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Total de Treinos (Mês)</span>
                      <span className="text-xl font-bold text-brand-red">{monthAttCount}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Total de Treinos (Geral)</span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalAtt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ranking & Achievements */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 no-print">
                {/* Ranking */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-t-4 border-brand-dark dark:border-gray-600 flex flex-col">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-display text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2"><Flame className="text-orange-500 w-5 h-5" /> Top 5 - Frequência</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Os guerreiros que mais treinaram</p>
                    </div>
                    <span className="text-xs font-bold text-brand-dark dark:text-gray-200 bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-full uppercase tracking-wider shadow-inner">{monthNames[new Date().getMonth()]}</span>
                  </div>
                  <div className="p-0 flex-1 overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {ranking.length === 0 ? (
                          <tr><td className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 italic">Nenhum treino registrado este mês.</td></tr>
                        ) : (
                          ranking.map((s, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                              <td className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {idx === 0 ? <Medal className="text-yellow-500 w-6 h-6" /> : idx === 1 ? <Medal className="text-gray-400 w-6 h-6" /> : idx === 2 ? <Medal className="text-amber-600 w-6 h-6" /> : <span className="font-bold text-gray-500 w-6 inline-block text-center">{idx+1}º</span>}
                                  <div>
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{s.name.split(' ')[0]}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{(s.belt || 'Branca').split('-')[0].replace('Faixa ', '').trim()}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="bg-brand-red text-white text-xs font-bold px-2 py-1 rounded shadow-sm">{s.classes}</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Achievements */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-t-4 border-yellow-500 flex flex-col">
                  <h3 className="font-display text-xl font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><Trophy className="text-yellow-500 w-5 h-5" /> As Minhas Conquistas</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Acompanhe a sua evolução no tatame e partilhe as suas medalhas no Feed!</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[300px] pr-2 pb-2">
                    {badges.map((b, i) => {
                      const unlocked = b.customReq !== undefined ? b.customReq : totalAtt >= (b.req || 0);
                      const opacityClass = unlocked ? 'opacity-100 ring-2 ring-yellow-400 dark:ring-yellow-500' : 'opacity-40 grayscale pointer-events-none';
                      const bgClass = unlocked ? 'bg-gradient-to-b from-white to-gray-100 dark:from-gray-700 dark:to-gray-800' : 'bg-gray-100 dark:bg-gray-800';
                      
                      return (
                        <motion.div 
                          key={i} 
                          whileHover={unlocked ? { scale: 1.05, y: -5 } : {}}
                          className={`flex flex-col items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${bgClass} ${opacityClass} transition-colors`}
                        >
                          <div className="flex flex-col items-center w-full">
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-2xl shadow-inner mb-2 border border-gray-100 dark:border-gray-600">
                              <b.icon className={`w-6 h-6 ${b.color}`} />
                            </div>
                            <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-center leading-tight mb-1 truncate w-full">{b.name}</p>
                            <p className="text-[8px] text-gray-500 dark:text-gray-400 text-center leading-tight line-clamp-2">{b.desc}</p>
                          </div>
                          {unlocked && (
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleShareBadge(b)}
                              className="mt-2 text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 px-3 py-1 rounded-full font-bold hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition"
                            >
                              Compartilhar
                            </motion.button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

                {/* Dependents */}
                {dependents.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-left border-l-4 border-purple-500 mb-8">
                    <h3 className="font-display text-xl font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><Users className="text-purple-600 w-5 h-5" /> Meus Dependentes (Combo Família)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Gira as informações e acompanhe a frequência de quem treina consigo no plano Combo.</p>
                    <div className="space-y-3">
                      {dependents.map(dep => (
                        <div key={dep.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition hover:shadow-md">
                          <div>
                            <p className="font-bold text-sm text-purple-900 dark:text-purple-100">{dep.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">{(dep.belt || 'Branca').split('-')[0].trim()} • {dep.attendance ? dep.attendance.length : 0} Treinos</p>
                          </div>
                          <button onClick={() => switchToDependent(dep.id)} className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 px-3 py-1.5 rounded text-xs font-bold transition shadow-sm border border-purple-200 dark:border-purple-700 flex items-center">
                            Acessar Painel &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* FEED VIEW */}
            {view === 'feed' && (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Feed currentUserData={currentUserData} appId={appId} showAlert={showAlert} showConfirm={showConfirm} />
              </motion.div>
            )}

            {/* FINANCE VIEW */}
            {view === 'finance' && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Finance currentUserData={currentUserData} planInfo={planInfo} showAlert={showAlert} />
              </motion.div>
            )}

            {/* PROFILE VIEW */}
            {view === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 mt-2">
                <UserCog className="w-8 h-8 text-brand-red" />
                <h2 className="font-display text-3xl font-bold text-brand-dark dark:text-white uppercase tracking-wider">Meus Dados</h2>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto border-t-4 border-gray-800 dark:border-gray-600">
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <h3 className="text-gray-800 dark:text-gray-100 font-display font-bold tracking-wide text-lg flex items-center"><FileText className="mr-2 text-brand-red w-5 h-5" /> DADOS CADASTRAIS</h3>
                  <button onClick={() => setIsProfileEditModalOpen(true)} className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow transition text-sm flex items-center gap-2">Alterar Dados</button>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome Completo</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.name || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Utilizador de Acesso (Login)</label>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold shadow-sm overflow-x-auto">{currentUserData.studentLogin || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">E-mail</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.email || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">CPF</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.cpf || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Telefone</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.phone || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Peso (kg)</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.weight || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Altura (cm)</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.height || '--'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Endereço</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.address || '--'}</div>
                    </div>
                  </div>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600 w-full pb-4 no-print">
            &copy; {new Date().getFullYear()} Tanque Team BJJ. Todos os direitos reservados. Oss.
          </div>
        </main>
      </div>

      <QrModal 
        isOpen={isQrModalOpen} 
        onClose={() => setIsQrModalOpen(false)} 
        userData={currentUserData} 
        planShort={planInfo.short} 
        onOpenHistory={() => {
          setIsQrModalOpen(false);
          setIsHistoryModalOpen(true);
        }}
      />
      
      <AnimatePresence>
        {sharingBadge && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="font-bold text-lg mb-4 dark:text-white">Compartilhar Conquista</h3>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <sharingBadge.icon className={`w-8 h-8 ${sharingBadge.color}`} />
                <div>
                  <p className="font-bold dark:text-white">{sharingBadge.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{sharingBadge.desc}</p>
                </div>
              </div>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Escreva uma mensagem personalizada..."
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-brand-red dark:text-white resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={() => setSharingBadge(null)} disabled={isSharing} className="flex-1 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50">Cancelar</button>
                <button onClick={confirmShareBadge} disabled={isSharing} className="flex-1 py-2 rounded-xl font-bold text-white bg-brand-red hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Compartilhar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        history={currentUserData.paymentHistory} 
        userData={currentUserData}
        planShort={planInfo.short}
      />
      
      <ProfileEditModal 
        isOpen={isProfileEditModalOpen} 
        onClose={() => setIsProfileEditModalOpen(false)} 
        userData={currentUserData} 
        appId={appId}
        onSaveSuccess={() => loadStudentData(currentUserData.id)}
        showAlert={showAlert}
      />

      <AlertDialog 
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
      />

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}
