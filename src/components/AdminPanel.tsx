import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, deleteDoc, doc, onSnapshot, orderBy, addDoc, getDocs, updateDoc, deleteField } from 'firebase/firestore';
import { Users, Calendar, Trash2, Plus, Search, Clock, ShieldCheck, MessageSquare, Loader2, User, XCircle, Camera, Edit2, Edit3, Check, X, Star, Medal, Target, Flame, Sun, ArrowUpCircle, Award, Shield, Crown, Zap, Trophy, TrendingDown, TrendingUp, ZoomIn, ZoomOut, RotateCcw, ThumbsUp, CreditCard, Ban, CheckSquare, Square, Trash, AlertTriangle, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Cropper from 'react-easy-crop';

export default function AdminPanel({ appId, showAlert, showConfirm, onImpersonate, lastMonthRankingAdulto = [], lastMonthRankingInfantil = [] }: any) {
  // 1. STATE DECLARATIONS AT THE TOP
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const [extraXPValue, setExtraXPValue] = useState(100);
  const [isLinkingFamily, setIsLinkingFamily] = useState<{ studentId: string, name: string, parentId?: string } | null>(null);
  
  // Students and Search
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [viewingXPHistoryStudent, setViewingXPHistoryStudent] = useState<any | null>(null);
  const [familySearch, setFamilySearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  
  // Custom Achievements Management
  const [customAchievements, setCustomAchievements] = useState<any[]>([]);
  const [newAchievement, setNewAchievement] = useState({ name: '', desc: '', iconName: 'Trophy', xpBonus: 200 });
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  
  // Schedule Management
  const [gymSchedule, setGymSchedule] = useState<any[]>([]);
  const [newClass, setNewClass] = useState({ days: [1], times: '18:00', name: '' });
  const [editingClass, setEditingClass] = useState<any>(null);
  
  // Bookings Management
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Feed Management
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string[]>([]);
  
  // Filters
  const [filterBelt, setFilterBelt] = useState('Todas');
  const [filterLevelOrder, setFilterLevelOrder] = useState<'none' | 'desc' | 'asc'>('none');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterPlan, setFilterPlan] = useState('Todos');
  const [filterRecent, setFilterRecent] = useState(false);

  // Form States
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    nickname: '',
    studentLogin: '',
    studentPassword: '',
    plan: 'Mensal',
    belt: 'Faixa Branca - 0º Grau',
    phone: '',
    paymentStatus: 'Em dia',
    parentId: '',
    parentName: ''
  });
  
  const [editFormData, setEditFormData] = useState({
    name: '',
    nickname: '',
    studentLogin: '',
    plan: '',
    belt: '',
    isGraduationInitial: false
  });

  const [penaltyMode, setPenaltyMode] = useState<Record<string, boolean>>({});

  // Photo Cropper States
  const [croppingStudent, setCroppingStudent] = useState<{ id: string, name: string } | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Icons helper for custom achievements
  const iconOptions: Record<string, any> = {
    'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Target': Target, 
    'Flame': Flame, 'Sun': Sun, 'Zap': Zap, 'Shield': Shield, 
    'Crown': Crown, 'Award': Award, 'Target-Red': Target,
    'Clock': Clock, 'Users': Users, 'Camera': Camera, 'MessageSquare': MessageSquare
  };

  const removeStudentPhoto = async (studentId: string, name: string) => {
    showConfirm("Remover Foto", `Tem certeza que deseja remover a foto de ${name}?`, async () => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
          photoBase64: null
        });
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: null } : s));
        setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: null } : s));
        showAlert("Sucesso", "Foto removida.", "success");
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Falha ao remover foto.", "error");
      }
    });
  };

  const updateStudentPhoto = async (studentId: string, base64: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        photoBase64: base64
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: base64 } : s));
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: base64 } : s));
      showAlert("Sucesso", "Foto atualizada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao atualizar foto.", "error");
    }
  };

  const muteStudent = async (studentId: string, name: string, hours: number | 'perm') => {
    const hoursNum = hours === 'perm' ? 87600 : hours; // 10 years for perm
    const mutedUntil = new Date(Date.now() + (hoursNum as number) * 60 * 60 * 1000).toISOString();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        mutedUntil: mutedUntil
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, mutedUntil } : s));
      showAlert("Sucesso", `${name} silenciado por ${hours === 'perm' ? 'tempo indeterminado' : hours + ' horas'}.`, "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao silenciar aluno.", "error");
    }
  };

  const unmuteStudent = async (studentId: string, name: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        mutedUntil: null
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, mutedUntil: null } : s));
      showAlert("Sucesso", `Silenciamento de ${name} removido.`, "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao remover silenciamento.", "error");
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentData.name || !newStudentData.studentLogin || !newStudentData.studentPassword) {
      showAlert("Aviso", "Nome, Login e Senha são obrigatórios.", "error");
      return;
    }

    try {
      setLoading(true);
      const studentToAdd = {
        ...newStudentData,
        role: 'student',
        extraXP: 0,
        xpLog: [],
        achievements: [],
        attendance: [],
        progressLog: [
          {
            type: 'graduation',
            text: newStudentData.belt,
            date: new Date().toLocaleDateString('pt-BR'),
            isInitialRank: true
          }
        ],
        registrationDate: new Date().toISOString().split('T')[0],
        paymentHistory: [],
        hasPaid: false
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), studentToAdd);
      
      setIsAddingStudent(false);
      setNewStudentData({
        name: '',
        nickname: '',
        studentLogin: '',
        studentPassword: '',
        plan: 'Mensal',
        belt: 'Faixa Branca - 0º Grau',
        phone: '',
        paymentStatus: 'Em dia',
        parentId: '',
        parentName: ''
      });
      
      showAlert("Sucesso", "Aluno adicionado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao adicionar aluno.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Students Helpers
  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      nickname: student.nickname || '',
      studentLogin: student.studentLogin || '',
      plan: student.plan || '',
      belt: student.belt || 'Faixa Branca - 0º Grau',
      isGraduationInitial: false
    });
  };

  const handleSaveStudentInfo = async () => {
    if (!editingStudent) return;
    try {
      setLoading(true);
      const updates: any = {
        name: editFormData.name,
        nickname: editFormData.nickname,
        studentLogin: editFormData.studentLogin,
        plan: editFormData.plan,
        belt: editFormData.belt
      };

      if (editFormData.belt !== editingStudent.belt) {
        const newLog = {
          type: 'graduation',
          text: editFormData.belt,
          date: new Date().toLocaleDateString('pt-BR'),
          isInitialRank: editFormData.isGraduationInitial 
        };
        updates.progressLog = [...(editingStudent.progressLog || []), newLog];
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), updates);
      setEditingStudent(null);
      showAlert("Sucesso", "Informações do aluno atualizadas!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao salvar informações.", "error");
    } finally {
      setLoading(false);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the desired output size (e.g., 800x800)
    canvas.width = 800;
    canvas.height = 800;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      800,
      800
    );

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handlePhotoChange = (e: any, studentId: string, studentName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setCroppingStudent({ id: studentId, name: studentName });
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (imageSrc && croppedAreaPixels && croppingStudent) {
      try {
        const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
        await updateStudentPhoto(croppingStudent.id, croppedImageBase64);
        setCroppingStudent(null);
        setImageSrc(null);
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Não foi possível cortar a imagem.", "error");
      }
    }
  };

  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    name: '',
    price: 0,
    basePrice: 0,
    stripePriceId: '',
    mercadopagoLink: '',
    durationMonths: 12
  });

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      const planRef = doc(db, 'artifacts', appId, 'public', 'data', 'plans', editingPlan.id);
      await updateDoc(planRef, {
        name: editingPlan.name,
        price: Number(editingPlan.price),
        basePrice: Number(editingPlan.basePrice),
        stripePriceId: editingPlan.stripePriceId || '',
        mercadopagoLink: editingPlan.mercadopagoLink || '',
        durationMonths: Number(editingPlan.durationMonths || 12)
      });
      setEditingPlan(null);
      fetchPlans();
      alert("Plano atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating plan:", error);
      alert("Erro ao atualizar plano.");
    }
  };

  const fetchPlans = async () => {
    try {
      const plansRef = collection(db, 'artifacts', appId, 'public', 'data', 'plans');
      const snapshot = await getDocs(plansRef);
      const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDbPlans(plansData);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const setNewPlanDataReset = () => setNewPlanData({ name: '', price: 0, basePrice: 0, stripePriceId: '', mercadopagoLink: '', durationMonths: 12 });

  const handleAddPlan = async () => {
    if (!newPlanData.name) {
      showAlert("Erro", "O nome do plano é obrigatório.", "error");
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'plans'), {
        ...newPlanData,
        price: Number(newPlanData.price),
        basePrice: Number(newPlanData.basePrice),
        durationMonths: Number(newPlanData.durationMonths || 12)
      });
      setIsAddingPlan(false);
      setNewPlanDataReset();
      await fetchPlans();
      showAlert("Sucesso", "Plano criado com sucesso!", "success");
    } catch (error) {
      console.error("Error adding plan:", error);
      showAlert("Erro", "Falha ao criar plano.", "error");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    showConfirm("Excluir Plano", "Tem certeza que deseja excluir este plano? Alunos vinculados a este nome podem perder a referência de valor.", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'plans', planId));
        await fetchPlans();
        showAlert("Sucesso", "Plano excluído.", "success");
      } catch (error) {
        console.error("Error deleting plan:", error);
        showAlert("Erro", "Falha ao excluir plano.", "error");
      }
    });
  };

  useEffect(() => {
    if (appId) {
      fetchPlans();
    }
  }, [appId]);

  useEffect(() => {
    if (!hasStartedLoading) {
      setHasStartedLoading(true);
    }
  }, [appId, hasStartedLoading]);

  useEffect(() => {
    let filtered = [...allStudents];

    // Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        (s.studentLogin && s.studentLogin.toLowerCase().includes(q))
      );
    }

    // Belt Filter
    if (filterBelt !== 'Todas') {
      filtered = filtered.filter(s => s.belt && s.belt.includes(filterBelt));
    }

    // Status Filter
    if (filterStatus !== 'Todos') {
      filtered = filtered.filter(s => (s.paymentStatus || s.financeiro?.status || 'Pendente') === filterStatus);
    }

    // Plan Filter
    if (filterPlan !== 'Todos') {
      filtered = filtered.filter(s => s.plan && s.plan.toLowerCase().includes(filterPlan.toLowerCase()));
    }

    // Sort by Level
    if (filterLevelOrder !== 'none') {
      filtered.sort((a, b) => {
        const lvlA = calculateStudentLevel(a);
        const lvlB = calculateStudentLevel(b);
        return filterLevelOrder === 'desc' ? lvlB - lvlA : lvlA - lvlB;
      });
    }

    // Sort by Recent
    if (filterRecent) {
      filtered.sort((a, b) => {
        const dateA = a.registrationDate || '';
        const dateB = b.registrationDate || '';
        return dateB.localeCompare(dateA);
      });
    }

    setStudents(filtered);
  }, [searchQuery, allStudents, filterBelt, filterLevelOrder, filterStatus, filterRecent]);

  const weekDays = [
    { id: 0, name: 'Domingo' },
    { id: 1, name: 'Segunda-feira' },
    { id: 2, name: 'Terça-feira' },
    { id: 3, name: 'Quarta-feira' },
    { id: 4, name: 'Quinta-feira' },
    { id: 5, name: 'Sexta-feira' },
    { id: 6, name: 'Sábado' },
  ];

  useEffect(() => {
    setLoading(true);
    
    // Safety timeout to prevent infinite loading state
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Gym Schedule Listener
    const unsubSchedule = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'), (snap) => {
      const schedule: any[] = [];
      snap.forEach(docSnap => {
        if (docSnap.exists()) {
          schedule.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setGymSchedule(schedule.sort((a,b) => (a.day || 0) - (b.day || 0) || (a.time || '').localeCompare(b.time || '')));
    }, (err) => {
      console.error("Schedule listener error:", err);
    });

    // Bookings Listener (for selected date)
    const unsubBookings = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), where('date', '==', selectedBookingDate)),
      (snap) => {
        const booked: any[] = [];
        snap.forEach(docSnap => {
          if (docSnap.exists()) {
            booked.push({ id: docSnap.id, ...docSnap.data() });
          }
        });
        setBookings(booked);
      }, (err) => {
        console.error("Bookings listener error:", err);
      }
    );

    // Feed Listener
    const unsubFeed = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), (snap) => {
      const posts: any[] = [];
      snap.forEach(docSnap => {
        if (docSnap.exists()) {
          posts.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setFeedPosts(posts.sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')));
    }, (err) => {
      console.error("Feed listener error:", err);
    });

    // Students Real-time Listener
    const unsubStudents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('name')), (snap) => {
      const list: any[] = [];
      snap.forEach(docSnap => {
        if (docSnap.exists()) {
          list.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setAllStudents(list);
      setHasStartedLoading(true);
      setLoading(false); // Students are usually the largest part, once they load we can show the UI
    }, (err) => {
      console.error("Students listener error:", err);
      setLoading(false);
    });

    // Custom Achievements Listener
    const unsubAchievements = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'adminAchievements'), (snap) => {
      const achs: any[] = [];
      snap.forEach(docSnap => {
        if (docSnap.exists()) {
          achs.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setCustomAchievements(achs);
    }, (err) => {
      console.error("Achievements listener error:", err);
    });

    return () => {
      unsubSchedule();
      unsubBookings();
      unsubFeed();
      unsubStudents();
      unsubAchievements();
      clearTimeout(safetyTimeout);
    };
  }, [appId, selectedBookingDate]);

  // Removed unified loading handler as we are using a more robust per-listener one above

  const addAchievement = async () => {
    if (!newAchievement.name) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'adminAchievements'), newAchievement);
      setNewAchievement({ name: '', desc: '', iconName: 'Trophy', xpBonus: 200 });
      setIsAddingAchievement(false);
      showAlert("Sucesso", "Conquista criada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Erro ao criar conquista.", "error");
    }
  };

  const deleteAchievement = async (id: string) => {
    showConfirm("Apagar Conquista", "Deseja remover esta conquista permanentemente?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'adminAchievements', id));
      } catch (e) { console.error(e); }
    });
  };

  const calculateStudentLevel = (student: any) => {
    if (!student) return 1;
    const xpPerClass = 50;
    const badgeXPBonusMap: Record<string, number> = {
      'first_class': 100, 'beginner': 200, 'monthly_focus': 300, 'streak_5': 250,
      'weekend_warrior': 150, 'voice_tatame': 50, 'degree': 500, 
      'warrior': 500, 'centurion': 1000, 'casca_grossa': 2000, 'mestre': 5000, 'rato_tatame': 400
    };

    const attendance = Array.isArray(student.attendance) ? student.attendance : [];
    const totalAtt = attendance.length;
    
    // Auto badges XP
    let earnedBadgesXP = 0;
    if (totalAtt >= 1) earnedBadgesXP += badgeXPBonusMap['first_class'] || 0;
    if (totalAtt >= 12) earnedBadgesXP += badgeXPBonusMap['beginner'] || 0;
    if (totalAtt >= 50) earnedBadgesXP += badgeXPBonusMap['warrior'] || 0;
    if (totalAtt >= 100) earnedBadgesXP += badgeXPBonusMap['centurion'] || 0;
    if (totalAtt >= 200) earnedBadgesXP += badgeXPBonusMap['casca_grossa'] || 0;
    if (totalAtt >= 500) earnedBadgesXP += badgeXPBonusMap['mestre'] || 0;
    
    // Ranking Special Badges & Custom Admin Achievements
    const rankingBadgeValues: Record<string, number> = {
      'rank_1': 1000, 'rank_2': 800, 'rank_3': 600, 'rank_4': 400, 'rank_5': 200
    };
    
    const achievements = Array.isArray(student.achievements) ? student.achievements : [];
    const safeCustomAchievements = Array.isArray(customAchievements) ? customAchievements : [];

    achievements.forEach((id: string) => {
      if (rankingBadgeValues[id]) {
        earnedBadgesXP += rankingBadgeValues[id];
      } else {
        const custom = safeCustomAchievements.find(ca => ca && ca.id === id);
        if (custom) {
          earnedBadgesXP += Number(custom.xpBonus) || 200;
        }
      }
    });

    const userXP = (Number(student.extraXP) || 0) + (totalAtt * xpPerClass) + earnedBadgesXP;
    return Math.max(1, Math.floor(Math.sqrt(userXP / 100)) + 1);
  };

  const getStudentAchievements = (student: any) => {
    if (!student) return [];
    const badges: any[] = [];
    const attendance = Array.isArray(student.attendance) ? student.attendance : [];
    const totalAtt = attendance.length;
    
    // Dynamic badges logic
    if (totalAtt >= 1) badges.push({ id: 'first_class', icon: <Star className="w-3 h-3 text-yellow-500" />, name: "Primeiro Treino" });
    if (totalAtt >= 12) badges.push({ id: 'beginner', icon: <Medal className="w-3 h-3 text-gray-400" />, name: "Iniciante" });
    if (totalAtt >= 50) badges.push({ id: 'warrior', icon: <Medal className="w-3 h-3 text-yellow-600" />, name: "Guerreiro" });
    if (totalAtt >= 100) badges.push({ id: 'centurion', icon: <Flame className="w-3 h-3 text-orange-500" />, name: "Centurião" });
    if (totalAtt >= 200) badges.push({ id: 'casca_grossa', icon: <Shield className="w-3 h-3 text-stone-500" />, name: "Casca Grossa" });
    if (totalAtt >= 500) badges.push({ id: 'mestre', icon: <Crown className="w-3 h-3 text-amber-500" />, name: "Mestre" });
    
    // Graduation Badges
    const progressLog = Array.isArray(student.progressLog) ? student.progressLog : [];
    const LOCK_DATE = '2026-05-06';
    let hasNewBelt = false;
    let hasNewDegree = false;
    let hasBlackBelt = false;

    progressLog.forEach((log: any) => {
      if (!log) return;
      if (log.type === 'graduation' && !log.isInitialRank && (log.date || '') > LOCK_DATE) {
        if (log.text && log.text.match(/[1-9]º Grau/)) hasNewDegree = true;
        else {
          hasNewBelt = true;
          if (log.text && log.text.toLowerCase().includes('preta')) hasBlackBelt = true;
        }
      }
    });

    if (hasNewDegree) badges.push({ id: 'degree', icon: <ArrowUpCircle className="w-3 h-3 text-yellow-600" />, name: "Evolução" });
    if (hasNewBelt) badges.push({ id: 'new_belt', icon: <Medal className="w-3 h-3 text-brand-red" />, name: "Nova Faixa" });
    if (hasBlackBelt) badges.push({ id: 'black_belt', icon: <Crown className="w-3 h-3 text-black dark:text-gray-100" />, name: "A Lenda" });

    // Manual achievements from admin
    const achievements = Array.isArray(student.achievements) ? student.achievements : [];
    const safeCustomAchievements = Array.isArray(customAchievements) ? customAchievements : [];

    achievements.forEach((achId: string) => {
      const custom = safeCustomAchievements.find(ca => ca && ca.id === achId);
      if (custom) {
        const Icon = iconOptions[custom.iconName] || Trophy;
        badges.push({ id: custom.id, icon: <Icon className="w-3 h-3 text-brand-red" />, name: custom.name, isManual: true });
      }
    });

    return badges;
  };

  const addExtraXP = async (studentId: string, amount: number, customReason?: string) => {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    showConfirm(amount >= 0 ? "Adicionar XP" : "Penalidade de XP", 
      `Deseja aplicar ${amount} XP para ${student.name}?`, async () => {
      const currentExtraXP = student.extraXP || 0;
      try {
        const xpUpdate = {
          amount: amount,
          reason: customReason || (amount >= 0 ? 'Bônus Administrativo' : 'Penalidade Administrativa'),
          date: new Date().toISOString(),
          type: 'extra',
          id: `extra_${Date.now()}`
        };
        const newLog = [...(student.xpLog || []), xpUpdate].slice(-10);

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
          extraXP: currentExtraXP + amount,
          xpLog: newLog
        });
        setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, extraXP: currentExtraXP + amount, xpLog: newLog } : s));
        showAlert("Sucesso", "Operação realizada com sucesso!", "success");
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Falha ao atualizar XP.", "error");
      }
    });
  };

  const linkAccount = async (studentId: string, parentId: string | null, stayOpen: boolean = false) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        parentId: parentId || deleteField()
      });
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, parentId: parentId || undefined } : s));
      if (!stayOpen) {
        setIsLinkingFamily(null);
      }
      showAlert("Sucesso", parentId ? "Conta vinculada com sucesso!" : "Vínculo removido com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao vincular conta.", "error");
    }
  };

  const getInactiveStudents = () => {
    const now = new Date();
    return allStudents.map(s => {
      if (!s) return null;
      if (!Array.isArray(s.attendance) || s.attendance.length === 0) return { ...s, daysInactive: 999 };
      try {
        const sortedAtt = [...s.attendance].filter(d => typeof d === 'string').sort();
        if (sortedAtt.length === 0) return { ...s, daysInactive: 999 };
        const lastAttStr = sortedAtt.pop();
        const lastAtt = new Date(lastAttStr + 'T12:00:00');
        if (isNaN(lastAtt.getTime())) return { ...s, daysInactive: 999 };
        const diffDays = Math.floor((now.getTime() - lastAtt.getTime()) / (1000 * 60 * 60 * 24));
        return { ...s, daysInactive: Math.max(0, diffDays) };
      } catch (e) {
        return { ...s, daysInactive: 999 };
      }
    }).filter((s: any) => s && s.daysInactive >= 10).sort((a: any, b: any) => b.daysInactive - a.daysInactive);
  };

  const assignAchievement = async (studentId: string, currentAchs: string[] = []) => {
    // This is simple: we'll show a prompt or just use a predefined list in this turn
    // For now, let's just make it possible via a toggle if we show the list
  };

  const removeManualXP = async (student: any, logToRemove: any) => {
    showConfirm("Remover Registro", "Tem certeza que deseja remover este registro de XP? O total de XP do aluno será atualizado.", async () => {
      try {
        const currentXP = Number(student.extraXP) || 0;
        // Compare by ID if exists, otherwise compare by object reference
        const newLog = (student.xpLog || []).filter((log: any) => {
          if (logToRemove.id && log.id) return log.id !== logToRemove.id;
          return log !== logToRemove;
        });
        const amountToRemove = Number(logToRemove.amount) || 0;
        
        const updates: any = {
          xpLog: newLog,
          extraXP: Math.max(0, currentXP - amountToRemove)
        };

        // If it's an achievement being removed by deleting the log, 
        // we should also check if we should remove the achievement ID from achievements array
        // However, it's safer to just remove the XP. 
        // The user specifically asked to remove XP/Achievement.
        
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id), updates);
        setAllStudents(prev => prev.map(s => s.id === student.id ? { ...s, ...updates } : s));
        
        if (viewingXPHistoryStudent && viewingXPHistoryStudent.id === student.id) {
          setViewingXPHistoryStudent({ ...viewingXPHistoryStudent, ...updates });
        }
        
        showAlert("Sucesso", "Registro de XP removido com sucesso.", "success");
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Falha ao remover registro de XP.", "error");
      }
    });
  };

  const toggleAchievementForStudent = async (student: any, achId: string) => {
    const currentAchs = student.achievements || [];
    const currentExtraXP = Number(student.extraXP) || 0;
    const isAdding = !currentAchs.includes(achId);
    
    try {
      const ach = customAchievements.find(a => a.id === achId);
      const achXP = Number(ach?.xpBonus) || 200;
      
      const updates: any = {};
      
      if (isAdding) {
        updates.achievements = [...currentAchs, achId];
        const xpUpdate = {
          amount: achXP,
          reason: `Conquista: ${ach?.name || 'Nova Conquista'}`,
          date: new Date().toISOString(),
          type: 'achievement',
          id: `${achId}_${Date.now()}` // Added ID for easier tracking
        };
        updates.xpLog = [...(student.xpLog || []), xpUpdate].slice(-10);
        updates.extraXP = currentExtraXP + achXP;
      } else {
        updates.achievements = currentAchs.filter((id: string) => id !== achId);
        // When removing achievement, we don't necessarily remove the XP log automatically
        // as the admin might want to keep history. 
        // But for consistency with "removing achievement AND xp", we can look for the log
        const newLog = (student.xpLog || []).filter((log: any) => !log.reason?.includes(`Conquista: ${ach?.name}`));
        updates.xpLog = newLog;
        
        // Calculate only the XP to remove (those logs we just filtered out)
        const removedLogs = (student.xpLog || []).filter((log: any) => log.reason?.includes(`Conquista: ${ach?.name}`));
        const xpToSubtract = removedLogs.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
        updates.extraXP = Math.max(0, currentExtraXP - xpToSubtract);
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id), updates);
      setAllStudents(prev => prev.map(s => s.id === student.id ? { ...s, ...updates } : s));
      showAlert("Sucesso", isAdding ? "Conquista atribuída!" : "Conquista removida!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao atualizar conquistas do aluno.", "error");
    }
  };

  const addClass = async () => {
    if (!newClass.name) {
      showAlert("Aviso", "A aula precisa de um nome.", "error");
      return;
    }
    if (newClass.days.length === 0) {
      showAlert("Aviso", "Selecione pelo menos um dia da semana.", "error");
      return;
    }
    try {
      const timesArray = newClass.times.split(',').map(t => t.trim()).filter(t => t);
      for (const day of newClass.days) {
        for (const t of timesArray) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'), {
            day: Number(day),
            time: t,
            name: newClass.name
          });
        }
      }
      setNewClass({ ...newClass, name: '', days: [1] });
      showAlert("Sucesso", "Horário(s) adicionado(s) com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao adicionar horário.", "error");
    }
  };

  const updateClass = async () => {
    if (!editingClass || !editingClass.name || !editingClass.time) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', editingClass.id), {
        name: editingClass.name,
        time: editingClass.time,
        day: Number(editingClass.day)
      });
      setEditingClass(null);
      showAlert("Sucesso", "Horário atualizado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao atualizar horário.", "error");
    }
  };

  const removeClass = async (id: string) => {
    showConfirm("Remover Horário", "Isso apagará permanentemente esta aula da grade. Continuar?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', id));
        setSelectedSchedule(prev => prev.filter(item => item !== id));
      } catch (e) { console.error(e); }
    });
  };

  const bulkDeleteSchedule = async () => {
    if (selectedSchedule.length === 0) return;
    showConfirm("Remover Lote", `Apagar ${selectedSchedule.length} horários da grade permanentemente?`, async () => {
      try {
        for (const id of selectedSchedule) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', id));
        }
        setSelectedSchedule([]);
        showAlert("Sucesso", "Horários removidos com sucesso!", "success");
      } catch (e) { console.error(e); }
    });
  };

  const deleteDaySchedule = async (dayId: number, dayName: string) => {
    showConfirm("Apagar Dia Inteiro", `Tem certeza que deseja apagar TODOS os horários de ${dayName}?`, async () => {
      try {
        const dayClasses = gymSchedule.filter(c => c.day === dayId);
        for (const c of dayClasses) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', c.id));
        }
        showAlert("Sucesso", `Horários de ${dayName} removidos.`, "success");
      } catch (e) { console.error(e); }
    });
  };

  const toggleScheduleSelection = (id: string) => {
    setSelectedSchedule(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const deletePost = async (postId: string) => {
    showConfirm("Remover Post", "Tem certeza que deseja apagar este post do feed?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId));
        setSelectedPosts(prev => prev.filter(id => id !== postId));
      } catch (e) { console.error(e); }
    });
  };

  const bulkDeletePosts = async () => {
    if (selectedPosts.length === 0) return;
    showConfirm("Remover Lote", `Apagar ${selectedPosts.length} posts do feed permanentemente?`, async () => {
      try {
        for (const id of selectedPosts) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', id));
        }
        setSelectedPosts([]);
        showAlert("Sucesso", "Posts removidos com sucesso!", "success");
      } catch (e) { console.error(e); }
    });
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]);
  };

  const removeBooking = async (id: string, studentName: string) => {
    showConfirm("Remover Agendamento", `Remover ${studentName} desta aula?`, async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      } catch (e) { console.error(e); }
    });
  };

  const inactiveStudents = hasStartedLoading ? getInactiveStudents() : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
              <ShieldCheck className="text-brand-red w-8 h-8" /> Administração
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Controle total da sua academia, alunos e agendamentos</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:block">Status do Sistema</div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 shadow-sm px-4 py-1.5 rounded-xl text-xs font-bold text-green-500 uppercase tracking-tight">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Online
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 scroll-smooth overflow-x-auto no-scrollbar shadow-inner">
          {[
            { id: 'bookings', label: 'Agendamentos', icon: Calendar },
            { id: 'schedule', label: 'Grade Horária', icon: Clock },
            { id: 'feed', label: 'Feed', icon: MessageSquare },
            { id: 'students', label: 'Alunos', icon: Users },
            { id: 'plans', label: 'Planos', icon: CreditCard },
            { id: 'achievements', label: 'Conquistas', icon: Trophy },
            { id: 'churn', label: 'Evasão', icon: TrendingDown },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex-shrink-0 relative group ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-brand-red shadow-md transform scale-102'
                  : 'text-gray-500 hover:text-brand-red dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <tab.icon size={17} className={activeTab === tab.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-brand-red" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Carregando dados...</p>
            </div>
          </motion.div>
        ) : (
          null
        )}

        {/* BOOKINGS VIEW */}
        {!loading && activeTab === 'bookings' && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg dark:text-white">Agendamentos do Dia</h3>
                  <p className="text-sm text-gray-400">Veja quem agendou aula para uma data específica.</p>
                </div>
                <input 
                  type="date" 
                  value={selectedBookingDate}
                  onChange={(e) => setSelectedBookingDate(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Array.isArray(gymSchedule) ? gymSchedule : []).filter(c => {
                  try {
                    const dateObj = new Date(selectedBookingDate + 'T12:00:00');
                    return c && c.day === dateObj.getDay();
                  } catch (e) {
                    return false;
                  }
                }).map(c => {
                  const classBookings = (Array.isArray(bookings) ? bookings : []).filter(b => b && b.classId === c.id);
                  return (
                    <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-red uppercase tracking-widest">{c.time}</span>
                          <span className="text-xs font-bold text-gray-400 uppercase">{classBookings.length} Alunos</span>
                        </div>
                        <h4 className="font-display font-bold text-lg dark:text-white uppercase mt-1">{c.name}</h4>
                      </div>
                      <div className="p-4 space-y-2">
                        {classBookings.length === 0 ? (
                           <p className="text-xs text-gray-400 italic py-2">Nenhum aluno agendado.</p>
                        ) : (
                          classBookings.map(b => (
                            <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 group">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden">
                                   {b.studentPhoto ? <img src={b.studentPhoto} className="w-full h-full object-cover" /> : (b.studentFullName || b.studentName || '?').charAt(0)}
                                </div>
                                <span className="text-sm font-medium dark:text-gray-200">{b.studentFullName || b.studentName}</span>
                              </div>
                              <button 
                                onClick={() => removeBooking(b.id, b.studentName)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                              >
                                <XCircle size={14} className="LucideIcon" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
        )}

        {/* SCHEDULE VIEW */}
        {!loading && activeTab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add New Class Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-8">
                    <h3 className="font-bold text-lg mb-6 dark:text-white flex items-center gap-2">
                      <Plus className="text-brand-red" /> Novo Horário
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Aula</label>
                        <input 
                          type="text" 
                          value={newClass.name}
                          onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                          placeholder="Ex: Jiu-Jitsu Iniciantes"
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dias da Semana</label>
                        <div className="grid grid-cols-2 gap-2">
                          {weekDays.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                const days = newClass.days.includes(d.id)
                                  ? newClass.days.filter(id => id !== d.id)
                                  : [...newClass.days, d.id];
                                setNewClass({...newClass, days});
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${newClass.days.includes(d.id) ? 'bg-brand-red text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                            >
                              {newClass.days.includes(d.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                              {d.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horário(s) (ex: 18:00, 19:30)</label>
                        <input 
                          type="text" 
                          value={newClass.times}
                          onChange={(e) => setNewClass({...newClass, times: e.target.value})}
                          placeholder="00:00, 00:00"
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                        />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={addClass}
                        className="w-full py-3 bg-brand-red text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Adicionar à Grade
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Grade Horária Atual */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedSchedule.length > 0 && (
                    <div className="flex justify-end p-2">
                       <button 
                        onClick={bulkDeleteSchedule}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-lg flex items-center gap-2"
                      >
                        <Trash className="w-3.5 h-3.5" /> Apagar Seleção ({selectedSchedule.length})
                      </button>
                    </div>
                  )}
                {weekDays.map(day => {
                    const safeSchedule = Array.isArray(gymSchedule) ? gymSchedule : [];
                    const dayClasses = safeSchedule.filter(c => c && c.day === day.id);
                    if (dayClasses.length === 0) return null;
                    return (
                      <div key={day.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-brand-dark dark:text-white">{day.name}</h4>
                            <span className="text-[10px] bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300 font-bold">{dayClasses.length} horários</span>
                          </div>
                          <button 
                            onClick={() => deleteDaySchedule(day.id, day.name)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 transition flex items-center gap-1 uppercase"
                          >
                            <Trash2 size={12} /> Limpar Dia
                          </button>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                          {dayClasses.map(c => (
                            <div key={c.id} className={`flex items-center justify-between p-4 px-6 group hover:bg-gray-50/50 transition ${selectedSchedule.includes(c.id) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                              <div className="flex items-center gap-4 flex-1">
                                <button 
                                  onClick={() => toggleScheduleSelection(c.id)}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedSchedule.includes(c.id) ? 'bg-brand-red border-brand-red text-white' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                  {selectedSchedule.includes(c.id) && <CheckSquare size={10} />}
                                </button>
                                {editingClass?.id === c.id ? (
                                  <div className="flex flex-wrap items-center gap-2 flex-1">
                                    <select 
                                      value={editingClass.day}
                                      onChange={(e) => setEditingClass({...editingClass, day: parseInt(e.target.value)})}
                                      className="bg-white dark:bg-gray-900 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                                    >
                                      {weekDays.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <input 
                                      type="text" 
                                      value={editingClass.time}
                                      onChange={(e) => setEditingClass({...editingClass, time: e.target.value})}
                                      className="w-16 bg-white dark:bg-gray-900 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                                    />
                                    <input 
                                      type="text" 
                                      value={editingClass.name}
                                      onChange={(e) => setEditingClass({...editingClass, name: e.target.value})}
                                      className="flex-1 min-w-[120px] bg-white dark:bg-gray-900 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                                    />
                                    <div className="flex items-center gap-1">
                                      <button onClick={updateClass} className="p-1 text-green-500 hover:text-green-600 transition"><Check size={16} /></button>
                                      <button onClick={() => setEditingClass(null)} className="p-1 text-gray-400 hover:text-gray-500 transition"><X size={16} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-bold text-brand-red font-mono">{c.time}</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{c.name}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setEditingClass(c)}
                                  className="text-gray-300 hover:text-brand-red transition opacity-0 group-hover:opacity-100"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => removeClass(c.id)}
                                  className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
        )}

        {/* FEED VIEW */}
        {!loading && activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
              <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-brand-red w-5 h-5" />
                  <span className="font-bold dark:text-white">Gerenciar Feed</span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{feedPosts.length} posts</span>
                </div>
                {selectedPosts.length > 0 && (
                  <button 
                    onClick={bulkDeletePosts}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition shadow-md"
                  >
                    <Trash className="w-3.5 h-3.5" /> Apagar Selecionados ({selectedPosts.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedPosts.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500">Nenhum post no feed.</p>
                  </div>
                ) : (
                  feedPosts.map(post => (
                    <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all ${selectedPosts.includes(post.id) ? 'border-brand-red ring-2 ring-brand-red/10' : 'border-gray-100 dark:border-gray-700'} flex items-center gap-3`}>
                      <button 
                        onClick={() => togglePostSelection(post.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedPosts.includes(post.id) ? 'bg-brand-red border-brand-red text-white' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        {selectedPosts.includes(post.id) && <CheckSquare size={12} />}
                      </button>

                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-600">
                        {post.studentPhoto ? <img src={post.studentPhoto} className="w-full h-full object-cover" /> : <User size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                           <h5 className="font-bold text-xs truncate dark:text-white">{post.studentFullName || post.studentName}</h5>
                           <span className="text-[9px] text-gray-400">
                             Exp: {post.expiresAt ? format(new Date(post.expiresAt), 'dd/MM') : '--/--'}
                           </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{post.badgeName} - {post.message || 'Sem mensagem'}</p>
                      </div>
                      <button 
                        onClick={() => deletePost(post.id)}
                        className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
        )}

        {/* STUDENTS VIEW */}
        {!loading && activeTab === 'students' && (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar aluno por nome ou login..."
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => showAlert("Info", "Os dados são atualizados automaticamente.", "info")}
                      className="bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 font-bold text-sm shadow-sm transition-all"
                    >
                      Sincronizado
                    </button>
                    <button 
                      onClick={() => setIsAddingStudent(true)}
                      className="bg-green-600 px-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                    >
                      <Plus size={18} /> Novo Aluno
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                  {/* Belt Filter */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Faixa</span>
                    <select 
                      value={filterBelt}
                      onChange={(e) => setFilterBelt(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                    >
                      <option value="Todas">Todas</option>
                      <option value="Faixa Branca">Branca</option>
                      <option value="Faixa Cinza">Cinza</option>
                      <option value="Faixa Amarela">Amarela</option>
                      <option value="Faixa Laranja">Laranja</option>
                      <option value="Faixa Verde">Verde</option>
                      <option value="Faixa Azul">Azul</option>
                      <option value="Faixa Roxa">Roxa</option>
                      <option value="Faixa Marrom">Marrom</option>
                      <option value="Faixa Preta">Preta</option>
                    </select>
                  </div>

                  {/* Level Sort */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Nível</span>
                    <select 
                      value={filterLevelOrder}
                      onChange={(e) => setFilterLevelOrder(e.target.value as any)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                    >
                      <option value="none">Padrão</option>
                      <option value="desc">Maior p/ Menor</option>
                      <option value="asc">Menor p/ Maior</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Status</span>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Em dia">Em dia</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>

                  {/* Plan Filter */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Plano</span>
                    <select 
                      value={filterPlan}
                      onChange={(e) => setFilterPlan(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Infantil">Infantil</option>
                      <option value="Combo">Combo</option>
                      <option value="Isento">Isento</option>
                    </select>
                  </div>

                  {/* Recent Sort */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Ordem</span>
                    <button 
                      onClick={() => setFilterRecent(!filterRecent)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        filterRecent 
                        ? 'bg-brand-red text-white border-brand-red' 
                        : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-brand-red hover:text-brand-red'
                      }`}
                    >
                      {filterRecent ? 'Mais Recentes' : 'Data Registro'}
                    </button>
                  </div>

                  {/* Reset Filters */}
                  {(filterBelt !== 'Todas' || filterLevelOrder !== 'none' || filterStatus !== 'Todos' || filterPlan !== 'Todos' || filterRecent) && (
                    <button 
                      onClick={() => {
                        setFilterBelt('Todas');
                        setFilterLevelOrder('none');
                        setFilterStatus('Todos');
                        setFilterPlan('Todos');
                        setFilterRecent(false);
                        setSearchQuery('');
                      }}
                      className="mt-auto px-3 py-1.5 text-[10px] font-bold text-brand-red hover:underline"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.map(s => (
                  <div key={s.id} className="premium-card p-5 rounded-3xl flex flex-col gap-4 relative overflow-hidden">
                    {s.mutedUntil && new Date(s.mutedUntil) > new Date() && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-[9px] font-bold uppercase rounded-bl-lg">Silenciado</div>
                    )}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      <div className="flex flex-col gap-2 shrink-0 items-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm relative group">
                          {s.photoBase64 ? <img src={s.photoBase64} className="w-full h-full object-cover" alt="Aluno" /> : <User size={32} className="text-gray-300" />}
                        </div>
                        <div className="flex items-center gap-1.5 justify-center">
                          <button 
                            onClick={() => s.photoBase64 && setSelectedPhoto(s.photoBase64)}
                            className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400 hover:text-brand-red transition-all border border-gray-100 dark:border-gray-600 shadow-sm"
                            title="Ampliar Foto"
                          >
                             <Search size={14} />
                          </button>
                          <label className="cursor-pointer p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400 hover:text-brand-red transition-all border border-gray-100 dark:border-gray-600 shadow-sm" title="Alterar Foto">
                            <Camera size={14} />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoChange(e, s.id, s.name)}
                            />
                          </label>
                          {s.photoBase64 && (
                            <button 
                              onClick={() => removeStudentPhoto(s.id, s.name)}
                              className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-400 hover:text-red-600 transition-all border border-red-100 dark:border-red-900/30 shadow-sm"
                              title="Remover Foto"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                          <div className="flex flex-col w-full">
                             <div className="flex items-center justify-between gap-4 w-full">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <h5 className="font-bold text-gray-900 dark:text-white text-base truncate max-w-[200px]">{s.name}</h5>
                                    {s.nickname && <span className="text-xs text-gray-400 font-medium truncate max-w-[80px]">({s.nickname})</span>}
                                  </div>
                                  <div className="flex flex-col gap-1.5 mt-1.5">
                                    <div className="inline-flex bg-brand-red/5 dark:bg-brand-red/10 text-brand-red text-[9px] font-black px-2 py-1 rounded shadow-sm border border-brand-red/10 uppercase italic whitespace-normal break-words max-w-full w-fit">
                                      {s.plan?.split(' - R$')[0] || 'S/ PLANO'}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded shadow-sm border uppercase italic whitespace-nowrap ${
                                        (s.paymentStatus || s.financeiro?.status)?.toLowerCase() === 'em dia' 
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20' 
                                        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-100 dark:border-red-500/20'
                                      }`}>
                                        {s.paymentStatus || s.financeiro?.status || 'Pendente'}
                                      </span>
                                      <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest self-center opacity-70 italic">{s.belt}</span>
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleEditStudent(s)}
                                  className="p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-400 hover:text-brand-red transition-all border border-gray-100 dark:border-transparent"
                                  title="Editar Informações"
                                >
                                   <Edit2 size={14} />
                                </button>
                             </div>
                             
                          </div>
                          <div className="flex items-center gap-2">
                            {onImpersonate && (
                              <button 
                                onClick={() => onImpersonate(s)}
                                className="bg-brand-red hover:bg-brand-red text-white px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                              >
                                Ver Painel
                              </button>
                            )}
                            <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg px-2 py-1 flex items-center gap-1 shrink-0">
                              <ArrowUpCircle className="w-3 h-3 text-brand-red" />
                              <span className="text-[9px] font-black text-brand-red">NÍVEL {calculateStudentLevel(s)}</span>
                            </div>
                          </div>
                        </div>

                        {(() => {
                           const sPlan = (s.plan || '').toLowerCase();
                           const isAdult = !sPlan.includes('infantil');
                           const rankingAdult = Array.isArray(lastMonthRankingAdulto) ? lastMonthRankingAdulto : [];
                           const rankingInfant = Array.isArray(lastMonthRankingInfantil) ? lastMonthRankingInfantil : [];
                           const targetRank = isAdult ? rankingAdult : rankingInfant;
                           const pos = targetRank.findIndex(rs => rs && rs.id === s.id);
                           if (pos >= 0 && pos < 5) {
                             return (
                               <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg w-fit">
                                 <Trophy className="w-3 h-3 text-yellow-600" />
                                 <span className="text-[9px] font-bold text-yellow-700 dark:text-yellow-400 uppercase">Top {pos + 1} Mês Anterior</span>
                               </div>
                             );
                           }
                           return null;
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-gray-400 font-bold uppercase text-[9px]">ID Sistema</p>
                        <p className="dark:text-white font-medium truncate text-[11px]">{s.studentLogin}</p>
                      </div>
                      <div className="flex justify-between items-start min-w-0">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-gray-400 font-bold uppercase text-[9px]">Nível Atual</p>
                          <p className="dark:text-white font-medium text-[11px] leading-tight">Lvl {calculateStudentLevel(s)}</p>
                        </div>
                        <button 
                          onClick={() => setViewingXPHistoryStudent(s)}
                          className="p-1.5 bg-white dark:bg-gray-800 text-brand-red rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-red-50 transition shrink-0"
                          title="Ver Histórico de XP"
                        >
                          <TrendingUp size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                      {getStudentAchievements(s).map((ach, idx) => (
                        <div key={idx} className="relative group/ach mb-1">
                          <div className="bg-gray-100 dark:bg-gray-700 p-1.5 rounded-md shadow-sm flex items-center justify-center" title={ach.name}>
                            {ach.icon}
                          </div>
                          {ach.isManual && (
                            <button 
                              onClick={() => toggleAchievementForStudent(s, ach.id)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/ach:opacity-100 transition-opacity border border-white"
                              title="Remover conquista do aluno"
                            >
                              <X size={8} />
                            </button>
                          )}
                        </div>
                      ))}
                      {getStudentAchievements(s).length === 0 && (
                        <span className="text-[9px] text-gray-400 italic">Sem conquistas</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                      {(() => {
                        const dependents = allStudents.filter(dep => dep.parentId === s.id);
                        const isDependent = !!s.parentId;
                        const parent = isDependent ? allStudents.find(p => p.id === s.parentId) : null;

                        return (
                          <div className="flex flex-col gap-2 w-full px-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Família / Combo</p>
                              <button 
                                onClick={() => setIsLinkingFamily({ studentId: s.id, name: s.name, parentId: s.parentId })}
                                className="text-[9px] font-bold text-brand-red hover:underline uppercase"
                              >
                                {isDependent ? 'Alterar Titular' : 'Gerenciar Vínculos'}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {isDependent && parent && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                                  <LinkIcon size={10} className="text-blue-500" />
                                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase">Dependente de: {parent.name}</span>
                                </div>
                              )}
                              {dependents.length > 0 && (
                                <div className="flex flex-col gap-1 w-full">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase italic">Dependentes ({dependents.length}):</p>
                                  <div className="flex flex-wrap gap-1">
                                    {dependents.map(dep => (
                                      <div key={dep.id} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                        <span className="text-[9px] font-medium text-gray-600 dark:text-gray-300">{dep.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!isDependent && dependents.length === 0 && (
                                <span className="text-[9px] text-gray-400 italic">Nenhum vínculo familiar</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* XP Penalty/Bonus Section */}
                      <div className="flex items-center gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl w-full">
                        <div className="flex flex-col gap-1 items-center px-1 border-r border-gray-200 dark:border-gray-700 pr-2">
                           <button 
                             onClick={() => setPenaltyMode(prev => ({...prev, [s.id]: !prev[s.id]}))}
                             className={`text-[9px] font-black uppercase px-2 py-0.5 rounded transition ${penaltyMode[s.id] ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                           >
                             {penaltyMode[s.id] ? 'MULTA' : 'BÔNUS'}
                           </button>
                        </div>
                        <input 
                          type="number" 
                          placeholder="Valor XP" 
                          name={`xp-input-${s.id}`}
                          className="bg-transparent text-sm font-bold w-full outline-none dark:text-white"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              let val = Math.abs(parseInt((e.target as HTMLInputElement).value));
                              if (isNaN(val)) return;
                              
                              if (penaltyMode[s.id]) val = -val;

                              const reason = prompt(val < 0 ? "Motivo da penalidade:" : "Motivo do bônus:");
                              if (reason) {
                                await addExtraXP(s.id, val, reason);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const input = document.querySelector(`input[name="xp-input-${s.id}"]`) as HTMLInputElement;
                            let val = Math.abs(parseInt(input?.value || '0'));
                            if (isNaN(val) || val === 0) return;
                            if (penaltyMode[s.id]) val = -val;
                            const reason = prompt(val < 0 ? "Motivo da penalidade:" : "Motivo do bônus:");
                            if (reason) addExtraXP(s.id, val, reason);
                          }}
                          className="bg-brand-red text-white p-2 rounded-lg hover:bg-red-700 transition shadow-sm"
                        >
                          <Zap size={14} />
                        </button>
                      </div>

                      {/* Custom Achievements Toggle */}
                      <div className="w-full mb-3">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Atribuir Conquistas Personalizadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {customAchievements.map(ach => {
                            const IconComp = iconOptions[ach.iconName] || Trophy;
                            const hasAch = (s.achievements || []).includes(ach.id);
                            return (
                              <button
                                key={ach.id}
                                onClick={() => toggleAchievementForStudent(s, ach.id)}
                                className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 shadow-sm group/achbtn ${
                                  hasAch 
                                    ? 'bg-brand-red text-white border-brand-red scale-105 ring-2 ring-brand-red/20' 
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-brand-red hover:text-brand-red'
                                }`}
                                title={ach.name}
                              >
                                <IconComp size={14} className={hasAch ? 'animate-bounce' : ''} />
                                <span className="text-[9px] font-bold uppercase">{ach.name}</span>
                              </button>
                            );
                          })}
                          {customAchievements.length === 0 && <p className="text-[9px] text-gray-400 italic">Nenhuma conquista criada na aba Conquistas.</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 w-full mb-2">
                        {/* Family Connection */}
                        <button 
                          onClick={() => setIsLinkingFamily({ studentId: s.id, name: s.name, parentId: s.parentId })}
                          className={`flex-1 p-1.5 rounded flex items-center justify-center gap-1 text-[9px] font-bold uppercase transition ${s.parentId ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                          <Users size={12} />
                          {s.parentId ? 'Vincular' : 'Vincular'}
                        </button>
                      </div>

                      <div className="flex-1 flex gap-1 items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Silenciar:</span>
                        {[
                          { hours: 24, label: '1d' },
                          { hours: 168, label: '7d' },
                          { hours: 720, label: '30d' },
                          { hours: 'perm', label: 'PERM' }
                        ].map(d => (
                          <button
                            key={d.label}
                            onClick={() => muteStudent(s.id, s.name, d.hours as any)}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1.5 rounded-lg text-[9px] font-bold flex-1 transition-colors flex items-center justify-center gap-1"
                          >
                            <Ban size={10} /> {d.label}
                          </button>
                        ))}
                      </div>
                      {s.mutedUntil && (
                        <button 
                           onClick={() => unmuteStudent(s.id, s.name)}
                           className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 transition-colors"
                        >
                           Restaurar
                        </button>
                      )}
                        </div>
                      </div>
                    ))
                  }
                </div>
            </motion.div>
        )}

        {/* PLANS VIEW */}
        {!loading && activeTab === 'plans' && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg dark:text-white">Gerenciar Planos</h3>
                    <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full italic animate-pulse">
                      Mercado Pago Ativo
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 italic">Configure valores e integre com Stripe ou Mercado Pago.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fetchPlans()}
                    className="p-2 text-gray-400 hover:text-brand-red transition-colors"
                    title="Atualizar Planos"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button 
                    onClick={() => setIsAddingPlan(true)}
                    className="bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    <Plus size={18} /> Novo Plano
                  </button>
                </div>
              </div>

              {/* Alert de ajuda para o usuário */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl mb-6">
                <div className="flex gap-3">
                  <ExternalLink className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-black uppercase italic text-xs text-blue-800 dark:text-blue-300">Configuração de Recorrência (Mercado Pago)</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Para ativar a recorrência automática, crie o plano no seu painel do Mercado Pago, copie o <b>Link de Assinatura</b> e cole no campo correspondente ao editar ou criar um plano abaixo. 
                      <br/>
                      <span className="font-bold">Dica:</span> O botão &quot;Ativar Recorrência&quot; só aparecerá para o aluno se este link estiver configurado.
                    </p>
                  </div>
                </div>
              </div>

              {isAddingPlan && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Plano</label>
                      <input 
                        type="text" 
                        value={newPlanData.name}
                        onChange={(e) => setNewPlanData({...newPlanData, name: e.target.value})}
                        placeholder="Ex: Plano Infantil"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço (Pontualidade)</label>
                      <input 
                        type="number" 
                        value={newPlanData.price}
                        onChange={(e) => setNewPlanData({...newPlanData, price: parseFloat(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço Base (Integral)</label>
                      <input 
                        type="number" 
                        value={newPlanData.basePrice}
                        onChange={(e) => setNewPlanData({...newPlanData, basePrice: parseFloat(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Stripe Price ID (Legado)</label>
                      <input 
                        type="text" 
                        value={newPlanData.stripePriceId}
                        onChange={(e) => setNewPlanData({...newPlanData, stripePriceId: e.target.value})}
                        placeholder="price_..."
                        className={`w-full bg-gray-50 dark:bg-gray-900 border ${newPlanData.stripePriceId.startsWith('prod_') ? 'border-red-500' : 'border-gray-200'} dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white opacity-60`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Duração (Meses)</label>
                      <select 
                        value={newPlanData.durationMonths}
                        onChange={(e) => setNewPlanData({...newPlanData, durationMonths: parseInt(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                      >
                        <option value={1}>Mensal (1 Mês)</option>
                        <option value={3}>Trimestral (3 Meses)</option>
                        <option value={6}>Semestral (6 Meses)</option>
                        <option value={12}>Anual (12 Meses)</option>
                        <option value={24}>24 Meses</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link de Recorrência (Mercado Pago)</label>
                      <input 
                        type="text" 
                        value={newPlanData.mercadopagoLink}
                        onChange={(e) => setNewPlanData({...newPlanData, mercadopagoLink: e.target.value})}
                        placeholder="https://www.mercadopago.com.br/subscriptions/checkout?..."
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                      />
                      <p className="text-[10px] text-blue-500 mt-1 font-bold italic flex items-center gap-1">
                        <LinkIcon size={10} /> Cole o link gerado no seu painel do Mercado Pago
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddPlan} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Salvar Plano</button>
                    <button onClick={() => setIsAddingPlan(false)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold text-sm">Cancelar</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(!dbPlans || dbPlans.length === 0) ? (
                  <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">Nenhum plano cadastrado ainda.</p>
                    <button 
                      onClick={() => setIsAddingPlan(true)}
                      className="inline-flex items-center gap-2 bg-brand-red text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-brand-red/90 transition-all"
                    >
                      <Plus size={18} /> Criar Primeiro Plano
                    </button>
                  </div>
                ) : (
                  (Array.isArray(dbPlans) ? dbPlans : []).map(plan => (
                    <div key={plan.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative group">
                      <div className="absolute top-4 right-4 flex gap-2 transition opacity-0 group-hover:opacity-100">
                        <button 
                          onClick={() => setEditingPlan(plan)}
                          className="text-gray-300 hover:text-brand-red"
                          title="Editar Plano"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-gray-300 hover:text-red-500"
                          title="Excluir Plano"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {editingPlan?.id === plan.id ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Nome</label>
                            <input 
                              type="text" 
                              value={editingPlan.name}
                              onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none dark:text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Pontual</label>
                              <input 
                                type="number" 
                                value={editingPlan.price}
                                onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Integral</label>
                              <input 
                                type="number" 
                                value={editingPlan.basePrice}
                                onChange={(e) => setEditingPlan({...editingPlan, basePrice: parseFloat(e.target.value)})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="opacity-60">
                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Stripe Price ID</label>
                            <input 
                              type="text" 
                              value={editingPlan.stripePriceId}
                              onChange={(e) => setEditingPlan({...editingPlan, stripePriceId: e.target.value})}
                              className={`w-full bg-gray-50 dark:bg-gray-900 border ${editingPlan.stripePriceId?.startsWith('prod_') ? 'border-red-500' : 'border-gray-200'} dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none dark:text-white`}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Duração (Meses)</label>
                            <select 
                              value={editingPlan.durationMonths || 12}
                              onChange={(e) => setEditingPlan({...editingPlan, durationMonths: parseInt(e.target.value)})}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none dark:text-white"
                            >
                              <option value={1}>1 Mês</option>
                              <option value={3}>3 Meses</option>
                              <option value={6}>6 Meses</option>
                              <option value={12}>12 Meses</option>
                              <option value={24}>24 Meses</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Link de Assinatura (Mercado Pago)</label>
                            <input 
                              type="text" 
                              value={editingPlan.mercadopagoLink}
                              onChange={(e) => setEditingPlan({...editingPlan, mercadopagoLink: e.target.value})}
                              placeholder="https://..."
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none dark:text-white"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={handleUpdatePlan} className="bg-brand-red text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase italic">Salvar</button>
                            <button onClick={() => setEditingPlan(null)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-lg text-[10px] font-bold uppercase italic">Canc</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-gray-900 dark:text-white uppercase mb-4">{plan.name}</h4>
                          <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-lg mb-2">
                              <span className="text-gray-400 font-bold uppercase text-[10px]">Pontualidade:</span>
                              <span className="font-black text-green-600">R$ {typeof plan.price === 'number' ? plan.price.toFixed(2).replace('.', ',') : (plan.price || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400 font-bold uppercase text-[10px]">Integral:</span>
                              <span className="font-bold text-gray-500">R$ {typeof plan.basePrice === 'number' ? plan.basePrice.toFixed(2).replace('.', ',') : (plan.basePrice || 0)}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 space-y-3">
                              <div>
                                <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">Link de Recorrência (MP):</p>
                                <p className={`font-mono text-[10px] truncate ${plan.mercadopagoLink ? 'text-blue-600 bg-blue-50' : 'text-red-500 bg-red-50 font-bold'} dark:bg-gray-900 p-2 rounded flex items-center justify-between`}>
                                  <span>{plan.mercadopagoLink ? "Link Configurado" : 'Pendente - Clique em Editar e cole o link'}</span>
                                  {plan.mercadopagoLink ? <LinkIcon size={12} className="text-green-500" /> : <AlertTriangle size={12} className="animate-pulse" />}
                                </p>
                              </div>
                              <div className="opacity-40">
                                <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">Stripe Price ID (Opcional):</p>
                                <p className="font-mono text-[10px] truncate text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                  {plan.stripePriceId || 'Não vinculado'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
        )}

        {/* ACHIEVEMENTS VIEW */}
        {!loading && activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
              {/* SEASON RESET CALLOUT - BIG & BOLD */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">Gerenciar Conquistas</h3>
                    <p className="text-sm text-gray-400">Crie medalhas personalizadas para seus alunos.</p>
                  </div>
                  <div className="flex items-center gap-2">

                    <button 
                      onClick={() => setIsAddingAchievement(!isAddingAchievement)}
                      className="bg-brand-red text-white p-2 rounded-lg shadow-md hover:bg-red-700 transition"
                    >
                      {isAddingAchievement ? <X size={20} /> : <Plus size={20} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isAddingAchievement && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Conquista</label>
                            <input 
                              type="text" 
                              value={newAchievement.name}
                              onChange={(e) => setNewAchievement({...newAchievement, name: e.target.value})}
                              placeholder="Ex: Guerreiro da Semana"
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Curta</label>
                            <input 
                              type="text" 
                              value={newAchievement.desc}
                              onChange={(e) => setNewAchievement({...newAchievement, desc: e.target.value})}
                              placeholder="Ex: Treinou todos os dias do desafio."
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bônus de XP</label>
                            <input 
                              type="number" 
                              value={newAchievement.xpBonus}
                              onChange={(e) => setNewAchievement({...newAchievement, xpBonus: parseInt(e.target.value) || 0})}
                              placeholder="200"
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Escolha o Ícone</label>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(iconOptions).map(iconKey => {
                              const IconComp = iconOptions[iconKey];
                              return (
                                <button
                                  key={iconKey}
                                  onClick={() => setNewAchievement({...newAchievement, iconName: iconKey})}
                                  className={`p-2 rounded-lg border transition ${newAchievement.iconName === iconKey ? 'bg-brand-red border-brand-red text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                  <IconComp size={20} />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button 
                          onClick={addAchievement}
                          className="w-full bg-brand-red text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-red-700 transition"
                        >
                          Criar Conquista
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {customAchievements.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-gray-400 italic">
                      Nenhuma conquista personalizada criada ainda.
                    </div>
                  ) : (
                    customAchievements.map(ach => {
                      const IconComp = iconOptions[ach.iconName] || Trophy;
                      return (
                        <div key={ach.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                              <IconComp className="w-5 h-5 text-brand-red" />
                            </div>
                            <div>
                               <h4 className="font-bold text-sm dark:text-white leading-tight">{ach.name}</h4>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <p className="text-[10px] text-gray-400 line-clamp-1">{ach.desc}</p>
                                 <span className="text-[9px] font-black text-brand-red uppercase bg-red-50 dark:bg-red-900/20 px-1 rounded flex-shrink-0">+{ach.xpBonus || 0} XP</span>
                               </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteAchievement(ach.id)}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
        )}
        
        {/* CHURN VIEW */}
        {!loading && activeTab === 'churn' && (
          <motion.div
            key="churn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="text-red-500 w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-xl dark:text-white">Alunos em Risco de Evasão</h3>
                    <p className="text-sm text-gray-400">Alunos que não treinam há mais de 10 dias.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveStudents.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                      <TrendingUp className="mx-auto w-12 h-12 text-green-500 mb-4" />
                      <p className="text-gray-500 font-bold">Excelente! Todos os alunos estão ativos.</p>
                    </div>
                  ) : (
                    inactiveStudents.map((s: any) => (
                      <div key={s.id} className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 border-2 border-red-200 dark:border-red-800">
                          {s.photoBase64 ? <img src={s.photoBase64} className="w-full h-full object-cover" /> : <User size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm dark:text-white truncate">{s.name}</h4>
                            <span className="text-[10px] font-bold text-brand-red bg-white/50 dark:bg-black/20 px-1 rounded">Lvl {calculateStudentLevel(s)}</span>
                          </div>
                          <p className={`text-xs font-bold ${s.daysInactive > 15 ? 'text-red-600' : 'text-orange-600'}`}>
                            Inativo há {s.daysInactive} dias
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const whatsappNumber = (s.phone || '').replace(/\D/g,'');
                            const message = encodeURIComponent(`Olá ${s.nickname || s.name}! Sentimos sua falta no tatame! Bora treinar? 🥋🔥`);
                            window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
                          }}
                          className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition shadow-lg"
                          title="Chamar no WhatsApp"
                        >
                           <MessageSquare size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* FAMILY LINKING MODAL */}
      <AnimatePresence>
        {editingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white">Editar Aluno</h3>
                <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editFormData.name}
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-red p-3 rounded-xl outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apelido</label>
                  <input 
                    type="text" 
                    value={editFormData.nickname}
                    onChange={e => setEditFormData({...editFormData, nickname: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-red p-3 rounded-xl outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Login do Sistema</label>
                  <input 
                    type="text" 
                    value={editFormData.studentLogin}
                    onChange={e => setEditFormData({...editFormData, studentLogin: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-red p-3 rounded-xl outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plano</label>
                  <input 
                    type="text" 
                    value={editFormData.plan}
                    onChange={e => setEditFormData({...editFormData, plan: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-red p-3 rounded-xl outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Faixa / Graduação</label>
                  <input 
                    type="text" 
                    value={editFormData.belt}
                    onChange={e => setEditFormData({...editFormData, belt: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-red p-3 rounded-xl outline-none transition-all dark:text-white"
                    placeholder="Ex: Faixa Azul - 1º Grau"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="isInitialGrad"
                    checked={editFormData.isGraduationInitial}
                    onChange={e => setEditFormData({...editFormData, isGraduationInitial: e.target.checked})}
                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                  />
                  <label htmlFor="isInitialGrad" className="text-xs font-bold text-gray-500 uppercase">Graduação Inicial (Não gera XP)</label>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveStudentInfo}
                  className="flex-1 py-3 bg-brand-red text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAMILY LINKING MODAL */}
      <AnimatePresence>
        {isLinkingFamily && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLinkingFamily(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden p-8 shadow-2xl border border-gray-100 dark:border-gray-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">Vincular Família</h3>
                  <p className="text-sm text-gray-500 mt-1">Selecione o titular para <strong>{isLinkingFamily.name}</strong></p>
                </div>
                <button onClick={() => setIsLinkingFamily(null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {isLinkingFamily.parentId && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {allStudents.find(s => s && s.id === isLinkingFamily.parentId)?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Titular Atual</p>
                        <p className="text-sm font-bold dark:text-white">{allStudents.find(s => s && s.id === isLinkingFamily.parentId)?.name || 'Não encontrado'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm(`Deseja remover o vínculo de ${isLinkingFamily.name}?`)) {
                          linkAccount(isLinkingFamily.studentId, null);
                        }
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 text-red-500 rounded-lg text-[10px] font-black uppercase border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-colors shadow-sm"
                    >
                      Remover Vínculo
                    </button>
                  </div>
                </div>
              )}
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  placeholder="Pesquisar por nome..."
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-red dark:focus:bg-gray-800 p-3.5 pl-12 rounded-2xl outline-none transition-all dark:text-white font-medium"
                />
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar px-1">
                {allStudents.filter(os => 
                  os.id !== isLinkingFamily.studentId && 
                  (os.name || '').toLowerCase().includes(familySearch.toLowerCase())
                ).slice(0, 50).map(os => (
                  <div key={os.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent hover:border-brand-red/30 transition-all flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 overflow-hidden shadow-sm border border-gray-100 dark:border-gray-600 shrink-0">
                         {os.photoBase64 ? <img src={os.photoBase64} className="w-full h-full object-cover" /> : <User size={16} className="m-3 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm dark:text-white truncate uppercase italic">{os.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{os.belt}</p>
                        {os.id === isLinkingFamily.parentId && (
                          <p className="text-[8px] text-green-500 font-bold uppercase italic mt-0.5 flex items-center gap-1">
                            <Check size={8} /> Atual Titular
                          </p>
                        )}
                        {os.parentId === isLinkingFamily.studentId && (
                          <p className="text-[8px] text-blue-500 font-bold uppercase italic mt-0.5 flex items-center gap-1">
                            <Check size={8} /> Seu Dependente
                          </p>
                        )}
                        {os.parentId && os.parentId !== isLinkingFamily.studentId && (
                          <p className="text-[8px] text-orange-500 font-bold uppercase italic mt-0.5">
                            Titular: {allStudents.find(p => p.id === os.parentId)?.name || 'Outro'}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button 
                        onClick={() => linkAccount(isLinkingFamily.studentId, os.id, true)}
                        disabled={isLinkingFamily.parentId === os.id}
                        className={`py-2.5 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-md active:scale-95 ${
                          isLinkingFamily.parentId === os.id ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {isLinkingFamily.parentId === os.id ? 'Já é o Titular' : 'Definir como Titular'}
                      </button>
                      <button 
                        onClick={() => linkAccount(os.id, isLinkingFamily.studentId, true)}
                        disabled={os.parentId === isLinkingFamily.studentId}
                        className={`py-2.5 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-md active:scale-95 ${
                          os.parentId === isLinkingFamily.studentId ? 'bg-gray-400' : 'bg-brand-red hover:bg-brand-red/90'
                        }`}
                      >
                        {os.parentId === isLinkingFamily.studentId ? 'Já é Dependente' : 'Add como Dependente'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setIsLinkingFamily(null)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ADICIONAR ALUNO (NOVO) */}
      <AnimatePresence>
        {isAddingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
                <div>
                  <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">
                    {newStudentData.parentId ? 'ADICIONAR DEPENDENTE' : 'NOVO ALUNO'}
                  </h3>
                  {newStudentData.parentId && (
                    <p className="text-xs text-brand-red font-bold uppercase tracking-widest mt-1">
                      Responsável: {newStudentData.parentName}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => {
                    setIsAddingStudent(false);
                    setNewStudentData(prev => ({ ...prev, parentId: '', parentName: '' }));
                  }} 
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all hover:rotate-90"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Nome Completo</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-3.5 text-gray-400 w-5 h-5 group-focus-within:text-brand-red transition-colors" />
                      <input 
                        type="text" 
                        value={newStudentData.name}
                        onChange={e => setNewStudentData({...newStudentData, name: e.target.value})}
                        placeholder="Nome do aluno..."
                        className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-red focus:bg-white dark:focus:bg-gray-800 p-3.5 pl-12 rounded-2xl outline-none transition-all dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Apelido (Opcional)</label>
                    <input 
                      type="text" 
                      value={newStudentData.nickname}
                      onChange={e => setNewStudentData({...newStudentData, nickname: e.target.value})}
                      placeholder="Como ele é chamado?"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-red p-3.5 rounded-2xl outline-none transition-all dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">WhatsApp</label>
                    <input 
                      type="text" 
                      value={newStudentData.phone}
                      onChange={e => setNewStudentData({...newStudentData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-red p-3.5 rounded-2xl outline-none transition-all dark:text-white font-medium font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 p-4 bg-brand-red/5 rounded-2xl border border-brand-red/10 space-y-4 shadow-inner">
                    <p className="text-[10px] font-black text-brand-red uppercase tracking-widest text-center">Acesso ao Aplicativo</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Login</label>
                        <input 
                          type="text" 
                          value={newStudentData.studentLogin}
                          onChange={e => setNewStudentData({...newStudentData, studentLogin: e.target.value.toLowerCase()})}
                          placeholder="usuario.tanque"
                          className="w-full bg-white dark:bg-gray-900 border-2 border-transparent focus:border-brand-red p-3.5 rounded-2xl outline-none transition-all dark:text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Senha</label>
                        <input 
                          type="text" 
                          value={newStudentData.studentPassword}
                          onChange={e => setNewStudentData({...newStudentData, studentPassword: e.target.value})}
                          placeholder="Senha forte"
                          className="w-full bg-white dark:bg-gray-900 border-2 border-transparent focus:border-brand-red p-3.5 rounded-2xl outline-none transition-all dark:text-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Plano</label>
                    <select 
                      value={newStudentData.plan}
                      onChange={e => setNewStudentData({...newStudentData, plan: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-red p-3.5 rounded-2xl outline-none transition-all dark:text-white font-bold"
                    >
                      <option value="Mensal">Mensal</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Dependente">Dependente</option>
                      <option value="Isento">Isento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Graduação</label>
                    <select 
                      value={newStudentData.belt}
                      onChange={e => setNewStudentData({...newStudentData, belt: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-red p-3.5 rounded-2xl outline-none transition-all dark:text-white font-bold"
                    >
                      <option value="Faixa Branca - 0º Grau">Branca</option>
                      <option value="Faixa Cinza - 0º Grau">Cinza</option>
                      <option value="Faixa Amarela - 0º Grau">Amarela</option>
                      <option value="Faixa Laranja - 0º Grau">Laranja</option>
                      <option value="Faixa Verde - 0º Grau">Verde</option>
                      <option value="Faixa Azul - 0º Grau">Azul</option>
                      <option value="Faixa Roxa - 0º Grau">Roxa</option>
                      <option value="Faixa Marrom - 0º Grau">Marrom</option>
                      <option value="Faixa Preta - 0º Grau">Preta</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-gray-800/50 flex gap-4">
                <button 
                  onClick={() => {
                    setIsAddingStudent(false);
                    setNewStudentData(prev => ({ ...prev, parentId: '', parentName: '' }));
                  }}
                  className="flex-1 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddStudent}
                  disabled={loading}
                  className="flex-[2] py-4 bg-brand-red text-white rounded-2xl font-black text-sm shadow-xl shadow-red-500/30 hover:bg-red-700 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Cadastrar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL HISTÓRICO DE XP (ADMIN) */}
      <AnimatePresence>
        {viewingXPHistoryStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setViewingXPHistoryStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Histórico de XP</h3>
                  <p className="text-xs text-brand-red font-bold uppercase tracking-widest">{viewingXPHistoryStudent.name}</p>
                </div>
                <button onClick={() => setViewingXPHistoryStudent(null)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
              </div>
              
              <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                {(() => {
                  const student = viewingXPHistoryStudent;
                  const history: any[] = [];
                  
                  // Attendance
                  if (Array.isArray(student.attendance)) {
                    student.attendance.forEach((date: string) => {
                      history.push({ date, amount: 50, reason: 'Treino Realizado', type: 'attendance' });
                    });
                  }

                  // Achievements
                  if (Array.isArray(student.achievements)) {
                    student.achievements.forEach((achId: string) => {
                      const ach = (Array.isArray(customAchievements) ? customAchievements : []).find(a => a && a.id === achId);
                      if (ach) {
                        history.push({
                          date: student.updatedAt || new Date().toISOString(),
                          amount: ach.xpBonus || 100,
                          reason: `${ach.name} (Conquista)`,
                          type: 'achievement'
                        });
                      }
                    });
                  }
                  
                  // Graduations
                  if (Array.isArray(student.progressLog)) {
                    student.progressLog.forEach((log: any) => {
                      if (log.type === 'graduation' && !log.isInitialRank) {
                        history.push({
                          date: log.date,
                          amount: 1000,
                          reason: `Graduação: ${log.text}`,
                          type: 'graduation'
                        });
                      }
                    });
                  }

                  // Manual Logs (Extra XP, Social XP, Quests)
                  if (Array.isArray(student.xpLog)) {
                    student.xpLog.forEach((log: any) => history.push(log));
                  }
                  
                  // Sort and limit to 10
                  history.sort((a, b) => {
                    const parseDate = (d: any) => {
                       if (!d || typeof d !== 'string') return 0;
                       if (d.includes('/')) {
                         const p = d.split('/');
                         return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`).getTime();
                       }
                       return new Date(d.includes('T') ? d : `${d}T12:00:00`).getTime();
                    };
                    return parseDate(b.date) - parseDate(a.date);
                  });

                  // Add System achievements if possible (mocking date as updatedAt)
                  const totalAtt = Array.isArray(student.attendance) ? student.attendance.length : 0;
                  const systemBadges = [
                    { id: 'first_class', earned: totalAtt >= 1, xpBonus: 100, name: "Primeiro Treino" },
                    { id: 'beginner', earned: totalAtt >= 12, xpBonus: 200, name: "Iniciante" },
                    { id: 'warrior', earned: totalAtt >= 50, xpBonus: 500, name: "Guerreiro" },
                    { id: 'centurion', earned: totalAtt >= 100, xpBonus: 1000, name: "Centurião" },
                    { id: 'casca_grossa', earned: totalAtt >= 200, xpBonus: 2000, name: "Casca Grossa" },
                    { id: 'mestre', earned: totalAtt >= 500, xpBonus: 5000, name: "Mestre" },
                  ];

                  systemBadges.forEach(b => {
                    if (b.earned) {
                      history.push({
                        date: student.updatedAt || new Date().toISOString(),
                        amount: b.xpBonus,
                        reason: `${b.name} (Auto)`,
                        type: 'achievement'
                      });
                    }
                  });

                  // Re-sort after adding system badges
                  history.sort((a, b) => {
                    const parseDate = (d: any) => {
                       if (!d) return 0;
                       if (typeof d === 'object' && d.toDate) return d.toDate().getTime();
                       if (typeof d !== 'string') return 0;
                       if (d.includes('/')) {
                         const p = d.split('/');
                         if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`).getTime();
                       }
                       return new Date(d.includes('T') ? d : `${d}T12:00:00`).getTime();
                    };
                    return parseDate(b.date) - parseDate(a.date);
                  });

                  const recentHistory = history.slice(0, 10);

                  if (recentHistory.length === 0) {
                    return <div className="py-20 text-center text-gray-400 italic">Nenhuma atividade registrada.</div>;
                  }

                  return recentHistory.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                           item.type === 'attendance' ? 'bg-orange-50 text-orange-500' : 
                           item.type === 'achievement' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-500'
                         }`}>
                           {item.type === 'attendance' ? <Flame size={14} /> : 
                            item.type === 'achievement' ? <Trophy size={14} /> : <TrendingUp size={14} />}
                         </div>
                         <div>
                            <p className="text-xs font-bold dark:text-white leading-tight">{item.reason}</p>
                            <p className="text-[9px] text-gray-400">
                               {item.date && item.date.includes('-') && !item.date.includes('/') ? 
                                format(new Date(item.date + (item.date.includes('T') ? '' : 'T12:00:00')), 'dd/MM/yyyy') : 
                                item.date}
                            </p>
                         </div>
                       </div>
                       <div className="text-right flex items-center gap-2">
                         <span className={`text-xs font-black ${Number(item.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                           {Number(item.amount) >= 0 ? `+${item.amount}` : item.amount} XP
                         </span>
                         {(item.type === 'extra' || item.type === 'achievement') && (
                           <button 
                             onClick={() => removeManualXP(student, item)}
                             className="p-1 text-gray-300 hover:text-red-500 transition"
                             title="Remover XP"
                           >
                             <Trash2 size={12} />
                           </button>
                         )}
                       </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
                <button 
                  onClick={() => setViewingXPHistoryStudent(null)}
                  className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl font-bold text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PARA AMPLIAR FOTO */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition p-2"
              >
                <X size={32} />
              </button>
              <img 
                src={selectedPhoto} 
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10" 
                alt="Foto Ampliada" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PARA CORTAR FOTO */}
      <AnimatePresence>
        {croppingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border-t-4 border-brand-red flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Ajustar Foto</h3>
                  <p className="text-xs text-gray-400">Arraste para posicionar e use o zoom para ajustar</p>
                </div>
                <button 
                  onClick={() => { setCroppingStudent(null); setImageSrc(null); }}
                  className="p-2 text-gray-400 hover:text-red-500 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="relative h-80 bg-gray-950">
                <Cropper
                  image={imageSrc || undefined}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <ZoomIn size={12} /> Zoom
                    </span>
                    <span className="text-xs font-bold text-brand-red font-mono">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={4}
                    step={0.1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-red"
                  />
                  <div className="flex justify-between mt-1 px-1">
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.2))} className="text-gray-400 hover:text-brand-red transition"><ZoomOut size={16} /></button>
                    <button onClick={() => setZoom(Math.min(4, zoom + 0.2))} className="text-gray-400 hover:text-brand-red transition"><ZoomIn size={16} /></button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setCroppingStudent(null); setImageSrc(null); }}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCropConfirm}
                    className="flex-[2] py-4 bg-brand-red text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-500/20 hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Salvar Alteração
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
