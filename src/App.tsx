'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, onSnapshot, increment, arrayUnion } from 'firebase/firestore';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import QrModal from '@/components/QrModal';
import HistoryModal from '@/components/HistoryModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import Feed from '@/components/Feed';
import Finance from '@/components/Finance';
import Ranking, { RankingManual } from '@/components/Ranking';
import Scheduling from '@/components/Scheduling';
import AdminPanel from '@/components/AdminPanel';
import { Menu, Moon, Sun, LogOut, Users, User, UserCog, Calendar, Medal, CheckCircle, AlertTriangle, Link as LinkIcon, Star, Share2, X, Clock, QrCode, Loader2, Lock, Flame, FileText, Trophy, Award, Zap, Shield, Crown, MessageSquare, Target, ArrowUpCircle, CreditCard, ChevronRight, Pin, Cake, TrendingUp, ThumbsUp } from 'lucide-react';
import { AlertDialog, ConfirmDialog, AlertType, Toast } from '@/components/CustomDialogs';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';

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

const WEEKLY_QUESTS = [
  { id: 'q_train_3', title: 'Guerreiro da Semana', desc: 'Treine 3 vezes nesta semana', goal: 3, xp: 250, type: 'attendance' },
  { id: 'q_social_5', title: 'Influenciador do Tatame', desc: 'Curta 5 posts no Feed', goal: 5, xp: 100, type: 'social_likes' },
  { id: 'q_comment_2', title: 'Crítico de Lutas', desc: 'Comente em 2 posts no Feed', goal: 2, xp: 150, type: 'social_comments' },
  { id: 'q_weekend', title: 'Samurai do Sábado', desc: 'Treine em um final de semana', goal: 1, xp: 200, type: 'weekend' },
];

