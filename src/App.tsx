'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import QrModal from '@/components/QrModal';
import HistoryModal from '@/components/HistoryModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import Feed from '@/components/Feed';
import Finance from '@/components/Finance';
import Ranking from '@/components/Ranking';
import Scheduling from '@/components/Scheduling';
import AdminPanel from '@/components/AdminPanel';
import { Menu, Moon, Sun, LogOut, Users, UserCog, Calendar, Medal, CheckCircle, AlertTriangle, Link as LinkIcon, Star, Share2, X, Clock, QrCode, Loader2, Bell, Lock, Flame, FileText, Trophy, Award, Zap, Shield, Crown, MessageSquare, Target, ArrowUpCircle, CreditCard, ChevronRight, Inbox } from 'lucide-react';
import { AlertDialog, ConfirmDialog, AlertType, Toast } from '@/components/CustomDialogs';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [toastState, setToastState] = useState({ isOpen: false, message: '', type: 'success' as AlertType });
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingText, setLoadingText] = useState("Iniciando...");

  const showToast = (message: string, type: AlertType = 'success') => {
    setToastState({ isOpen: true, message, type });
  };

  const [hasUnreadFeed, setHasUnreadFeed] = useState(false);
  const [hasUnreadNotices, setHasUnreadNotices] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  const listenersRef = useRef<{ notices?: any, feed?: any, student?: any, notifications?: any }>({});
  const initialLoadRef = useRef(true);

  const loadNotifications = (studentId: string) => {
    try {
      if (listenersRef.current.notifications) listenersRef.current.notifications();
      
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'notifications'),
        where('targetId', 'in', [studentId, 'all'])
      );
      
      listenersRef.current.notifications = onSnapshot(q, (snap) => {
        const fetched: any[] = [];
        snap.forEach(docSnap => {
          fetched.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        fetched.sort((a, b) => parseDateString(b.timestamp).getTime() - parseDateString(a.timestamp).getTime());
        setNotifications(fetched);
        
        const lastViewed = parseInt(localStorage.getItem(`lastViewedNotifications_${studentId}`) || '0');
        const hasUnread = fetched.some(n => parseDateString(n.timestamp).getTime() > lastViewed);
        setHasUnreadNotifications(hasUnread);

        // Notify if new notification added during session
        snap.docChanges().forEach(change => {
          if (change.type === 'added' && !initialLoadRef.current) {
             const data = change.doc.data();
             if (parseDateString(data.timestamp).getTime() > Date.now() - 60000) {
                sendPushNotification("Nova Notificação", data.title || "Você tem uma nova mensagem!");
             }
          }
        });
      });
    } catch (e) {
      console.error("Erro notifications:", e);
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
    // Check initial load safety
    setTimeout(() => { initialLoadRef.current = false; }, 3000);
  }, []);

  const sendPushNotification = (title: string, body: string) => {
    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: "https://iili.io/qC543c7.png"
      });
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showAlert("Aviso", "Seu navegador não suporta notificações push.", "info");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushEnabled(permission === 'granted');
      if (permission === 'granted') {
        new Notification("Tanque Team", {
          body: "Notificações ativadas com sucesso!",
          icon: "https://iili.io/qC543c7.png"
        });
      }
    } catch (e) {
      console.error("Erro ao solicitar permissão de notificação:", e);
    }
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
                  const planPrice = verifyData.amount || 150; // Use actual paid amount or default
                  
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
    try {
      if (listenersRef.current.student) listenersRef.current.student();

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
      listenersRef.current.student = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data: any = { id: docSnap.id, ...docSnap.data() };
          
          setCurrentUserData(data);
          
          // SIDE EFFECTS - Move out of state setter
          if (currentUserData && !initialLoadRef.current) {
            if (currentUserData.paymentStatus !== data.paymentStatus) {
              if (data.paymentStatus === 'Atrasado' || data.paymentStatus === 'Pendente') {
                sendPushNotification("Aviso Financeiro", "Seu pagamento está pendente. Regularize na aba Financeiro.");
              } else if (data.paymentStatus === 'Em dia') {
                sendPushNotification("Pagamento Confirmado", "Seu pagamento foi aprovado! Status: Em dia.");
              }
            }
          }
          
          checkBirthday(data);
          checkMissing(data);
          
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
        
        fetchedNotices.sort((a, b) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime());
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
               sendPushNotification("Nova Conquista na Equipe!", `${data.studentName} compartilhou no feed.`);
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

  const loadRanking = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const snap = await getDocs(q);
      
      const rank: any[] = [];
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

  const checkBirthday = async (userData: Record<string, any>) => {
    if (!userData || !userData.birthDate) return;
    const today = new Date();
    // birthDate is likely YYYY-MM-DD
    const birthStr = userData.birthDate;
    const parts = birthStr.split('-');
    if (parts.length === 3) {
      const bMonth = parseInt(parts[1]) - 1;
      const bDay = parseInt(parts[2]);
      if (today.getMonth() === bMonth && today.getDate() === bDay) {
        // It's their birthday! Check if we already celebrated this year
        const lastCelebration = localStorage.getItem(`birthday_celebrated_${userData.id}`);
        const currentYearStr = today.getFullYear().toString();
        if (lastCelebration !== currentYearStr) {
          localStorage.setItem(`birthday_celebrated_${userData.id}`, currentYearStr);
          const firstName = (userData.nickname || userData.name || "Aluno").split(' ')[0];
          showAlert(`🎉 **Feliz Aniversário, ${firstName}!** 🎉\nObrigado por fazer parte da nossa equipe. O tatame é melhor com você!`, 'success');

          // Share to Feed automatically
          try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), {
              timestamp: new Date().toISOString(),
              studentId: userData.id,
              studentName: userData.nickname || userData.name,
              message: "Hoje é meu aniversário! 🎉 Parabéns para mim!",
              badgeName: "Medalha de Aniversário",
              badgeDesc: "Completou mais um ano de vida e dedicação!",
              badgeIcon: "Crown",
              likes: 0,
              likedBy: [],
              comments: []
            });
          } catch { console.error("Error sharing birthday to feed:"); }
        }
      }
    }
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
        if (pushEnabled) {
          sendPushNotification("O tatame está chamando! 🥋", "Sentimos sua falta nos treinos dessa semana. Que tal vir treinar hoje?");
        }
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

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark"
      >
        <div className="text-center" role="status" aria-live="polite">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="rounded-full border-4 border-t-4 border-gray-200 border-t-brand-red h-12 w-12 mb-4 mx-auto"
          />
          <motion.h2 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-white font-display text-xl uppercase"
          >
            A CARREGAR DOJO...
          </motion.h2>
          <p className="text-gray-400 text-xs mt-2 font-medium">{loadingText}</p>
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

  if (!currentUserData) return null;

  const firstName = (currentUserData.nickname || currentUserData.name || "Aluno").split(' ')[0];
  const rawPlanKey = currentUserData.plan || 'N/A';
  // Extract base plan name if it contains " - R$"
  const basePlanName = rawPlanKey.split(' - R$')[0].trim();
  const planKey = basePlanName.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const planInfo = PLAN_DICT[planKey] || { short: basePlanName.toUpperCase(), price: undefined };
  const totalAtt = currentUserData.attendance ? currentUserData.attendance.length : 0;
  const recentGrad = checkForRecentGraduation(currentUserData.progressLog, currentUserData.belt || "Faixa Branca - 0º Grau");

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

  const computeAchievements = () => {
    if (!currentUserData) return [];
    
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    if (currentUserData.attendance && currentUserData.attendance.length > 0) {
      const sortedDates = [...currentUserData.attendance].sort();
      let prevDate: Date | null = null;
      for (const d of sortedDates) {
        const dateObj = new Date(d + 'T12:00:00');
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
    }

    let earnedNewBelt = false;
    let earnedDegree = false;
    if (currentUserData.progressLog && currentUserData.progressLog.length > 0) {
      const graduations = currentUserData.progressLog.filter((log: any) => log.type === 'graduation');
      for (const grad of graduations) {
        if (grad.text && grad.text.match(/[1-9]º Grau/)) {
          earnedDegree = true;
        } else {
          earnedNewBelt = true;
        }
      }
    }
    
    // Check if posted anything to feed
    const hasPosted = !!(currentUserData.feedPosts && currentUserData.feedPosts > 0);
    // Check if any attendance was on weekend
    const isWeekendWarrior = currentUserData.attendance && currentUserData.attendance.some((d: string) => {
      const day = new Date(d + 'T12:00:00').getDay();
      return day === 0 || day === 6;
    });
    // Check if black belt
    const isBlackBelt = currentUserData.belt && currentUserData.belt.toLowerCase().includes("preta");
    
    const possibleBadges = [
      { id: 'first_class', name: "Primeiro Treino", desc: "Suor e dedicação no primeiro dia.", icon: <Star className="w-5 h-5 text-yellow-500" />, iconName: 'Star', earned: totalAtt >= 1 },
      { id: 'beginner', name: "Iniciante", desc: "Frequência inicial: 12 treinos concluídos.", icon: <Medal className="w-5 h-5 text-gray-400" />, iconName: 'Medal', earned: totalAtt >= 12 },
      { id: 'monthly_focus', name: "Foco Mensal", desc: "Frequência de elite: 20 treinos no mês.", icon: <Target className="w-5 h-5 text-red-500" />, iconName: 'Target', earned: monthAttCount >= 20 },
      { id: 'streak_5', name: "Sequência Quente", desc: "5 dias consecutivos treinando.", icon: <Flame className="w-5 h-5 text-red-500" />, iconName: 'Flame', earned: maxConsecutive >= 5 },
      { id: 'weekend_warrior', name: "Fim de Semana", desc: "Mostrou que sábado/domingo também é dia.", icon: <Sun className="w-5 h-5 text-yellow-400" />, iconName: 'Sun', earned: isWeekendWarrior },
      { id: 'voice_tatame', name: "Voz do Tatame", desc: "Compartilhou uma conquista no Feed.", icon: <MessageSquare className="w-5 h-5 text-indigo-400" />, iconName: 'MessageSquare', earned: hasPosted },
      { id: 'degree', name: "Evolução", desc: "Ganhou um novo grau na faixa.", icon: <ArrowUpCircle className="w-5 h-5 text-yellow-600" />, iconName: 'ArrowUpCircle', earned: earnedDegree },
      { id: 'graduated', name: "Nova Faixa", desc: "Respeito no tatame (Nova Faixa).", icon: <Award className="w-5 h-5 text-purple-500" />, iconName: 'Award', earned: earnedNewBelt },
      { id: 'warrior', name: "Guerreiro", desc: "50 treinos concluídos.", icon: <Medal className="w-5 h-5 text-yellow-600" />, iconName: 'Medal', earned: totalAtt >= 50 },
      { id: 'centurion', name: "Centurião", desc: "100 treinos absolutos!", icon: <Flame className="w-5 h-5 text-orange-500" />, iconName: 'Flame', earned: totalAtt >= 100 },
      { id: 'casca_grossa', name: "Casca Grossa", desc: "Marca histórica de 200 treinos.", icon: <Shield className="w-5 h-5 text-stone-500" />, iconName: 'Shield', earned: totalAtt >= 200 },
      { id: 'mestre', name: "Mestre dos Tatames", desc: "Meio milhar! 500 treinos concluídos.", icon: <Crown className="w-5 h-5 text-amber-500" />, iconName: 'Crown', earned: totalAtt >= 500 },
      { id: 'rato_tatame', name: "Rato de Tatame", desc: "Consistência incrível: 25+ treinos no mês.", icon: <Zap className="w-5 h-5 text-sky-400" />, iconName: 'Zap', earned: monthAttCount >= 25 },
      { id: 'black_belt', name: "A Lenda", desc: "Atingiu a faixa preta.", icon: <Crown className="w-5 h-5 text-gray-900 dark:text-gray-200" />, iconName: 'Crown', earned: isBlackBelt },
    ];
    
    return possibleBadges;
  };

  const earnedBadges = computeAchievements();

  return (
    <div className="flex h-screen overflow-hidden relative w-full bg-gray-50 dark:bg-brand-dark text-gray-900 dark:text-gray-100 transition-colors duration-200">
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
        hasUnreadNotifications={hasUnreadNotifications}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        isAdmin={planKey === 'administracao'}
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
              <div className="mb-8 flex justify-between items-end">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 shadow-md overflow-hidden flex-shrink-0 relative">
                    {currentUserData.photoBase64 ? (
                      <>
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
                <div className="hidden md:flex items-center gap-3">
                  {!pushEnabled && (
                    <button onClick={requestPushPermission} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-full shadow-sm text-sm font-bold border border-blue-200 dark:border-blue-800 flex items-center transition">
                      <Bell className="w-4 h-4 mr-2" /> Ativar Notificações
                    </button>
                  )}
                  <span className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-brand-red" /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

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
              <div className="mb-8 no-print">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=E aí! Bora treinar Jiu-Jitsu na Tanque Team? 🥋🔥 Vem fazer uma aula experimental! Acesse: https://www.tanqueteambjj.com.br`, '_blank')} 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition"
                  aria-label="Convidar um amigo via WhatsApp"
                >
                  <Share2 className="w-6 h-6" aria-hidden="true" />
                  <span className="text-base md:text-lg">Chamar um Amigo pro Treino</span>
                </motion.button>
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
                              icon: recentGrad.isNewBelt ? <Medal className="w-5 h-5" /> : <Star className="w-5 h-5" />,
                              iconName: recentGrad.isNewBelt ? 'Medal' : 'Star',
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print">
                {/* Ranking */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-brand-dark dark:border-gray-600 flex flex-col h-full">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-display text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2"><Flame className="text-orange-500 w-5 h-5" /> Top 5 - Frequência</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Os guerreiros que mais treinaram</p>
                    </div>
                    <span className="text-xs font-bold text-brand-dark dark:text-gray-200 bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-full uppercase tracking-wider shadow-inner">{monthNames[new Date().getMonth()]}</span>
                  </div>
                  <div className="p-0 flex-1 overflow-y-auto max-h-[300px]">
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

                {/* Achievements Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-yellow-500 flex flex-col h-full">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 shrink-0">
                    <h3 className="font-display text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2"><Trophy className="text-yellow-500 w-5 h-5" /> Suas Conquistas</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Medalhas Desbloqueadas</p>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
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
                <Feed currentUserData={currentUserData} appId={appId} showAlert={showAlert} showConfirm={showConfirm} />
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
              >
                <Ranking appId={appId} db={db} currentUserData={currentUserData} ranking={ranking} />
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
            {view === 'admin' && planKey === 'administracao' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AdminPanel appId={appId} showAlert={showAlert} showConfirm={showConfirm} />
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
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Apelido (Nome Social)</label>
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

                <div className="mt-12 max-w-4xl mx-auto mb-10 overflow-hidden px-4 sm:px-0">
                  <div className="mb-6 flex flex-col md:flex-row items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-red/10 rounded-xl">
                        <CreditCard className="w-6 h-6 text-brand-red" />
                      </div>
                      <h2 className="font-display text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Financeiro & Pagamentos</h2>
                    </div>
                  </div>
                  <Finance currentUserData={currentUserData} planInfo={planInfo} showAlert={showAlert} />
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

      <AnimatePresence>
        {isNotificationCenterOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-end backdrop-blur-sm"
            onClick={() => {
              setIsNotificationCenterOpen(false);
              if (currentUserData) {
                localStorage.setItem(`lastViewedNotifications_${currentUserData.id}`, Date.now().toString());
                setHasUnreadNotifications(false);
              }
            }}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-gray-800 w-full max-w-md h-full shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-red/10 rounded-xl text-brand-red font-bold">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white uppercase tracking-tight">Notificações</h3>
                </div>
                <button 
                  onClick={() => setIsNotificationCenterOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                      <Inbox className="w-10 h-10" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Você não tem novas notificações no momento.</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <motion.div 
                      key={n.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-4 rounded-2xl border transition-all ${
                        parseDateString(n.timestamp).getTime() > parseInt(localStorage.getItem(`lastViewedNotifications_${currentUserData?.id}`) || '0')
                        ? 'bg-brand-red/5 border-brand-red/20 shadow-sm'
                        : 'bg-white dark:bg-gray-700/30 border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{n.title}</h4>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                          {formatDistanceToNow(parseDateString(n.timestamp), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{n.message}</p>
                      {n.type === 'alert' && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-brand-red uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3" /> Urgente
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => setIsNotificationCenterOpen(false)}
                  className="w-full py-4 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
