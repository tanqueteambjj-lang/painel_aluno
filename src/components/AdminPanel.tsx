import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, deleteDoc, doc, onSnapshot, orderBy, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { Users, Calendar, Trash2, Plus, Search, Clock, ShieldCheck, MessageSquare, Loader2, User, XCircle, Camera, Ban, CheckSquare, Square, Trash, Edit2, Check, X, Star, Medal, Target, Flame, Sun, ArrowUpCircle, Award, Shield, Crown, Zap, Trophy, AlertTriangle, TrendingDown, TrendingUp, Cake, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Cropper from 'react-easy-crop';

export default function AdminPanel({ appId, showAlert, showConfirm, onImpersonate, lastMonthRankingAdulto = [], lastMonthRankingInfantil = [] }: any) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  const [extraXPValue, setExtraXPValue] = useState(100);
  const [isLinkingFamily, setIsLinkingFamily] = useState<{ studentId: string, name: string } | null>(null);
  
  // Custom Achievements Management
  const [customAchievements, setCustomAchievements] = useState<any[]>([]);
  const [newAchievement, setNewAchievement] = useState({ name: '', desc: '', iconName: 'Trophy', xpBonus: 200 });
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  
  // Icons helper for custom achievements
  const iconOptions: Record<string, any> = {
    'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Target': Target, 
    'Flame': Flame, 'Sun': Sun, 'Zap': Zap, 'Shield': Shield, 
    'Crown': Crown, 'Award': Award, 'Target-Red': Target,
    'Clock': Clock, 'Users': Users, 'Camera': Camera, 'MessageSquare': MessageSquare
  };

  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [viewingXPHistoryStudent, setViewingXPHistoryStudent] = useState<any | null>(null);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    nickname: '',
    studentLogin: '',
    studentPassword: '',
    plan: 'Mensal',
    belt: 'Faixa Branca - 0º Grau',
    phone: '',
    paymentStatus: 'Em dia'
  });
  
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
  
  // Student Search
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
        paymentStatus: 'Em dia'
      });
      
      await fetchStudents();
      showAlert("Sucesso", "Aluno adicionado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao adicionar aluno.", "error");
    } finally {
      setLoading(false);
    }
  };

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    nickname: '',
    studentLogin: '',
    plan: '',
    belt: '',
    isGraduationInitial: false
  });

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
      const updates: any = {
        name: editFormData.name,
        nickname: editFormData.nickname,
        studentLogin: editFormData.studentLogin,
        plan: editFormData.plan,
        belt: editFormData.belt
      };

      // If belt changed and it's not the same, we might want to log it
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
      
      setAllStudents(prev => prev.map(s => s.id === editingStudent.id ? { 
        ...s, 
        name: editFormData.name,
        nickname: editFormData.nickname,
        studentLogin: editFormData.studentLogin,
        plan: editFormData.plan
      } : s));
      
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? { 
        ...s, 
        name: editFormData.name,
        nickname: editFormData.nickname,
        studentLogin: editFormData.studentLogin,
        plan: editFormData.plan
      } : s));

      setEditingStudent(null);
      showAlert("Sucesso", "Informações do aluno atualizadas!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao salvar informações.", "error");
    }
  };

  const fetchStudents = async () => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('name'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    setAllStudents(list);
    setStudents(list);
  };

  // Cropper state for Admin
  const [croppingStudent, setCroppingStudent] = useState<{ id: string, name: string } | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

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

  useEffect(() => {
    if ((activeTab === 'students' || activeTab === 'achievements') && allStudents.length === 0) {
      fetchStudents();
    }
  }, [activeTab, appId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setStudents(allStudents);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = allStudents.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        (s.studentLogin && s.studentLogin.toLowerCase().includes(q))
      );
      setStudents(filtered);
    }
  }, [searchQuery, allStudents]);

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
    
    // Gym Schedule Listener
    const unsubSchedule = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'), (snap) => {
      const schedule: any[] = [];
      snap.forEach(doc => schedule.push({ id: doc.id, ...doc.data() }));
      setGymSchedule(schedule.sort((a,b) => a.day - b.day || a.time.localeCompare(b.time)));
    });

    // Bookings Listener (for selected date)
    const unsubBookings = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), where('date', '==', selectedBookingDate)),
      (snap) => {
        const booked: any[] = [];
        snap.forEach(doc => booked.push({ id: doc.id, ...doc.data() }));
        setBookings(booked);
      }
    );

    // Feed Listener
    const unsubFeed = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), (snap) => {
      const posts: any[] = [];
      const now = new Date().toISOString();
      let hasExpired = false;

      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.expiresAt && data.expiresAt < now) {
          hasExpired = true;
          // Delete expired post
          deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', docSnap.id)).catch(console.error);
        } else {
          posts.push({ id: docSnap.id, ...data });
        }
      });
      
      if (!hasExpired) {
        setFeedPosts(posts.sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
      }
    });

    // Custom Achievements Listener
    const unsubAchievements = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'adminAchievements'), (snap) => {
      const achs: any[] = [];
      snap.forEach(doc => achs.push({ id: doc.id, ...doc.data() }));
      setCustomAchievements(achs);
      setLoading(false);
    });

    return () => {
      unsubSchedule();
      unsubBookings();
      unsubFeed();
      unsubAchievements();
    };
  }, [appId, selectedBookingDate]);

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
    const xpPerClass = 50;
    const badgeXPBonusMap: Record<string, number> = {
      'first_class': 100, 'beginner': 200, 'monthly_focus': 300, 'streak_5': 250,
      'weekend_warrior': 150, 'voice_tatame': 50, 'degree': 500, 
      'warrior': 500, 'centurion': 1000, 'casca_grossa': 2000, 'mestre': 5000, 'rato_tatame': 400
    };

    const totalAtt = student.attendance ? student.attendance.length : 0;
    
    // Auto badges XP
    let earnedBadgesXP = 0;
    if (totalAtt >= 1) earnedBadgesXP += badgeXPBonusMap['first_class'];
    if (totalAtt >= 12) earnedBadgesXP += badgeXPBonusMap['beginner'];
    if (totalAtt >= 50) earnedBadgesXP += badgeXPBonusMap['warrior'];
    if (totalAtt >= 100) earnedBadgesXP += badgeXPBonusMap['centurion'];
    if (totalAtt >= 200) earnedBadgesXP += badgeXPBonusMap['casca_grossa'];
    if (totalAtt >= 500) earnedBadgesXP += badgeXPBonusMap['mestre'];
    
    if (student.belt && student.belt.toLowerCase().includes('preta')) {
       earnedBadgesXP += 10000; // Matching App.tsx black_belt
    }

    // Progress Log (Graduations) - Matching App.tsx
    if (student.progressLog) {
      student.progressLog.forEach((log: any) => {
        if (log.type === 'graduation' && !log.isInitialRank) {
          if (log.text && log.text.match(/[1-9]º Grau/)) earnedBadgesXP += 250;
          else earnedBadgesXP += 500;
        }
      });
    }

    // Ranking Special Badges & Custom Admin Achievements
    const rankingBadgeValues: Record<string, number> = {
      'rank_1': 1000, 'rank_2': 800, 'rank_3': 600, 'rank_4': 400, 'rank_5': 200
    };
    if (student.achievements) {
      student.achievements.forEach((id: string) => {
        if (rankingBadgeValues[id]) {
          earnedBadgesXP += rankingBadgeValues[id];
        } else {
          // Check for custom achievements
          const custom = customAchievements.find(ca => ca.id === id);
          if (custom) {
            earnedBadgesXP += Number(custom.xpBonus) || 200;
          }
        }
      });
    }

    const userXP = (Number(student.extraXP) || 0) + (totalAtt * xpPerClass) + earnedBadgesXP;
    return Math.floor(Math.sqrt(userXP / 100)) + 1;
  };

  const getStudentAchievements = (student: any) => {
    const badges: any[] = [];
    const totalAtt = student.attendance ? student.attendance.length : 0;
    
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
    if (student.achievements) {
      student.achievements.forEach((achId: string) => {
        const custom = customAchievements.find(ca => ca.id === achId);
        if (custom) {
          const Icon = iconOptions[custom.iconName] || Trophy;
          badges.push({ id: custom.id, icon: <Icon className="w-3 h-3 text-brand-red" />, name: custom.name, isManual: true });
        }
      });
    }

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
        const newLog = [...(student.xpLog || []), xpUpdate];

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

  const linkAccount = async (studentId: string, parentId: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        parentId: parentId
      });
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, parentId } : s));
      setIsLinkingFamily(null);
      showAlert("Sucesso", "Conta vinculada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao vincular conta.", "error");
    }
  };

  const getInactiveStudents = () => {
    const now = new Date();
    return allStudents.map(s => {
      if (!Array.isArray(s.attendance) || s.attendance.length === 0) return { ...s, daysInactive: 999 };
      const lastAtt = new Date([...s.attendance].sort().pop() + 'T12:00:00');
      const diffDays = Math.floor((now.getTime() - lastAtt.getTime()) / (1000 * 60 * 60 * 24));
      return { ...s, daysInactive: diffDays };
    }).filter(s => s.daysInactive >= 10).sort((a,b) => b.daysInactive - a.daysInactive);
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
        updates.xpLog = [...(student.xpLog || []), xpUpdate];
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-red" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* BOOKINGS VIEW */}
          {activeTab === 'bookings' && (
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
                {gymSchedule.filter(c => c.day === new Date(selectedBookingDate + 'T12:00:00').getDay()).map(c => {
                  const classBookings = bookings.filter(b => b.classId === c.id);
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
          {activeTab === 'schedule' && (
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
                    const dayClasses = gymSchedule.filter(c => c.day === day.id);
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
          {activeTab === 'feed' && (
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
                           <span className="text-[9px] text-gray-400">Exp: {format(new Date(post.expiresAt), 'dd/MM')}</span>
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
          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center">
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
                    onClick={fetchStudents}
                    className="bg-brand-red px-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all"
                  >
                    Recarregar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.map(s => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md">
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
                          <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                <h5 className="font-bold dark:text-white text-base truncate max-w-[200px]">{s.name}</h5>
                                {s.nickname && <span className="text-xs text-gray-400 font-medium truncate max-w-[100px]">({s.nickname})</span>}
                                <button 
                                  onClick={() => handleEditStudent(s)}
                                  className="p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-400 hover:text-brand-red transition-all"
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
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                            s.paymentStatus === 'Em dia' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {s.paymentStatus}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{s.belt}</span>
                        </div>
                        {(() => {
                           const isAdult = !(s.plan || '').toLowerCase().includes('infantil');
                           const targetRank = isAdult ? lastMonthRankingAdulto : lastMonthRankingInfantil;
                           const pos = targetRank.findIndex(rs => rs.id === s.id);
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
                    
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <div className="flex gap-2 w-full mb-2">
                        {/* XP Action */}
                        <div className="flex items-center gap-1 flex-1">
                          <input 
                            type="number" 
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-1.5 text-[11px] font-bold outline-none"
                            placeholder="+/- XP"
                            defaultValue={50}
                            id={`xp-${s.id}`}
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`xp-${s.id}`) as HTMLInputElement;
                              const val = parseInt(input?.value || '100');
                              addExtraXP(s.id, val);
                            }}
                            className="bg-brand-red text-white p-1.5 rounded hover:bg-red-700 transition"
                            title="Atribuir XP Extra"
                          >
                            <Zap size={14} />
                          </button>
                        </div>
                        
                        {/* Family Connection */}
                        <button 
                          onClick={() => setIsLinkingFamily({ studentId: s.id, name: s.name })}
                          className={`flex-1 p-1.5 rounded flex items-center justify-center gap-1 text-[9px] font-bold uppercase transition ${s.parentId ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                          <Users size={12} />
                          {s.parentId ? 'Vínculo ok' : 'Vincular'}
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
                ))}
              </div>
            </motion.div>
          )}

          {/* ACHIEVEMENTS VIEW */}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
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

              {/* Assignment Section (Simplified) */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 dark:text-white">Atribuir Conquistas</h3>
                <p className="text-sm text-gray-400 mb-6">Busque um aluno e clique no ícone da conquista para atribuir ou remover.</p>
                
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar alunos..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                  />
                </div>

                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {allStudents.filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10).map(s => (
                    <div key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                           {s.photoBase64 ? (
                             <img 
                               src={s.photoBase64} 
                               className="w-full h-full object-cover cursor-pointer" 
                               onClick={() => setSelectedPhoto(s.photoBase64)}
                             />
                           ) : <User size={16} />}
                         </div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm dark:text-white truncate">{s.name}</p>
                              <span className="text-[9px] font-bold text-brand-red bg-brand-red/5 px-1 rounded border border-brand-red/10">Lvl {calculateStudentLevel(s)}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">{s.belt}</p>
                         </div>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-md">
                        {/* XP Penalty/Bonus Section */}
                        <div className="flex items-center gap-2 mb-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex flex-col gap-1 items-center px-1 border-r border-gray-200 dark:border-gray-700 pr-2">
                             <div className="flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg">
                               <button 
                                 id={`bonus-${s.id}`}
                                 onClick={() => {
                                   document.getElementById(`bonus-${s.id}`)?.classList.add('bg-white', 'text-green-600');
                                   document.getElementById(`bonus-${s.id}`)?.classList.remove('text-gray-400');
                                   document.getElementById(`penalty-${s.id}`)?.classList.remove('bg-white', 'text-red-500');
                                   document.getElementById(`penalty-${s.id}`)?.classList.add('text-gray-400');
                                 }}
                                 className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-white text-green-600 shadow-sm transition-all"
                               >Bônus</button>
                               <button 
                                 id={`penalty-${s.id}`}
                                 onClick={() => {
                                   document.getElementById(`penalty-${s.id}`)?.classList.add('bg-white', 'text-red-500');
                                   document.getElementById(`penalty-${s.id}`)?.classList.remove('text-gray-400');
                                   document.getElementById(`bonus-${s.id}`)?.classList.remove('bg-white', 'text-green-600');
                                   document.getElementById(`bonus-${s.id}`)?.classList.add('text-gray-400');
                                 }}
                                 className="px-2 py-0.5 rounded-md text-[8px] font-bold text-gray-400 hover:text-red-500 transition-all"
                               >Penalidade</button>
                             </div>
                          </div>
                          <input 
                            type="number" 
                            placeholder="Valor" 
                            className="bg-transparent text-sm font-bold w-full outline-none dark:text-white"
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                let val = Math.abs(parseInt((e.target as HTMLInputElement).value));
                                if (isNaN(val)) return;
                                
                                const isPenalty = document.getElementById(`penalty-${s.id}`)?.classList.contains('bg-white');
                                if (isPenalty) val = -val;

                                const reason = prompt(val < 0 ? "Motivo da penalidade:" : "Motivo do bônus:");
                                if (reason) {
                                  await addExtraXP(s.id, val, reason);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                          <p className="text-[8px] text-gray-400 font-bold uppercase whitespace-nowrap">Enter</p>
                        </div>

                        {/* Achievements Display and Toggle */}
                        <div className="flex flex-wrap gap-2">
                           {/* System Achievements Display (View Only) */}
                           {getStudentAchievements(s).filter(a => !customAchievements.some(ca => ca.id === a.id)).map(a => (
                             <div key={a.id} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 opacity-60 flex items-center gap-1" title={`${a.name}: ${a.desc} (Auto)`}>
                               <Trophy size={14} />
                             </div>
                           ))}

                           {/* Custom Achievements (Toggleable) */}
                           {customAchievements.map(ach => {
                             const IconComp = iconOptions[ach.iconName] || Trophy;
                             const hasAch = (s.achievements || []).includes(ach.id);
                             return (
                               <button
                                 key={ach.id}
                                 onClick={() => toggleAchievementForStudent(s, ach.id)}
                                 className={`p-1.5 rounded-lg border transition flex items-center gap-2 ${hasAch ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-red-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 shadow-sm'}`}
                                 title={`${ach.name}: ${ach.description || ach.desc}`}
                               >
                                 <IconComp size={14} />
                                 {hasAch && <Check size={10} />}
                               </button>
                             );
                           })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {allStudents.length === 0 && (
                     <div className="py-10 text-center text-gray-400 italic">
                        Carregando alunos...
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {/* CHURN VIEW */}
          {activeTab === 'churn' && (
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
                  {getInactiveStudents().length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                      <TrendingUp className="mx-auto w-12 h-12 text-green-500 mb-4" />
                      <p className="text-gray-500 font-bold">Excelente! Todos os alunos estão ativos.</p>
                    </div>
                  ) : (
                    getInactiveStudents().map(s => (
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
                          onClick={() => window.open(`https://wa.me/${(s.phone || '').replace(/\D/g,'')}?text=Olá ${s.nickname || s.name}! Sentimos sua falta no tatame! Bora treinar? 🥋🔥`, '_blank')}
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
      )}

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
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 dark:text-white">Vincular Família</h3>
              <p className="text-sm text-gray-500 mb-6">Selecione o Titular da Família para <strong>{isLinkingFamily.name}</strong>.</p>
              
              <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                {allStudents.filter(os => os.id !== isLinkingFamily.studentId && !os.parentId).map(os => (
                  <button
                    key={os.id}
                    onClick={() => linkAccount(isLinkingFamily.studentId, os.id)}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-brand-red transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                       {os.photoBase64 ? <img src={os.photoBase64} className="w-full h-full object-cover" /> : <User size={16} className="m-2" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm dark:text-white">{os.name}</p>
                      <p className="text-[10px] text-gray-500">{os.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setIsLinkingFamily(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-sm"
              >
                Cancelar
              </button>
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
                      const ach = [...adminAchievements, ...achievements].find(a => a.id === achId);
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
                  
                  // Manual Logs
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
                       if (!d || typeof d !== 'string') return 0;
                       if (d.includes('/')) {
                         const p = d.split('/');
                         return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`).getTime();
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