const VISUAL_TIERS = [
  { id: 'none', name: 'Nenhum', minLevel: 1, glow: '' },
  { id: 'warrior', name: 'Guerreiro', minLevel: 10, glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)] border-red-500' },
  { id: 'elite', name: 'Elite', minLevel: 25, glow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)] border-blue-500 animate-pulse' },
  { id: 'legend', name: 'Lendário', minLevel: 50, glow: 'shadow-[0_0_25px_rgba(245,158,11,0.7)] border-amber-500 ring-2 ring-amber-400' },
  { id: 'mythic', name: 'Mítico', minLevel: 100, glow: 'shadow-[0_0_30px_rgba(168,85,247,0.8)] border-purple-500 ring-2 ring-purple-400' },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [impersonatedStudent, setImpersonatedStudent] = useState<any>(null);
  const [dependents, setDependents] = useState<any[]>([]);
  const [viewingDependentId, setViewingDependentId] = useState<string | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [rankingAdulto, setRankingAdulto] = useState<any[]>([]);
  const [rankingInfantil, setRankingInfantil] = useState<any[]>([]);
  const [lastMonthRankingAdulto, setLastMonthRankingAdulto] = useState<any[]>([]);
  const [lastMonthRankingInfantil, setLastMonthRankingInfantil] = useState<any[]>([]);
  const [rankingXpAdulto, setRankingXpAdulto] = useState<any[]>([]);
  const [rankingXpInfantil, setRankingXpInfantil] = useState<any[]>([]);
  const [rankingSocialAdulto, setRankingSocialAdulto] = useState<any[]>([]);
  const [rankingTab, setRankingTab] = useState<'presence' | 'xp'>('presence');
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [adminAchievements, setAdminAchievements] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());
  const [primaryStudentId, setPrimaryStudentId] = useState<string | null>(null);

  const [sharingBadge, setSharingBadge] = useState<any>(null);
  const [shareMessage, setShareMessage] = useState("");
  const prevAttendanceCount = useRef(0);
  const [isSharing, setIsSharing] = useState(false);
  const isSharingRef = useRef(false);

  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'info' as AlertType });
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [toastState, setToastState] = useState({ isOpen: false, message: '', type: 'success' as AlertType });

  const showToast = (message: string, type: AlertType = 'success') => {
    setToastState({ isOpen: true, message, type });
  };

  const [hasUnreadFeed, setHasUnreadFeed] = useState(false);
  const [hasUnreadNotices, setHasUnreadNotices] = useState(false);
  
  const listenersRef = useRef<{ notices?: any, feed?: any, student?: any, notifications?: any, bookings?: any }>({});
  const initialLoadRef = useRef(true);

  const getPlanInfoFromData = (data: any) => {
    const rawPlanKey = data?.plan || 'N/A';
    const basePlanName = rawPlanKey.split(' - R$')[0].trim();
    const planKey = basePlanName.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return { planKey, basePlanName, planInfo: PLAN_DICT[planKey] || { short: basePlanName.toUpperCase(), price: undefined } };
  };

  const activeUserData = impersonatedStudent || currentUserData;
  const { planKey, planInfo } = getPlanInfoFromData(activeUserData);
  
  // Real Admin status (always based on the logged-in user)
  const { planKey: realUserPlanKey } = getPlanInfoFromData(currentUserData);
  const isRealAdmin = (currentUserData?.role === 'admin') || 
                      (currentUserData?.role === 'financeiro') || 
                      (currentUserData?.role === 'juridico') || 
                      (realUserPlanKey === 'administracao') ||
                      (currentUserData?.email === 'administrativo@tanqueteambjj.com.br') ||
                      (currentUserData?.email === 'tanqueteambjj@gmail.com');
  const isAdmin = isRealAdmin;

  const totalAtt = activeUserData?.attendance ? activeUserData.attendance.length : 0;
  
  const [prevLevel, setPrevLevel] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const lastViewedIdRef = useRef<string | null>(null);

  // Sync prevAttendanceCount
  useEffect(() => {
    if (activeUserData?.attendance) {
      prevAttendanceCount.current = activeUserData.attendance.length;
    }
  }, [activeUserData?.id]);

  // Watch for attendance changes to update quests
  useEffect(() => {
    if (!activeUserData || !activeUserData.attendance || !appId) return;
    const attCount = activeUserData.attendance.length;
    const pCount = prevAttendanceCount.current;
    
    if (attCount > pCount) {
      updateQuestProgress('attendance', 1);
      try {
        const lastDate = activeUserData.attendance[attCount - 1];
        const dateObj = new Date(lastDate + 'T12:00:00');
        const day = dateObj.getDay();
        if (day === 0 || day === 6) updateQuestProgress('weekend', 1);
      } catch (e) {
        console.error("Error checking weekend quest:", e);
      }
    }
    prevAttendanceCount.current = attCount;
  }, [activeUserData?.attendance?.length]);

  useEffect(() => {
    // Check initial load safety
    setTimeout(() => { initialLoadRef.current = false; }, 3000);
  }, []);

  const sendPushNotification = (title: string, body: string) => {
    // Disabled as per user request
    console.log("Push notification blocked:", title, body);
  };

  const requestPushPermission = async () => {
    // Disabled
  };

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
      
      // Check if muted
      if (currentUserData.mutedUntil && new Date(currentUserData.mutedUntil) > now) {
        const remaining = formatDistanceToNow(new Date(currentUserData.mutedUntil), { locale: ptBR });
        showAlert("Acesso Restrito", `Você foi silenciado pela administração. Poderá postar novamente em ${remaining}.`, "error");
        setSharingBadge(null);
        setShareMessage("");
        return;
      }

      const post = {
        studentId: currentUserData.id,
        studentName: currentUserData.nickname || currentUserData.name,
        studentPhoto: currentUserData.photoBase64 || null,
        badgeName: sharingBadge.name,
        badgeDesc: sharingBadge.desc,
        badgeIcon: sharingBadge.iconName || 'Trophy',
        beltStr: currentUserData.belt || null,
        message: shareMessage,
        timestamp: now.toISOString(),
        expiresAt,
        likes: 0,
        likedBy: []
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), post);
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', currentUserData.id), {
          feedPosts: (currentUserData.feedPosts || 0) + 1
        });
      } catch (err) {
        console.error("Could not update feedPosts count", err);
      }
      setSharingBadge(null);
      setShareMessage("");
      showToast("Conquista compartilhada no Feed com sucesso!", "success");
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
      } catch (e: Error | unknown) {
        console.error("Auth erro:", e);
        if (e instanceof Error && e.message.includes('auth/unauthorized-domain')) {
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
        } catch (error: Error | unknown) {
          console.error("Error fetching user from URL uid:", error);
          if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions'))) {
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
      const allowedRoles = ['student', 'admin', 'financeiro', 'juridico'];
      if (!allowedRoles.includes(user.role) && process.env.NODE_ENV !== 'development') {
        setAuthError("Acesso negado. Perfil não autorizado.");
        setLoading(false);
        return;
      }

      try {
        if (user.id) {
          await loadStudentData(user.id);
        } else {
          // Hardcoded users (admin/staff) without specific Firestore document ID
          setCurrentUserData(user);
        }

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
                  const paidAmount = verifyData.amount || 150;
                  const rawPlanKey = studentData.plan || 'N/A';
                  const basePlanName = rawPlanKey.split(' - R$')[0].trim();
                  const planKey = basePlanName.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const planInfo = PLAN_DICT[planKey] || { price: 150 };
                  const fullAmount = planInfo.basePrice || planInfo.price || 150;
                  const discount = fullAmount > paidAmount ? fullAmount - paidAmount : 0;
                  
                  const newPayment = {
                    id: paymentId,
                    date: new Date().toISOString(),
                    amount: paidAmount,
                    fullAmount: fullAmount,
                    discount: discount,
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

        loadNotices();
        checkUnreadFeed();
      } catch (e: Error | unknown) {
        console.error("Data load erro:", e);
        if (e instanceof Error && (e.message.includes('permission-denied') || e.message.includes('Missing or insufficient permissions'))) {
          setAuthError("Erro de permissão. O domínio atual pode não estar autorizado no Firebase, ou as regras do Firestore bloqueiam a leitura.");
        } else {
          setAuthError("Erro ao carregar dados do servidor.");
        }
      } finally {
        setLoading(false);
      }
    };

    initApp();
    
    return () => {
      if (listenersRef.current.student) listenersRef.current.student();
      if (listenersRef.current.notices) listenersRef.current.notices();
      if (listenersRef.current.feed) listenersRef.current.feed();
    };
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
    if (!studentId) return;
    try {
      if (!primaryStudentId) setPrimaryStudentId(studentId);
      
      if (listenersRef.current.student) listenersRef.current.student();

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
      listenersRef.current.student = onSnapshot(docRef, async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data: any = { id: docSnap.id, ...docSnap.data() };
            
            setCurrentUserData(data);
            
            // Side effects safely
            try {
              checkMissing(data);
              
              if (data.plan && data.plan.includes('combo')) {
                loadDependents(data.id);
              } else {
                setDependents([]);
              }
              
              // These can run in background without blocking initial UI
              loadUserBookings(data.id);
              loadAdminAchievements();
              loadFamilyMembers(data);
            } catch (sideError) {
              console.error("Erro em efeitos colaterais:", sideError);
            }

            setLoading(false);
            initialLoadRef.current = true;
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
              setLoading(false);
            } else {
              setAuthError("Matrícula não encontrada no sistema de dados.");
              setLoading(false);
            }
          }
        } catch (snapError) {
          console.error("Erro no processamento do snapshot:", snapError);
          setAuthError("Erro ao processar dados do servidor.");
          setLoading(false);
        }
      }, (error) => {
        console.error("Erro no listener Firestore:", error);
        setAuthError("Erro de conexão com o banco de dados.");
        setLoading(false);
      });
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
        const dep = { id: docSnap.id, ...docSnap.data() };
        // @ts-expect-error some dynamic typing fields may not be present in type definition
        if(dep.titularId === titularId && dep.plan === 'dependente' && !dep.archived) {
          deps.push(dep);
        }
      });
      setDependents(deps);
    } catch (e) {
      console.error("Erro dependentes:", e);
    }
  };

  const parseDateString = (dateStr: string | Date | { toDate?: () => Date } | null | undefined) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'object' && 'toDate' in dateStr && typeof dateStr.toDate === 'function') return dateStr.toDate();
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

  const loadNotices = () => {
    try {
      if (listenersRef.current.notices) listenersRef.current.notices();
      
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'notices'));
      listenersRef.current.notices = onSnapshot(q, (snap) => {
        const fetchedNotices: any[] = [];
        const now = new Date();
        
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (parseDateString(data.date).getTime() > Date.now() - 60000 && !initialLoadRef.current) {
              sendPushNotification("Tanque Team: Novo Aviso", data.title || "Temos um recado importante no mural!");
            }
          }
        });

        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.expiresAt && parseDateString(data.expiresAt) < now) return;
          fetchedNotices.push({ id: docSnap.id, ...data });
        });
        
        fetchedNotices.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return parseDateString(b.date).getTime() - parseDateString(a.date).getTime();
        });
        setNotices(fetchedNotices);

        // Check for unread notices
        if (fetchedNotices.length > 0) {
          const lastViewedNotices = localStorage.getItem('lastViewedNotices');
          const latestNoticeDate = parseDateString(fetchedNotices[0].date).getTime();
          if (!lastViewedNotices || parseInt(lastViewedNotices) < latestNoticeDate) {
            setHasUnreadNotices(true);
          }
        }
      });
    } catch (e) {
      console.error("Erro ao carregar avisos:", e);
    }
  };

  const checkUnreadFeed = () => {
    try {
      if (listenersRef.current.feed) listenersRef.current.feed();

      const now = new Date().toISOString();
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), where('expiresAt', '>', now));
      listenersRef.current.feed = onSnapshot(q, (snap) => {
        let latestPostTime = 0;
        
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.studentId !== currentUserData?.id && parseDateString(data.timestamp).getTime() > Date.now() - 60000 && !initialLoadRef.current) {
               const posterName = currentUserData?.role === 'admin' ? (data.studentFullName || data.studentName) : data.studentName;
               sendPushNotification("Nova Conquista na Equipe!", `${posterName} compartilhou no feed.`);
            }
          }
        });

        snap.forEach(doc => {
          const data = doc.data();
          const postTime = parseDateString(data.timestamp).getTime();
          if (postTime > latestPostTime) latestPostTime = postTime;
        });

        if (latestPostTime > 0) {
          const lastViewedFeed = localStorage.getItem('lastViewedFeed');
          if (!lastViewedFeed || parseInt(lastViewedFeed) < latestPostTime) {
            setHasUnreadFeed(true);
          }
        }
      });
    } catch (e) {
      console.error("Erro ao verificar feed:", e);
    }
  };

  const loadUserBookings = (studentId: string) => {
    try {
      if (listenersRef.current.bookings) listenersRef.current.bookings();
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'bookings'),
        where('studentId', '==', studentId)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        const fetched: any[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          // Filtrar agendamentos futuros ou de hoje
          if (data.date >= todayStr) {
            fetched.push({ id: docSnap.id, ...data });
          }
        });
        
        fetched.sort((a, b) => a.date.localeCompare(b.date) || (a.classTime || "").localeCompare(b.classTime || ""));
        setUserBookings(fetched.slice(0, 3));
        setBookingsLoading(false);
      }, (err) => {
        console.error("Erro no onSnapshot de agendamentos:", err);
        setBookingsLoading(false);
      });

      listenersRef.current.bookings = unsub;
    } catch (e) {
      console.error("Erro ao configurar listener de agendamentos:", e);
    }
  };

  const loadAdminAchievements = () => {
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'adminAchievements'), (snap) => {
      const achs: any[] = [];
      snap.forEach(doc => achs.push({ id: doc.id, ...doc.data() }));
      setAdminAchievements(achs);
    });
  };

  const loadFamilyMembers = async (userData: any) => {
    try {
      if (!userData?.id) return;
      const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
      const members: any[] = [];

      // 1. Procura por dependentes explícitos (parentId)
      const qDeps = query(studentsRef, where('parentId', '==', userData.id));
      const snapDeps = await getDocs(qDeps);
      snapDeps.forEach(doc => members.push({ id: doc.id, ...doc.data() }));

      // 2. Procura por perfis com o mesmo e-mail (para gerenciamento múltiplo)
      if (userData.email) {
        const qEmail = query(studentsRef, where('email', '==', userData.email));
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach(doc => {
          const d = { id: doc.id, ...doc.data() };
          if (d.id !== userData.id && !members.find(m => m.id === d.id)) {
            members.push(d);
          }
        });
      }
      
      // 3. Se este usuário tiver um pai, busca o pai e irmãos
      if (userData.parentId && typeof userData.parentId === 'string') {
        const parentDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', userData.parentId));
        if (parentDoc.exists()) {
          const parentData = { id: parentDoc.id, ...parentDoc.data() };
          if (!members.find(m => m.id === parentData.id)) members.push(parentData);
          
          const qSiblings = query(studentsRef, where('parentId', '==', userData.parentId));
          const snapSiblings = await getDocs(qSiblings);
          snapSiblings.forEach(doc => {
            const d = { id: doc.id, ...doc.data() };
            if (d.id !== userData.id && !members.find(m => m.id === d.id)) members.push(d);
          });
        }
      }
      
      setFamilyMembers(members);
    } catch (e) {
      console.error("Erro ao carregar família:", e);
    }
  };

  const checkTodayBirthdays = async (appId: string) => {
    try {
      // Check for birthdays periodically removed as per user request
    } catch (e) {
      // Silence or log error
    }
  };

  const switchProfile = (newProfile: any) => {
    setIsProfileSwitcherOpen(false);
    setLoading(true);
    loadStudentData(newProfile.id);
    showAlert("Sucesso", `Perfil alternado para ${newProfile.nickname || newProfile.name}`, "success");
    // Recarregar dados específicos que não estão no snapshot de student se houver
    loadUserBookings(newProfile.id);
  };

  // Unified Student XP Calculation
  // Unified XP calculation logic
  const xpPerClass = 50;

  const getUnifiedHistory = (student: any, customAchievements: any[]) => {
    if (!student) return [];
    let history: any[] = [];
    
    // 1. Attendance (50 XP each)
    if (Array.isArray(student.attendance)) {
      student.attendance.forEach((date: any) => {
        if (typeof date !== 'string') return;
        history.push({
          date,
          amount: xpPerClass,
          reason: 'Treino Realizado',
          type: 'attendance'
        });
      });
    }

    // 2. Extra XP & Manual Achievement Logs
    if (Array.isArray(student.xpLog)) {
      student.xpLog.forEach((log: any) => {
        if (log && typeof log === 'object') history.push(log);
      });
    }

    // 3. Social XP (Summary if not logged individually)
    if (Number(student.socialXP) > 0 && !history.some(h => h.reason.includes('XP Social'))) {
      history.push({
        date: new Date().toISOString(),
        amount: Number(student.socialXP),
        reason: 'XP Social Acumulado',
        type: 'social'
      });
    }

    // 4. Badges & Achievements (On-the-fly calculated from calculateStudentXP logic)
    const attendance = Array.isArray(student.attendance) ? student.attendance : [];
    const totalAttCount = attendance.length;
    
    // System Badges mapping (simplified for history)
    const systemBadges = [
      { id: 'first_class', earned: totalAttCount >= 1, name: "Primeiro Treino", xp: 100 },
      { id: 'beginner', earned: totalAttCount >= 12, name: "Iniciante", xp: 200 },
      { id: 'streak_5', earned: totalAttCount >= 5, name: "Sequência Quente", xp: 150 },
      { id: 'warrior', earned: totalAttCount >= 50, name: "Guerreiro", xp: 500 },
      { id: 'centurion', earned: totalAttCount >= 100, name: "Centurião", xp: 1000 },
      { id: 'casca_grossa', earned: totalAttCount >= 200, name: "Casca Grossa", xp: 2000 },
      { id: 'mestre', earned: totalAttCount >= 500, name: "Mestre dos Tatames", xp: 5000 },
    ];

    systemBadges.forEach(b => {
      if (b.earned) {
        history.push({
          date: student.attendance?.[b.id === 'first_class' ? 0 : 
                       b.id === 'beginner' ? 11 : 
                       b.id === 'streak_5' ? 4 : 
                       b.id === 'warrior' ? 49 : 
                       b.id === 'centurion' ? 99 : 
                       b.id === 'casca_grossa' ? 199 : 
                       b.id === 'mestre' ? 499 : 0] || '',
          amount: b.xp,
          reason: `Conquista: ${b.name}`,
          type: 'achievement'
        });
      }
    });

    // Custom achievements
    if (student.achievements && Array.isArray(student.achievements)) {
      student.achievements.forEach((id: string) => {
        const customAch = customAchievements.find(a => a.id === id);
        if (customAch) {
          history.push({
            date: '', // No date available usually
            amount: Number(customAch.xpBonus) || 200,
            reason: `Conquista: ${customAch.name}`,
            type: 'achievement'
          });
        }
      });
    }

    // 5. Progress Log (Graduations)
    if (Array.isArray(student.progressLog)) {
      student.progressLog.forEach((log: any) => {
        if (log && log.type === 'graduation' && !log.isInitialRank) {
           const isDegree = typeof log.text === 'string' && log.text.match(/[1-9]º Grau/);
           history.push({
             date: log.date || '',
             amount: isDegree ? 250 : 500,
             reason: `Graduação: ${log.text || 'Nível'}`,
             type: 'graduation'
           });
        }
      });
    }

    return history.sort((a, b) => {
      const parseDate = (d: any) => {
        if (!d || typeof d !== 'string') return 0;
        if (d.includes('/')) {
          const p = d.split('/');
          return new Date(`${p[2]}-${p[0] === '0' ? p[1] : p[1]}-${p[0]}T12:00:00`).getTime();
        }
        return new Date(d.includes('T') ? d : `${d}T12:00:00`).getTime();
      };
      const res = parseDate(b.date) - parseDate(a.date);
      return res;
    }).slice(0, 10);
  };

  const calculateStudentXP = useCallback((student: any, rankingBonus: number = 0) => {
    if (!student) return 0;
    
    const attendance = Array.isArray(student.attendance) ? student.attendance : [];
    const totalAttCount = attendance.length;

    // Use totalAttCount * 50 as base
    const attendanceXP = totalAttCount * 50;

    // Calculate month count for specific badges
    const now = new Date();
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();
    let monthCount = 0;
    attendance.forEach((d: any) => {
      if (typeof d !== 'string') return;
      const dateObj = new Date(d + 'T12:00:00');
      if (!isNaN(dateObj.getTime()) && dateObj.getMonth() === currMonth && dateObj.getFullYear() === currYear) monthCount++;
    });

    const hasPosted = !!(student.feedPosts && student.feedPosts > 0);
    const isWeekendWarrior = attendance.some((d: any) => {
      if (typeof d !== 'string') return false;
      const dateObj = new Date(d + 'T12:00:00');
      if (isNaN(dateObj.getTime())) return false;
      const day = dateObj.getDay();
      return day === 0 || day === 6;
    });
    
    // Calculate Streak (Weekly)
    let streakWeeks = 0;
    if (attendance.length > 0) {
      const sortedDates = [...attendance].filter(d => typeof d === 'string').sort();
      const attendanceWeeks = new Set();
      sortedDates.forEach(d => {
        const date = new Date(d + 'T12:00:00');
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const week = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        attendanceWeeks.add(`${date.getFullYear()}-W${week}`);
      });
      streakWeeks = attendanceWeeks.size;
    }
    
    const streakMultiplier = Math.min(1.25, 1 + (Math.floor(streakWeeks / 4) * 0.05));

    // Graduation Rewards
    const graduationXP = 0;
    // Removed XP for graduations per user request

    // System Badges
    const badgeXP = [
      { id: 'first_class', earned: totalAttCount >= 1, xpBonus: 100 },
      { id: 'beginner', earned: totalAttCount >= 12, xpBonus: 200 },
      { id: 'monthly_focus', earned: monthCount >= 20, xpBonus: 300 },
      { id: 'streak_5', earned: totalAttCount >= 5, xpBonus: 150 }, 
      { id: 'weekend_warrior', earned: isWeekendWarrior, xpBonus: 150 },
      { id: 'warrior', earned: totalAttCount >= 50, xpBonus: 500 },
      { id: 'centurion', earned: totalAttCount >= 100, xpBonus: 1000 },
      { id: 'casca_grossa', earned: totalAttCount >= 200, xpBonus: 2000 },
      { id: 'mestre', earned: totalAttCount >= 500, xpBonus: 5000 },
      { id: 'rato_tatame', earned: monthCount >= 25, xpBonus: 500 },
    ].filter(b => b.earned).reduce((sum, b) => sum + b.xpBonus, 0);

    // Custom & Ranking Badges
    let customAchXP = 0;
    const rankingBadgeValues: Record<string, number> = {
      'rank_1': 1000, 'rank_2': 800, 'rank_3': 600, 'rank_4': 400, 'rank_5': 200
    };
    
    if (student.achievements && Array.isArray(student.achievements)) {
      student.achievements.forEach((id: string) => {
        if (rankingBadgeValues[id]) {
          customAchXP += rankingBadgeValues[id];
        } else {
          // Find in adminAchievements if available
          const customAch = adminAchievements.find(a => a.id === id);
          if (customAch) {
            customAchXP += (Number(customAch.xpBonus) || 0);
          }
        }
      });
    }

    // Social XP from local storage/state (since we don't store it in DB yet, let's rely on student.extraXP for now)
    // In a real app we'd have a socialXP field.
    const socialXP = Number(student.socialXP) || 0;

    const totalCalculated = (Number(student.extraXP) || 0) + attendanceXP + badgeXP + graduationXP + customAchXP + socialXP;
    return Math.floor(totalCalculated * streakMultiplier) + rankingBonus;
  }, [adminAchievements]);

  const loadRanking = useCallback(() => {
    if (!appId) return;
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const lastMonth = lastMonthDate.getMonth();
      const lastYear = lastMonthDate.getFullYear();
      
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      return onSnapshot(q, (snap) => {
        const rankAdulto: any[] = [];
        const rankInfantil: any[] = [];
        const rankXpAdulto: any[] = [];
        const rankXpInfantil: any[] = [];
        const rankSocialAdulto: any[] = [];
        const rankAdultoLastMonth: any[] = [];
        const rankInfantilLastMonth: any[] = [];

        snap.forEach(docSnap => {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          if(data.archived || data.enrollmentStatus === 'Inativo') return;
          
          let monthCount = 0;
          let lastMonthCount = 0;
          if(data.attendance && data.attendance.length > 0) {
            data.attendance.forEach((d: string) => {
              const dateObj = new Date(d + 'T12:00:00');
              if(dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) monthCount++;
              if(dateObj.getMonth() === lastMonth && dateObj.getFullYear() === lastYear) lastMonthCount++;
            });
          }

          const xp = calculateStudentXP(data);
          const level = Math.floor(Math.sqrt(xp / 100)) + 1;

          const studentItem = { 
            id: docSnap.id,
            name: data.name || 'Aluno', 
            nickname: data.nickname || '', 
            belt: data.belt || 'Faixa Branca', 
            classes: monthCount,
            lastMonthClasses: lastMonthCount,
            xp: xp,
            socialXP: data.socialXP || 0,
            level: level,
            photoBase64: data.photoBase64 || null
          };

          const planStr = (data.plan || '').toLowerCase();
          const isAdultPlan = planStr.includes('adulto');
          const isItalo = (data.name || '').toUpperCase().includes("ITALO DOS ANJOS SALES");
          const isKids = ((planStr.includes('infantil') || planStr.includes('kids')) && !isAdultPlan) || isItalo;
          
          if (isKids) {
            if (monthCount > 0) rankInfantil.push({...studentItem});
            if (lastMonthCount > 0) rankInfantilLastMonth.push({...studentItem, classes: lastMonthCount});
            rankXpInfantil.push(studentItem);
          } else {
            if (monthCount > 0) rankAdulto.push({...studentItem});
            if (lastMonthCount > 0) rankAdultoLastMonth.push({...studentItem, classes: lastMonthCount});
            rankXpAdulto.push(studentItem);
            if ((data.socialXP || 0) > 0) rankSocialAdulto.push(studentItem);
          }
        });

        rankAdulto.sort((a,b) => b.classes - a.classes);
        rankInfantil.sort((a,b) => b.classes - a.classes);
        rankAdultoLastMonth.sort((a,b) => b.classes - a.classes);
        rankInfantilLastMonth.sort((a,b) => b.classes - a.classes);
        rankXpAdulto.sort((a,b) => b.xp - a.xp);
        rankXpInfantil.sort((a,b) => b.xp - a.xp);
        rankSocialAdulto.sort((a,b) => b.socialXP - a.socialXP);

        setRankingAdulto(rankAdulto.slice(0, 10));
        setRankingInfantil(rankInfantil.slice(0, 10));
        setLastMonthRankingAdulto(rankAdultoLastMonth.slice(0, 5));
        setLastMonthRankingInfantil(rankInfantilLastMonth.slice(0, 5));
        setRankingXpAdulto(rankXpAdulto.slice(0, 20));
        setRankingXpInfantil(rankXpInfantil.slice(0, 20));
        setRankingSocialAdulto(rankSocialAdulto.slice(0, 10));
      });
    } catch(e) { console.error("Ranking error:", e); }
  }, [appId, calculateStudentXP]);

  const awardSocialXP = async (amount: number, reason: string) => {
    if (!currentUserData || !appId) return;
    
    // Check for daily cap to prevent spam (e.g. 50 XP per day)
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `socialXP_cap_${currentUserData.id}_${today}`;
    const dailyEarned = Number(localStorage.getItem(dailyKey)) || 0;
    
    if (dailyEarned >= 50) return; // Cap reached

    try {
      const studentId = viewingDependentId || currentUserData.id;
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
      
      const xpLogEntry = {
        date: new Date().toISOString(),
        amount: amount,
        reason: reason,
        type: 'social'
      };

      const currentXpLog = activeUserData?.xpLog || [];
      const newXpLog = [...currentXpLog, xpLogEntry].slice(-10);

      await updateDoc(ref, {
        socialXP: increment(amount),
        xpLog: newXpLog
      });
      
      localStorage.setItem(dailyKey, (dailyEarned + amount).toString());
      
      // Also update local state for immediate feedback
      if (viewingDependentId) {
        setDependents(prev => prev.map(d => d.id === viewingDependentId ? { 
          ...d, 
          socialXP: (d.socialXP || 0) + amount,
          xpLog: newXpLog
        } : d));
      } else {
        setCurrentUserData((prev: any) => ({ 
          ...prev, 
          socialXP: (prev.socialXP || 0) + amount,
          xpLog: newXpLog
        }));
      }
      
      // Handle Quest progress for Social Quests
      if (reason.toLowerCase().includes('curtida')) {
        updateQuestProgress('social_likes', 1);
      } else if (reason.toLowerCase().includes('comentário')) {
        updateQuestProgress('social_comments', 1);
      }

    } catch (e) {
      console.error("Erro ao conceder social XP:", e);
    }
  };

  const updateQuestProgress = async (type: string, amount: number) => {
    if (!currentUserData || !appId) return;
    const studentId = viewingDependentId || currentUserData.id;
    const questData = currentUserData.questProgress || {};
    
    const newProgress = (questData[type] || 0) + amount;
    
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
      const updates: any = {
        [`questProgress.${type}`]: newProgress
      };

      // Check if any quest of this type is completed
      // We look at WEEKLY_QUESTS and check if newProgress just hit the goal
      const questsToComplete = WEEKLY_QUESTS.filter(q => q.type === type && newProgress >= q.goal && (questData[type] || 0) < q.goal);
      
      if (questsToComplete.length > 0) {
        const currentXpLog = activeUserData?.xpLog || [];
        let newXpLog = [...currentXpLog];
        
        questsToComplete.forEach(q => {
          const xpEntry = {
            date: new Date().toISOString(),
            amount: q.xp,
            reason: `Missão: ${q.title}`,
            type: 'quest'
          };
          
          newXpLog.push(xpEntry);
          newXpLog = newXpLog.slice(-10);
          updates.extraXP = increment(q.xp);
          updates.xpLog = newXpLog;
          
          // Show alert for quest completion
          showAlert("Missão Concluída!", `Você completou '${q.title}' e ganhou ${q.xp} XP!`, "success");
        });

        updates.xpLog = newXpLog.slice(-10);
      }

      await updateDoc(ref, updates);
      
      if (viewingDependentId) {
        setDependents(prev => prev.map(d => d.id === viewingDependentId ? { 
          ...d, 
          questProgress: { ...questData, [type]: newProgress },
          extraXP: (d.extraXP || 0) + questsToComplete.reduce((sum, q) => sum + q.xp, 0)
        } : d));
      } else {
        setCurrentUserData((prev: any) => ({ 
          ...prev, 
          questProgress: { ...questData, [type]: newProgress },
          extraXP: (prev.extraXP || 0) + questsToComplete.reduce((sum, q) => sum + q.xp, 0)
        }));
      }
    } catch (e) {
      console.error("Error updating progress:", e);
    }
  };

  const switchToDependent = async (depId: string) => {
    setViewingDependentId(depId);
    await loadStudentData(depId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkMissing = (userData: any) => {
    if (!userData || !userData.attendance || userData.attendance.length === 0) return;
    const lastClassDate = new Date(userData.attendance[userData.attendance.length - 1] + 'T12:00:00');
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastClassDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 7) {
      const lastMissingPush = localStorage.getItem(`missing_push_${userData.id}`);
      const weekStr = `${today.getFullYear()}_W${Math.floor(today.getTime() / (1000 * 60 * 60 * 24 * 7))}`;
      if (lastMissingPush !== weekStr) {
        localStorage.setItem(`missing_push_${userData.id}`, weekStr);
        // sendPushNotification is already empty or disabled
        // Removed pushEnabled check
        sendPushNotification("O tatame está chamando! 🥋", "Sentimos sua falta nos treinos dessa semana. Que tal vir treinar hoje?");
      }
    }
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

  // XP e Nível

  // Bônus de XP por Ranking (Top 5 Presença Mensal)
  const getRankingBonus = () => {
    if (!activeUserData || !Array.isArray(rankingAdulto) || !Array.isArray(rankingInfantil)) return 0;
    const isAdult = !(activeUserData.plan || '').toLowerCase().includes('infantil');
    const targetRank = isAdult ? rankingAdulto : rankingInfantil;
    const studentId = activeUserData.id || auth.currentUser?.uid;
    const position = targetRank.findIndex((s: any) => s.id === studentId);
    if (position === -1 || position >= 5) return 0;
    return (5 - position) * 200;
  };

  const rankingBonusXP = getRankingBonus();
  
  const computeMonthAttCount = () => {
    if (!activeUserData) return 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let count = 0;
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (activeUserData.attendance?.includes(dateStr)) count++;
    }
    return count;
  };

  const currentMonthAttCount = computeMonthAttCount();

  const computeAchievementsList = (userData: any, attCount: number, monthCount: number) => {
    if (!userData) return [];
    
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    const attendance = Array.isArray(userData.attendance) ? userData.attendance : [];
    
    if (attendance.length > 0) {
      try {
        const sortedDates = [...attendance].sort();
        let prevDate: Date | null = null;
        for (const d of sortedDates) {
          if (typeof d !== 'string') continue;
          const dateObj = new Date(d + 'T12:00:00');
          if (isNaN(dateObj.getTime())) continue;
          
          if (!prevDate) {
            currentConsecutive = 1;
            maxConsecutive = 1;
          } else {
            const diffDays = Math.round((dateObj.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              currentConsecutive++;
              if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
            } else if (diffDays > 1) {
              currentConsecutive = 1;
            }
          }
          prevDate = dateObj;
        }
      } catch (e) {
        console.error("Erro no cálculo de sequência:", e);
      }
    }

    let earnedNewBelt = false;
    let earnedDegree = false;
    const progressLog = Array.isArray(userData.progressLog) ? userData.progressLog : [];
    
    let graduatedToBlackBelt = false;
    
    // Achievement logic: only grad records strictly after this date will count
    const LOCK_DATE = new Date('2026-05-09T00:00:00').getTime();
    
    for (const log of progressLog) {
      if (log.type === 'graduation' && !log.isInitialRank) {
        // Only count if it's a NEW graduation record (date > LOCK_DATE)
        const logDate = parseDateString(log.date).getTime();
        if (logDate >= LOCK_DATE) {
          if (log.text && log.text.match(/[1-9]º Grau/)) {
            earnedDegree = true;
          } else {
            earnedNewBelt = true;
            if (log.text && log.text.toLowerCase().includes("preta")) {
              graduatedToBlackBelt = true;
            }
          }
        }
      }
    }
    
    const hasPosted = !!(userData.feedPosts && userData.feedPosts > 0);
    const isWeekendWarrior = attendance.some((d: string) => {
      if (typeof d !== 'string') return false;
      const day = new Date(d + 'T12:00:00').getDay();
      return day === 0 || day === 6;
    });
    const isBlackBelt = userData.belt && userData.belt.toLowerCase().includes("preta");
    
    // Ranking Achievements (Based on last month)
    const isAdult = !(userData.plan || '').toLowerCase().includes('infantil');
    const targetLastMonthRank = isAdult ? lastMonthRankingAdulto : lastMonthRankingInfantil;
    const lastMonthPos = targetLastMonthRank.findIndex(s => s.id === (userData.id || auth.currentUser?.uid));

    const possibleBadges = [
      { id: 'first_class', name: "Primeiro Treino", desc: "Suor e dedicação no primeiro dia.", icon: <Star className="w-5 h-5 text-yellow-500" />, iconName: 'Star', earned: attCount >= 1, xpBonus: 100 },
      { id: 'beginner', name: "Iniciante", desc: "Frequência inicial: 12 treinos concluídos.", icon: <Medal className="w-5 h-5 text-gray-400" />, iconName: 'Medal', earned: attCount >= 12, xpBonus: 200 },
      { id: 'monthly_focus', name: "Foco Mensal", desc: "Frequência de elite: 20 treinos no mês.", icon: <Target className="w-5 h-5 text-red-500" />, iconName: 'Target', earned: monthCount >= 20, xpBonus: 300 },
      { id: 'streak_5', name: "Sequência Quente", desc: "5 dias consecutivos treinando.", icon: <Flame className="w-5 h-5 text-red-500" />, iconName: 'Flame', earned: maxConsecutive >= 5, xpBonus: 250 },
      { id: 'weekend_warrior', name: "Fim de Semana", desc: "Mostrou que sábado/domingo também é dia.", icon: <Sun className="w-5 h-5 text-yellow-400" />, iconName: 'Sun', earned: isWeekendWarrior, xpBonus: 150 },
      { id: 'degree', name: "Evolução", desc: "Ganhou um novo grau na faixa.", icon: <ArrowUpCircle className="w-5 h-5 text-yellow-600" />, iconName: 'ArrowUpCircle', earned: earnedDegree, xpBonus: 250 },
      { id: 'new_belt', name: "Nova Faixa", desc: "Avançou para uma nova graduação.", icon: <Medal className="w-5 h-5 text-brand-red" />, iconName: 'Medal', earned: earnedNewBelt, xpBonus: 500 },
      { id: 'warrior', name: "Guerreiro", desc: "50 treinos concluídos.", icon: <Medal className="w-5 h-5 text-yellow-600" />, iconName: 'Medal', earned: attCount >= 50, xpBonus: 500 },
      { id: 'centurion', name: "Centurião", desc: "100 treinos absolutos!", icon: <Flame className="w-5 h-5 text-orange-500" />, iconName: 'Flame', earned: attCount >= 100, xpBonus: 1000 },
      { id: 'casca_grossa', name: "Casca Grossa", desc: "Marca histórica de 200 treinos.", icon: <Shield className="w-5 h-5 text-stone-500" />, iconName: 'Shield', earned: attCount >= 200, xpBonus: 2000 },
      { id: 'mestre', name: "Mestre dos Tatames", desc: "Meio milhar! 500 treinos concluídos.", icon: <Crown className="w-5 h-5 text-amber-500" />, iconName: 'Crown', earned: attCount >= 500, xpBonus: 5000 },
      { id: 'rato_tatame', name: "Rato de Tatame", desc: "Consistência incrível: 25+ treinos no mês.", icon: <Zap className="w-5 h-5 text-sky-400" />, iconName: 'Zap', earned: monthCount >= 25, xpBonus: 400 },
      { id: 'black_belt', name: "A Lenda", desc: "Atingiu a faixa preta.", icon: <Crown className="w-5 h-5 text-gray-900 dark:text-gray-200" />, iconName: 'Crown', earned: graduatedToBlackBelt, xpBonus: 10000 },
      { id: 'voice_tatame', name: "Voz do Tatame", desc: "Compartilhou uma conquista no Feed.", icon: <MessageSquare className="w-5 h-5 text-indigo-400" />, iconName: 'MessageSquare', earned: hasPosted, xpBonus: 100 },
      // Ranking Achievements
      { id: 'rank_1', name: "O Campeão", desc: "Ficou em 1º lugar no ranking mensal!", icon: <Trophy className="w-5 h-5 text-yellow-400" />, iconName: 'Trophy', earned: lastMonthPos === 0, xpBonus: 1000 },
      { id: 'rank_2', name: "Vice-Campeão", desc: "Ficou em 2º lugar no ranking mensal!", icon: <Trophy className="w-5 h-5 text-gray-300" />, iconName: 'Trophy', earned: lastMonthPos === 1, xpBonus: 800 },
      { id: 'rank_3', name: "Pódio de Bronze", desc: "Ficou em 3º lugar no ranking mensal!", icon: <Trophy className="w-5 h-5 text-amber-600" />, iconName: 'Trophy', earned: lastMonthPos === 2, xpBonus: 600 },
      { id: 'rank_4', name: "Elite do Mês", desc: "Ficou em 4º lugar no ranking mensal!", icon: <Medal className="w-5 h-5 text-blue-400" />, iconName: 'Medal', earned: lastMonthPos === 3, xpBonus: 400 },
      { id: 'rank_5', name: "Top 5", desc: "Garantido no Top 5 mensal!", icon: <Medal className="w-5 h-5 text-green-400" />, iconName: 'Medal', earned: lastMonthPos === 4, xpBonus: 200 },
    ];

    const ICON_MAP_LOCAL: Record<string, any> = {
      'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Target': Target, 'Target-Red': Target,
      'Flame': Flame, 'Sun': Sun, 'MessageSquare': MessageSquare, 'Award': Award, 
      'Shield': Shield, 'Crown': Crown, 'Zap': Zap, 'ArrowUpCircle': ArrowUpCircle,
      'CheckCircle': CheckCircle, 'Users': Users, 'Calendar': Calendar, 'Heart': Target
    };

    const studentAchievements = Array.isArray(userData.achievements) ? userData.achievements : [];
    
    // Manual achievements - filter out those that are already in possibleBadges to avoid duplicates
    const earnedManual = adminAchievements
      .filter(ach => studentAchievements.includes(ach.id) && !possibleBadges.some(pb => pb.id === ach.id))
      .map(ach => {
        const IconBase = (ach.iconName && ICON_MAP_LOCAL[ach.iconName]) || Trophy;
        return {
          id: ach.id,
          name: ach.name,
          desc: ach.desc || ach.description, // Support both field names for safety
          icon: <IconBase className="w-5 h-5 text-brand-red" />,
          earned: true,
          xpBonus: ach.xpBonus || 200
        };
      });

    const allBadges = [...possibleBadges, ...earnedManual];
    // Sort badges: earned ones first, then by xpBonus descending
    return allBadges.sort((a, b) => {
      if (a.earned && !b.earned) return -1;
      if (!a.earned && b.earned) return 1;
      return (b.xpBonus || 0) - (a.xpBonus || 0);
    });
  };

  const earnedBadges = computeAchievementsList(activeUserData, totalAtt, currentMonthAttCount);
  const userXP = activeUserData ? calculateStudentXP(activeUserData, rankingBonusXP) : 0;
  const userLevel = Math.floor(Math.sqrt(userXP / 100)) + 1;
  const firstName = activeUserData ? (activeUserData.nickname || activeUserData.name || "Aluno").split(' ')[0] : "Aluno";
  const xpForNextLevel = Math.max(1, Math.pow(userLevel, 2) * 100);
  const progress = Math.min(100, Math.max(0, (userXP / xpForNextLevel) * 100));

  const calendarDaysList = [];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  if (activeUserData) {
    try {
      const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
      const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
      
      for (let i = 0; i < firstDay; i++) {
          calendarDaysList.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isPresent = Array.isArray(activeUserData.attendance) && activeUserData.attendance.includes(dateStr);
        
        calendarDaysList.push(
          <div key={`day-${i}`} className={`calendar-day ${isPresent ? 'present' : 'bg-gray-50 dark:bg-gray-700/50 shadow-sm'}`}>
            {i}
          </div>
        );
      }
    } catch (e) {
      console.error("Erro ao gerar calendário:", e);
    }
  }

  const isInfantilPlan = (activeUserData?.plan || '').toLowerCase().includes('infantil');
  const displayRanking = isInfantilPlan ? rankingInfantil : rankingAdulto;
  const recentGrad = activeUserData ? checkForRecentGraduation(activeUserData.progressLog, activeUserData.belt || "Faixa Branca - 0º Grau") : null;

  // Level effects moved to top

  // Watch for rank/level changes
  useEffect(() => {
    if (!appId || !db) return;
    const unsub = loadRanking();
    return () => { if (unsub) unsub(); };
  }, [appId, loadRanking]);

  useEffect(() => {
    if (!activeUserData || !db || !appId) return;
    const userXP = calculateStudentXP(activeUserData);
    const userLevel = Math.floor(Math.sqrt(userXP / 100)) + 1;
    
    // Reset reference level silently if we switched users
    if (activeUserData.id !== lastViewedIdRef.current) {
      setPrevLevel(userLevel);
      lastViewedIdRef.current = activeUserData.id;
      return;
    }

    if (userLevel > prevLevel && prevLevel > 0) {
      setShowLevelUp(true);
      setPrevLevel(userLevel);
      
      const firstName = (activeUserData.nickname || activeUserData.name || "Guerreiro").split(' ')[0];
      showAlert("⚡ LEVEL UP! ⚡", `Parabéns, ${firstName}! Você atingiu o Nível ${userLevel}!`, 'success');
      
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(err => console.debug("Audio play failed:", err));
      } catch (e) {
        console.debug("Audio initialization failed:", e);
      }
      
      confetti({
        particleCount: 150, spread: 70, origin: { y: 0.6 },
        colors: ['#EF4444', '#000000', '#FFFFFF']
      });
    } else if (userLevel < prevLevel && userLevel > 0) {
       setPrevLevel(userLevel);
    }
  }, [activeUserData?.attendance?.length, activeUserData?.id, appId]);

  if (authError) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 text-white p-4 text-center" role="alert">
        <Lock className="w-12 h-12 mb-4 text-brand-red" aria-hidden="true" />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-gray-300 mb-6">{authError}</p>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            localStorage.removeItem('tanque_user_session');
            setAuthError(null);
            window.location.href = 'https://www.tanqueteambjj.com.br/login.html';
          }} 
          className="px-6 py-2 bg-brand-red rounded hover:bg-red-700 transition font-bold shadow-lg"
          aria-label="Ir para a página de login"
        >
          Ir para Login
        </motion.button>
      </div>
    );
  }

  if (showLogin) {
    return <Login onLoginSuccess={() => {
      setShowLogin(false);
      setLoading(true);
      window.location.reload();
    }} />;
  }

  if (loading || !currentUserData) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-brand-dark"
      >
        <div className="text-center p-8 bg-white/50 dark:bg-brand-dark/50 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="rounded-full border-4 border-t-4 border-gray-200 border-t-brand-red h-12 w-12 mb-4 mx-auto"
          />
          <motion.h2 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-gray-900 dark:text-white font-display text-xl uppercase tracking-widest"
          >
            A CARREGAR DOJO...
          </motion.h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 font-medium">Sincronizando tatame...</p>
        </div>
      </motion.div>
    );
  }

  const LevelUpOverlay = () => (
    <AnimatePresence>
      {showLevelUp && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: -100 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none"
        >
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-brand-red p-1 rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.5)]">
            <div className="bg-white dark:bg-gray-900 px-10 py-8 rounded-[1.4rem] flex flex-col items-center text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <Trophy className="w-20 h-20 text-yellow-500 mb-4" />
              </motion.div>
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 uppercase italic tracking-tighter">LEVEL UP!</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm mt-1">Você subiu para o nível</p>
              <div className="text-6xl font-black text-brand-dark dark:text-white mt-2">{userLevel}</div>
              <div className="mt-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                  >
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          {/* Partículas simples (opcional) */}
          <div className="absolute inset-0 overflow-hidden">
             {[...Array(20)].map((_, i) => (
               <motion.div
                 key={i}
                 className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                 initial={{ 
                   x: "50%", 
                   y: "50%",
                   opacity: 1
                 }}
                 animate={{ 
                   x: `${Math.random() * 100}%`, 
                   y: `${Math.random() * 100}%`,
                   opacity: 0,
                   scale: Math.random() * 2
                 }}
                 transition={{ duration: 2, ease: "easeOut" }}
               />
             ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex h-screen overflow-hidden relative w-full bg-gray-50 dark:bg-brand-dark text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <LevelUpOverlay />
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <Sidebar 
        view={view} 
        setView={(v: string) => { 
          setView(v); 
          setIsMobileMenuOpen(false); 
          if (v === 'feed') {
            setHasUnreadFeed(false);
            localStorage.setItem('lastViewedFeed', Date.now().toString());
          } else if (v === 'dashboard') {
            setHasUnreadNotices(false);
            localStorage.setItem('lastViewedNotices', Date.now().toString());
          }
        }} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        toggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        handleLogout={handleLogout}
        hasUnreadFeed={hasUnreadFeed}
        hasUnreadNotices={hasUnreadNotices}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-brand-dark border-b border-gray-800 text-white p-4 flex justify-between items-center shadow-md z-20 no-print shrink-0" role="banner">
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="text-white hover:text-brand-red focus:outline-none transition relative p-1"
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
              {(hasUnreadFeed || hasUnreadNotices) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-brand-dark" aria-label="Notificações não lidas"></span>
              )}
            </motion.button>
            <div className="flex items-center">
              <div className="relative h-8 w-8 mr-2 shrink-0">
                <img src="https://iili.io/qC543c7.png" loading="lazy" className="w-full h-full object-contain" alt="Logo Tanque Team" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">TANQUE TEAM</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme} 
              className="text-yellow-400 hover:text-yellow-300 focus:outline-none transition p-2 rounded-full hover:bg-white/5"
              aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo noturno"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout} 
              className="text-red-400 hover:text-red-500 focus:outline-none transition p-2 rounded-full hover:bg-white/5"
              aria-label="Sair do sistema"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </motion.button>
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

        {/* Impersonation Banner */}
        {impersonatedStudent && (
          <div className="bg-amber-500 text-white px-4 py-3 flex justify-between items-center shadow-lg z-[100] sticky top-0 shrink-0">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              <span className="text-sm font-bold">Modo Visualização: <strong>{impersonatedStudent.name}</strong></span>
            </div>
            <button 
              onClick={() => {
                setImpersonatedStudent(null);
                setView('admin');
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-xl text-xs font-black transition uppercase tracking-widest border border-white/30"
            >
              Sair e Voltar
            </button>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative" role="main">
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
                 {(() => {
                    const currentAura = VISUAL_TIERS.find(t => t.id === (activeUserData?.selectedVisualTier || 'none'))?.glow || '';
                    return (
                      <div className="mb-8 flex justify-between items-end">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 shadow-xl overflow-hidden flex-shrink-0 relative transition-all duration-500 unselectable ${currentAura}`}>
                            {activeUserData?.photoBase64 ? (
                              <img src={activeUserData.photoBase64} loading="lazy" className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-2xl font-bold font-display">
                                {firstName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-black tracking-[0.2em] mb-1">Bem-vindo(a) de volta,</p>
                            <div className="flex items-center gap-2">
                               <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-dark dark:text-white leading-tight">{activeUserData?.nickname || activeUserData?.name || "Aluno"}</h1>
                               <div className="relative group cursor-help">
                                 <div className="absolute -inset-1 bg-gradient-to-r from-brand-red to-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                                 <div className="relative bg-brand-red text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-xl border border-brand-red/30 italic flex items-center gap-1.5 ring-2 ring-white/20 dark:ring-black/20">
                                  <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                  Nível {userLevel}
                                </div>
                              </div>
                            </div>
                            {/* XP Progress Bar */}
                            <div className="mt-5 w-full h-6 bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-1 shadow-inner relative border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20 z-10" />
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-brand-red via-red-500 to-orange-400 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] relative group overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:30px_30px] animate-[progress-shine_2s_linear_infinite]" />
                                <motion.div 
                                  initial={{ x: '-100%' }}
                                  animate={{ x: '100%' }}
                                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2"
                                />
                              </motion.div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-black text-brand-dark dark:text-white uppercase tracking-[0.2em] mix-blend-difference opacity-50">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                  {[...Array(3)].map((_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-brand-red/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                                  ))}
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">{Math.round(progress)}% Progressão</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-display font-black text-brand-dark dark:text-white italic tracking-tighter">
                                  {userXP} <span className="text-[10px] text-gray-400 dark:text-gray-500 not-italic uppercase font-bold tracking-normal">/ {xpForNextLevel} XP</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {VISUAL_TIERS.filter(t => t.id !== 'none' && userLevel >= t.minLevel).map(t => (
                              <div key={t.id} title={`Desbloqueado: ${t.name}`} className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-md border border-yellow-500 ring-2 ring-yellow-400/20">
                                <Crown className="w-3 h-3 text-yellow-900" />
                              </div>
                            ))}
                          </div>
                          <span className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-brand-red" /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                 })()}

              {/* Check-in Button */}
              <div className="mb-8 no-print">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsQrModalOpen(true)} 
                  className="w-full bg-gradient-to-r from-brand-dark to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-xl flex items-center justify-between transition border border-gray-700 dark:border-gray-600"
                  aria-label="Abrir Carteirinha Digital para Check-in"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 bg-brand-red rounded-full flex items-center justify-center shadow-inner shrink-0">
                      <QrCode className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="block text-lg md:text-xl font-display uppercase tracking-widest text-brand-red">Carteirinha Digital</span>
                      <span className="block text-xs md:text-sm text-gray-300 dark:text-gray-400 font-normal mt-1">Toque aqui para abrir o seu QR Code e realizar o Check-in na Recepção</span>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 no-print">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsProfileSwitcherOpen(true)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-brand-red p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition"
                >
                  <Users className="w-6 h-6 text-brand-red" aria-hidden="true" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Família</span>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=E aí! Bora treinar Jiu-Jitsu na Tanque Team? 🥋🔥 Vem fazer uma aula experimental! Acesse: https://www.tanqueteambjj.com.br`, '_blank')} 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition"
                  aria-label="Convidar um amigo via WhatsApp"
                >
                  <Share2 className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base md:text-lg">Chamar um Amigo</span>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('scheduling')} 
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition"
                  aria-label="Ir para agendamento"
                >
                  <Calendar className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base md:text-lg">Novo Agendamento</span>
                </motion.button>
              </div>

              {/* Scheduling Summary */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Clock className="text-blue-500 w-5 h-5" /> Meus Próximos Treinos
                  </h3>
                  <button onClick={() => setView('scheduling')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Ver todos</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {bookingsLoading ? (
                    <div className="sm:col-span-3 p-6 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : userBookings.length === 0 ? (
                    <div className="sm:col-span-3 p-6 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">Nenhum agendamento futuro encontrado.</p>
                      <button onClick={() => setView('scheduling')} className="mt-2 text-blue-500 text-xs font-bold uppercase tracking-wider">Agendar Agora</button>
                    </div>
                  ) : (
                    userBookings.map((booking) => (
                      <div key={booking.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{booking.type || 'Treino'}</span>
                          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{booking.classTime}</span>
                        </div>
                        <div className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{booking.className || 'Jiu-Jitsu'}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> {new Date(booking.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notices */}
              {notices.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-display text-xl font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-yellow-500 w-5 h-5" /> Quadro de Avisos
                  </h3>
                  <div className="space-y-3">
                    {notices.map(notice => (
                      <div key={notice.id} className={`p-4 border rounded-xl shadow-sm animate-fade-in relative overflow-hidden ${
                        notice.pinned 
                          ? 'border-brand-red ring-1 ring-brand-red/20' 
                          : ''
                        } ${
                        notice.type === 'alert' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : notice.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : notice.type === 'danger' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                        {notice.pinned && (
                          <div className="absolute top-0 right-0 p-1">
                             <Pin size={12} className="text-brand-red fill-brand-red rotate-45" />
                          </div>
                        )}
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
                  {/* Weekly Quests */}
                  <div className="bg-gradient-to-br from-brand-dark to-gray-900 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative border-b-4 border-brand-red">
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand-red mb-1">Missões Semanais</h3>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Complete para ganhar bônus de XP</p>
                        </div>
                        <div className="bg-brand-red/20 border border-brand-red/40 px-3 py-1 rounded-full flex items-center gap-2">
                          <Target className="w-3 h-3 text-brand-red" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Temporada 01</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {WEEKLY_QUESTS.map(quest => {
                          const progressValue = activeUserData?.questProgress?.[quest.type] || 0;
                          const isDone = progressValue >= quest.goal;
                          const pct = Math.min(100, (progressValue / quest.goal) * 100);
                          
                          return (
                            <div key={quest.id} className={`p-4 rounded-xl border transition-all ${isDone ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-brand-red/20 text-brand-red border border-brand-red/30'}`}>
                                {quest.type === 'attendance' ? <Flame size={20} /> : 
                                 quest.type === 'social_likes' ? <ThumbsUp size={20} /> : 
                                 <MessageSquare size={20} />}
                              </div>
                                  <div>
                                    <h4 className={`text-xs font-black uppercase tracking-tight ${isDone ? 'text-green-400' : 'text-white'}`}>{quest.title}</h4>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{quest.desc}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[10px] font-black italic ${isDone ? 'text-green-500' : 'text-brand-red'}`}>+{quest.xp} XP</span>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1 text-gray-500">
                                  <span>{isDone ? 'CONCLUÍDO' : 'EM PROGRESSO'}</span>
                                  <span>{progressValue} / {quest.goal}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    className={`h-full ${isDone ? 'bg-green-500' : 'bg-brand-red'}`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Target className="absolute -bottom-8 -right-8 w-32 h-32 text-white/5 -rotate-12" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Belt Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-brand-red relative overflow-hidden flex flex-col justify-between">
                      {recentGrad && !recentGrad.isNewBelt && (
                        <div className="absolute top-0 left-0 w-full bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-1 z-10">
                          <span>{`⭐ PARABÉNS PELO NOVO GRAU! (${activeUserData?.belt}) ⭐`}</span>
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between items-start mb-4 mt-2">
                          <div>
                            <h3 className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">Graduação Atual</h3>
                            <p className="text-xl font-bold text-brand-dark dark:text-white mt-1">{activeUserData?.belt || "Faixa Branca - 0º Grau"}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-brand-dark dark:text-gray-300">
                            <Medal className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="w-full h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 shadow-inner overflow-hidden relative">
                          {renderBeltSVG(activeUserData?.belt || "Faixa Branca - 0º Grau")}
                        </div>
                        {recentGrad && !recentGrad.isNewBelt && (
                          <button 
                            onClick={() => handleShareBadge({
                              name: "Novo Grau",
                              desc: `Avançou para ${activeUserData?.belt}`,
                              icon: <Star className="w-5 h-5" />,
                              iconName: 'Star',
                              color: "text-yellow-600"
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
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${activeUserData?.paymentStatus === 'Pendente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : activeUserData?.paymentStatus === 'Isento' || planKey === 'dependente' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {activeUserData?.paymentStatus === 'Pendente' ? <><AlertTriangle className="w-3 h-3 mr-1" /> Pendente</> : activeUserData?.paymentStatus === 'Isento' || planKey === 'dependente' ? <><LinkIcon className="w-3 h-3 mr-1" /> Isento</> : <><CheckCircle className="w-3 h-3 mr-1" /> Em dia</>}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${activeUserData?.paymentStatus === 'Pendente' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : activeUserData?.paymentStatus === 'Isento' || planKey === 'dependente' ? 'bg-gray-50 dark:bg-gray-700 text-gray-400' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                          {activeUserData?.paymentStatus === 'Pendente' ? <X className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex flex-col gap-2 mt-1">
                          <button onClick={() => setIsHistoryModalOpen(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold flex items-center transition justify-center mt-1">
                            <Clock className="w-3 h-3 mr-1" /> Ver Histórico de Pagamentos
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Visual Tier Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">Estilo Aura</h3>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Desbloqueado por Nível</p>
                        </div>
                        <Crown className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {VISUAL_TIERS.map(tier => {
                          const isAdmin = currentUserData?.role === 'admin';
                          const isUnlocked = isAdmin || userLevel >= tier.minLevel;
                          const isSelected = (activeUserData?.selectedVisualTier || 'none') === tier.id;
                          
                          return (
                            <button
                              key={tier.id}
                              disabled={!isUnlocked}
                              onClick={async () => {
                                if (!isUnlocked) return;
                                const studentId = activeUserData?.id || currentUserData.id;
                                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
                                await updateDoc(ref, { selectedVisualTier: tier.id });
                                if (impersonatedStudent) {
                                   setImpersonatedStudent((prev: any) => prev ? { ...prev, selectedVisualTier: tier.id } : null);
                                } else if (viewingDependentId) {
                                   setDependents(prev => prev.map(d => d.id === viewingDependentId ? { ...d, selectedVisualTier: tier.id } : d));
                                } else {
                                   setCurrentUserData((prev: any) => ({ ...prev, selectedVisualTier: tier.id }));
                                }
                              }}
                              className={`p-2 rounded-lg border text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${
                                isSelected ? 'bg-yellow-400 text-yellow-900 border-yellow-500 ring-2 ring-yellow-400/50' : 
                                isUnlocked ? 'bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-yellow-400' : 
                                'bg-gray-100 dark:bg-gray-900 text-gray-400 border-transparent cursor-not-allowed grayscale'
                              }`}
                            >
                              {tier.name}
                              {!isUnlocked && <span className="text-[8px] opacity-70">Nível {tier.minLevel}</span>}
                              {isAdmin && ! (userLevel >= tier.minLevel) && <span className="text-[8px] text-brand-red font-bold">Admin Unlocked</span>}
                            </button>
                          );
                        })}
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
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => {
                          let m = currentCalendarMonth - 1; let y = currentCalendarYear;
                          if (m < 0) { m = 11; y--; }
                          setCurrentCalendarMonth(m); setCurrentCalendarYear(y);
                        }} 
                        className="w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-brand-red rounded-full transition"
                        aria-label="Mês anterior"
                      >
                        &lt;
                      </motion.button>
                      <span className="text-xs font-bold text-brand-dark dark:text-gray-200 min-w-[80px] text-center uppercase" aria-live="polite">
                        {monthNames[currentCalendarMonth].substring(0,3)}. {currentCalendarYear}
                      </span>
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => {
                          let m = currentCalendarMonth + 1; let y = currentCalendarYear;
                          if (m > 11) { m = 0; y++; }
                          setCurrentCalendarMonth(m); setCurrentCalendarYear(y);
                        }} 
                        className="w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-brand-red rounded-full transition"
                        aria-label="Próximo mês"
                      >
                        &gt;
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="mb-4 flex-grow">
                    <div className="grid grid-cols-7 mb-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="calendar-header-day dark:text-gray-500">{d}</div>)}
                    </div>
                    <div className="calendar-grid">
                      {calendarDaysList}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Total de Treinos (Mês)</span>
                      <span className="text-xl font-bold text-brand-red">{currentMonthAttCount}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Total de Treinos (Geral)</span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalAtt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ranking & Achievements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print">


                {/* Unified Activity & XP History */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-8 border-t-4 border-brand-red overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                    <div>
                      <h3 className="font-display text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2">
                        <TrendingUp className="text-brand-red w-5 h-5" /> Histórico de XP
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Atividades Recentes</p>
                    </div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {(() => {
                      const history = getUnifiedHistory(activeUserData, adminAchievements);
                      if (history.length === 0) {
                        return <div className="p-10 text-center text-gray-400 text-sm">Nenhuma atividade registrada ainda.</div>;
                      }
                      return history.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.type === 'attendance' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' :
                              item.type === 'achievement' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' :
                              item.type === 'quest' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                              item.type === 'social' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' :
                              item.type === 'graduation' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                            }`}>
                              {item.type === 'attendance' ? <Flame size={16} /> : 
                               item.type === 'achievement' ? <Trophy size={16} /> : 
                               item.type === 'quest' ? <Target size={16} /> : 
                               item.type === 'social' ? <MessageSquare size={16} /> : 
                               item.type === 'graduation' ? <Medal size={16} /> : <TrendingUp size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold dark:text-white leading-none mb-1">{item.reason}</p>
                              <p className="text-[10px] text-gray-400 font-medium">
                                {item.date && item.date.includes('-') && !item.date.includes('/') ? 
                                  format(new Date(item.date + (item.date.includes('T') ? '' : 'T12:00:00')), 'dd/MM/yyyy') : 
                                  item.date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-black ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {item.amount >= 0 ? `+${item.amount}` : item.amount} XP
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  {activeUserData?.attendance?.length > 10 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 text-center border-t border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Exibindo as últimas 10 atividades</p>
                    </div>
                  )}
                </div>

                {/* Achievements Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-yellow-500 flex flex-col h-full">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 shrink-0">
                    <h3 className="font-display text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2"><Trophy className="text-yellow-500 w-5 h-5" /> Suas Conquistas</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Medalhas Desbloqueadas</p>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto max-h-[450px]">
                    <div className="grid grid-cols-2 gap-3">
                      {earnedBadges.map((b, i) => (
                        <div 
                          key={b.id} 
                          onClick={() => {
                            if (b.earned) {
                              setSharingBadge(b);
                              setShareMessage("");
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-3 text-center rounded-lg border transition ${b.earned ? 'bg-gray-50 dark:bg-gray-700 border-brand-red/20 dark:border-red-900/30 hover:border-brand-red/50 hover:shadow-md cursor-pointer group' : 'bg-gray-100/50 dark:bg-gray-800/50 border-transparent opacity-60 grayscale'}`}>
                          <div className={`mb-2 p-2 rounded-full shadow-sm relative ${b.earned ? 'bg-white dark:bg-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            {b.icon}
                            <div className={`absolute -top-1 -right-1 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter ${b.earned ? 'bg-brand-red text-white' : 'bg-gray-300 text-gray-500'}`}>
                              +{b.xpBonus || 100}xp
                            </div>
                          </div>
                          <span className={`font-bold text-xs ${b.earned ? 'text-brand-dark dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{b.name}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight mb-2">{b.desc}</span>
                          {b.earned && (
                            <span className="text-[10px] font-bold text-brand-red mt-auto flex items-center gap-1 bg-brand-red/10 dark:bg-red-900/30 px-2.5 py-1 rounded-full"><Share2 className="w-3 h-3" /> Compartilhar</span>
                          )}
                        </div>
                      ))}
                    </div>
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
                <Feed 
                  currentUserData={currentUserData} 
                  appId={appId} 
                  showAlert={showAlert} 
                  showConfirm={showConfirm} 
                  isAdmin={isAdmin} 
                  onAwardXP={awardSocialXP}
                />
              </motion.div>
            )}

            {/* RANKING VIEW */}
            {view === 'ranking' && (
              <motion.div
                key="ranking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {(isAdmin || !(activeUserData?.plan || '').toLowerCase().includes('infantil')) && (
                      <Ranking 
                        currentUserData={activeUserData} 
                        ranking={rankingTab === 'presence' ? rankingAdulto : rankingXpAdulto} 
                        lastMonthRanking={lastMonthRankingAdulto}
                        isAdmin={isAdmin} 
                        activeTab={rankingTab}
                        onTabChange={setRankingTab}
                        title={rankingTab === 'presence' ? "Ranking Adulto / Geral" : "Mestres da Técnica (Adulto)"}
                        subtitle={rankingTab === 'presence' ? "Os 10 guerreiros que mais treinaram neste mês." : "Ranking geral de XP acumulado."}
                      />
                    )}
                    
                    {(isAdmin || (activeUserData?.plan || '').toLowerCase().includes('infantil')) && (
                      <Ranking 
                        currentUserData={activeUserData} 
                        ranking={rankingTab === 'presence' ? rankingInfantil : rankingXpInfantil} 
                        lastMonthRanking={lastMonthRankingInfantil}
                        isAdmin={isAdmin} 
                        activeTab={rankingTab}
                        onTabChange={setRankingTab}
                        title={rankingTab === 'presence' ? "Ranking Infantil" : "Pequenos Samurais (Infantil)"}
                        subtitle={rankingTab === 'presence' ? "Os 10 pequenos guerreiros que mais treinaram neste mês." : "Ranking infantil de XP acumulado."}
                      />
                    )}
                  </div>
                <RankingManual />
              </motion.div>
            )}

            {/* SCHEDULING VIEW */}
            {view === 'scheduling' && (
              <motion.div
                key="scheduling"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Scheduling currentUserData={currentUserData} appId={appId} showAlert={showAlert} />
              </motion.div>
            )}

            {/* ADMIN VIEW */}
            {view === 'admin' && isAdmin && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AdminPanel 
                  appId={appId} 
                  showAlert={showAlert} 
                  showConfirm={showConfirm} 
                  onImpersonate={(student: any) => {
                    setImpersonatedStudent(student);
                    setView('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  lastMonthRankingAdulto={lastMonthRankingAdulto}
                  lastMonthRankingInfantil={lastMonthRankingInfantil}
                />
              </motion.div>
            )}

            {/* FINANCE VIEW */}
            {view === 'finance' && currentUserData && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
              >
                <div className="mb-10 text-left">
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase leading-none tracking-tighter italic">
                    Financeiro
                  </h1>
                  <p className="text-sm font-bold text-brand-red uppercase tracking-[0.3em] mt-2">Gestão de Pagamentos</p>
                </div>
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
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-6 border-b border-gray-200 dark:border-gray-600 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center text-center md:text-left">
                    <UserCog className="mr-3 text-brand-red w-6 h-6" aria-hidden="true" />
                    <h3 className="text-gray-800 dark:text-gray-100 font-display font-bold tracking-wide text-xl uppercase">Meu Perfil</h3>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: '#c53030' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsProfileEditModalOpen(true)} 
                    className="w-full md:w-auto bg-brand-red hover:bg-red-700 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-3 border-2 border-white/20"
                    aria-label="Editar dados cadastrais"
                  >
                    <UserCog className="w-5 h-5" />
                    EDITAR MEUS DADOS
                  </motion.button>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome Completo</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.name || '--'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Apelido (Exibição)</label>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-medium shadow-sm overflow-x-auto">{currentUserData.nickname || '--'}</div>
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
        showAlert={showAlert}
        appId={appId}
      />

      <AnimatePresence>
        {isProfileSwitcherOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsProfileSwitcherOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-brand-red/10 rounded-xl">
                      <Users className="text-brand-red w-5 h-5" />
                   </div>
                   <h3 className="text-xl font-bold dark:text-white font-display uppercase tracking-tight italic">Minha Família</h3>
                </div>
                <button onClick={() => setIsProfileSwitcherOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X /></button>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-1">Perfil Ativo</div>
                
                {/* Current Active */}
                <div className="p-4 rounded-2xl bg-brand-red/10 border-2 border-brand-red flex items-center gap-3 shadow-md shadow-brand-red/5">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white dark:border-gray-800 shadow-sm shrink-0">
                    {currentUserData.photoBase64 ? <img src={currentUserData.photoBase64} className="w-full h-full object-cover" /> : <User className="p-3 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 dark:text-white uppercase truncate">{currentUserData.nickname || currentUserData.name} (Você)</p>
                    <p className="text-[10px] text-brand-red font-bold uppercase">{currentUserData.belt}</p>
                  </div>
                  <CheckCircle className="text-brand-red w-6 h-6 shrink-0" />
                </div>

                {familyMembers.length > 0 && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4 mb-1 px-1">Trocar para</div>}

                <div className="space-y-3">
                {currentUserData.id !== primaryStudentId && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const mainMember = familyMembers.find(m => m.id === primaryStudentId);
                      if (mainMember) switchProfile(mainMember);
                      else if (primaryStudentId) switchProfile({ id: primaryStudentId }); // Fallback
                    }}
                    className="w-full p-4 rounded-2xl bg-brand-red text-white flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20 font-black uppercase tracking-wider text-xs mb-4"
                  >
                    <LogOut className="w-4 h-4 rotate-180" /> Voltar ao Perfil do Titular
                  </motion.button>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {familyMembers.filter(m => m.id !== currentUserData.id).map(member => (
                    <motion.button
                      key={member.id}
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => switchProfile(member)}
                      className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 flex items-center gap-3 transition shadow-sm"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 border border-white dark:border-gray-700 shrink-0">
                        {member.photoBase64 ? <img src={member.photoBase64} className="w-full h-full object-cover" /> : <User className="p-2 text-gray-400" />}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase truncate">{member.nickname || member.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{member.belt}</p>
                        {member.id === primaryStudentId && <span className="text-[8px] bg-brand-red text-white px-1.5 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Titular</span>}
                      </div>
                      <ChevronRight className="text-gray-300 w-5 h-5 shrink-0" />
                    </motion.button>
                  ))}
                </div>

                {familyMembers.length === 0 && (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700 mt-2">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      Nenhum outro membro da família vinculado. Peça ao ADM para vincular dependentes.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setIsProfileSwitcherOpen(false)}
              className="w-full mt-6 py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-black transition"
            >
              Manter Perfil Atual
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
      
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-badge-title"
            >
              <h3 id="share-badge-title" className="font-bold text-lg mb-4 dark:text-white">Compartilhar Conquista</h3>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-center scale-125 w-8 h-8 shrink-0">
                  {sharingBadge.icon && typeof sharingBadge.icon === 'object' && 'props' in sharingBadge.icon 
                    ? sharingBadge.icon 
                    : sharingBadge.icon && typeof sharingBadge.icon === 'function' 
                      ? <sharingBadge.icon className={`w-full h-full ${sharingBadge.color || ''}`} aria-hidden="true" /> 
                      : <Trophy className="w-8 h-8 text-yellow-500" aria-hidden="true" />
                  }
                </div>
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
                aria-label="Mensagem do compartilhamento"
              />
              <div className="flex gap-2">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSharingBadge(null)} 
                  disabled={isSharing} 
                  className="flex-1 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  aria-label="Cancelar compartilhamento"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmShareBadge} 
                  disabled={isSharing} 
                  className="flex-1 py-2 rounded-xl font-bold text-white bg-brand-red hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  aria-label="Enviar para o Feed"
                >
                  {isSharing ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : "Compartilhar"}
                </motion.button>
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
        showToast={showToast}
      />

      <Toast 
        isOpen={toastState.isOpen} 
        message={toastState.message} 
        type={toastState.type} 
        onClose={() => setToastState({ ...toastState, isOpen: false })} 
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
