import React, { useState } from 'react';
import { 
  Calendar, 
  Award, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Trophy, 
  FileText,
  User,
  Zap,
  Star,
  Printer,
  ChevronLeft,
  ChevronRight,
  List,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentProgressProps {
  activeUserData: any;
  renderBeltSVG: (beltStr: string) => React.ReactNode;
  userLevel?: number;
  userXP?: number;
}

export default function StudentProgress({ activeUserData, renderBeltSVG, userLevel, userXP }: StudentProgressProps) {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'notes'>('attendance');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'grouped' | 'calendar'>('grouped');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showReportModal, setShowReportModal] = useState(false);

  // 1. Enrollment date
  const getEnrollmentDate = () => {
    const rawDate = activeUserData?.registrationDate || activeUserData?.createdAt;
    if (!rawDate) return 'Não cadastrada';

    try {
      // If rawDate is firestore timestamp
      if (rawDate && typeof rawDate === 'object' && 'seconds' in rawDate) {
        const dateObj = new Date(rawDate.seconds * 1000);
        return dateObj.toLocaleDateString('pt-BR');
      }

      // If rawDate is string e.g. YYYY-MM-DD or ISO string
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : '';
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      }
      return new Date(rawDate).toLocaleDateString('pt-BR');
    } catch (e) {
      console.error("Error formatting registration date", e);
      return String(rawDate);
    }
  };

  // 2. Attendance history (dates)
  const attendanceDates: string[] = Array.isArray(activeUserData?.attendance) 
    ? [...activeUserData.attendance].sort((a, b) => b.localeCompare(a)) 
    : [];

  const attendanceLogs: any[] = Array.isArray(activeUserData?.attendanceLog)
    ? [...activeUserData.attendanceLog].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      })
    : [];

  // Helper to get formatted day of the week and full date
  const formatAttendanceDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      return {
        weekday: weekdays[date.getDay()],
        formatted: `${day} de ${months[month - 1]} de ${year}`,
        short: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
      };
    } catch (e) {
      return { weekday: 'Treino', formatted: dateStr, short: dateStr };
    }
  };

  // 3. Merging Teacher Notes / Technical Progress History
  // We'll support both progressHistory (from other admin panels) and progressLog (from this system)
  const getMergedProgressHistory = () => {
    const list: any[] = [];
    const seenKeys = new Set<string>();

    const parseTextAndInstructor = (rawText: string, defaultInstructor: string) => {
      if (!rawText) return { parsedText: '', parsedInstructor: defaultInstructor };

      // 1. Try splitting by last ", " or ","
      const lastCommaIndex = rawText.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        const textPart = rawText.substring(0, lastCommaIndex).trim();
        const authorPart = rawText.substring(lastCommaIndex + 1).trim();
        const upperAuthor = authorPart.toUpperCase();
        const commonTitles = ['MESTRE', 'PROFESSOR', 'PROF', 'COACH', 'SENSEI', 'INSTRUTOR', 'SALES', 'ALUNO', 'SILVA'];
        const hasTitle = commonTitles.some(title => upperAuthor.includes(title));
        
        if (authorPart.length > 0 && authorPart.length < 35 && (hasTitle || /^[A-Z\s]+$/.test(authorPart))) {
          const finalInst = (defaultInstructor === 'Sistema' || defaultInstructor === 'Professor' || !defaultInstructor) ? authorPart : defaultInstructor;
          return { parsedText: textPart, parsedInstructor: finalInst };
        }
      }

      // 2. Try splitting by " - "
      const lastDashIndex = rawText.lastIndexOf(' - ');
      if (lastDashIndex !== -1) {
        const textPart = rawText.substring(0, lastDashIndex).trim();
        const authorPart = rawText.substring(lastDashIndex + 3).trim();
        const upperAuthor = authorPart.toUpperCase();
        const commonTitles = ['MESTRE', 'PROFESSOR', 'PROF', 'COACH', 'SENSEI', 'INSTRUTOR', 'SALES', 'ALUNO', 'SILVA'];
        const hasTitle = commonTitles.some(title => upperAuthor.includes(title));
        
        if (authorPart.length > 0 && authorPart.length < 35 && (hasTitle || /^[A-Z\s]+$/.test(authorPart))) {
          const finalInst = (defaultInstructor === 'Sistema' || defaultInstructor === 'Professor' || !defaultInstructor) ? authorPart : defaultInstructor;
          return { parsedText: textPart, parsedInstructor: finalInst };
        }
      }

      // 3. Try splitting by case-insensitive " por "
      const porRegex = /\s+por\s+/i;
      const match = rawText.match(porRegex);
      if (match && match.index !== undefined) {
        const textPart = rawText.substring(0, match.index).trim();
        const authorPart = rawText.substring(match.index + match[0].length).trim();
        if (authorPart.length > 0 && authorPart.length < 35) {
          const finalInst = (defaultInstructor === 'Sistema' || defaultInstructor === 'Professor' || !defaultInstructor) ? authorPart : defaultInstructor;
          return { parsedText: textPart, parsedInstructor: finalInst };
        }
      }

      return { parsedText: rawText, parsedInstructor: defaultInstructor };
    };

    // Parse progressHistory
    const rawProgressHistory = activeUserData?.progressHistory || [];
    if (Array.isArray(rawProgressHistory)) {
      rawProgressHistory.forEach((item: any, idx) => {
        if (!item) return;
        const date = item.date || item.timestamp || '';
        const rawText = item.text || item.note || item.comment || item.description || '';
        const uniqueKey = `history-${date}-${rawText}-${idx}`;
        if (!seenKeys.has(uniqueKey) && rawText) {
          seenKeys.add(uniqueKey);

          // author contains the name of the professor or admin who inserted the annotation.
          // Otherwise, check other fields or default to 'Sistema'.
          const defaultInst = item.author || item.instructor || item.teacher || item.professor || item.by || 'Sistema';
          const { parsedText, parsedInstructor } = parseTextAndInstructor(rawText, defaultInst);

          list.push({
            ...item,
            id: uniqueKey,
            date: date,
            text: parsedText,
            instructor: parsedInstructor,
            type: item.type || 'evaluation',
            title: item.title || 'Avaliação Técnica'
          });
        }
      });
    }

    // Parse progressLog
    const rawProgressLog = activeUserData?.progressLog || [];
    if (Array.isArray(rawProgressLog)) {
      rawProgressLog.forEach((item: any, idx) => {
        if (!item) return;
        const date = item.date || item.timestamp || '';
        const rawText = item.text || item.note || item.comment || '';
        const uniqueKey = `log-${date}-${rawText}-${idx}`;
        if (!seenKeys.has(uniqueKey) && rawText) {
          seenKeys.add(uniqueKey);

          // author contains the name of the professor or admin who inserted the annotation.
          // Otherwise, check other fields or default to 'Sistema'.
          const defaultInst = item.author || item.instructor || item.teacher || item.professor || item.by || 'Sistema';
          const { parsedText, parsedInstructor } = parseTextAndInstructor(rawText, defaultInst);

          list.push({
            ...item,
            id: uniqueKey,
            date: date,
            text: parsedText,
            instructor: parsedInstructor,
            type: item.type || 'graduation',
            title: item.type === 'graduation' ? 'Graduação de Faixa' : 'Anotação do Professor'
          });
        }
      });
    }

    // Sort by date descending (most recent first)
    return list.sort((a, b) => {
      // Handle different date formats (e.g. DD/MM/YYYY vs YYYY-MM-DD or standard strings)
      const parseDateToComparable = (dStr: string) => {
        if (!dStr) return 0;
        if (dStr.includes('-')) {
          return new Date(dStr).getTime() || 0;
        }
        if (dStr.includes('/')) {
          const [day, month, year] = dStr.split('/').map(Number);
          return new Date(year, month - 1, day).getTime() || 0;
        }
        return new Date(dStr).getTime() || 0;
      };

      return parseDateToComparable(b.date) - parseDateToComparable(a.date);
    });
  };

  const progressEvents = getMergedProgressHistory();

  // Training streaks calculation
  const calculateCurrentStreak = () => {
    if (attendanceDates.length === 0) return 0;
    
    // Get local date as string (YYYY-MM-DD)
    const getLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    // If they haven't trained today or yesterday, streak is 0
    if (!attendanceDates.includes(todayStr) && !attendanceDates.includes(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    const checkDate = new Date();
    
    // If they didn't train today but did yesterday, start checking from yesterday
    if (!attendanceDates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = getLocalDateStr(checkDate);
      if (attendanceDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateCurrentStreak();

  // Helper to group attendance by month
  const getGroupedAttendance = () => {
    const groups: { [key: string]: { dateStr: string; details: any; logs: any[] }[] } = {};
    const monthsNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    attendanceDates.forEach(dateStr => {
      try {
        const [year, month] = dateStr.split('-');
        const monthLabel = `${monthsNames[parseInt(month) - 1]} de ${year}`;
        if (!groups[monthLabel]) {
          groups[monthLabel] = [];
        }
        const details = formatAttendanceDate(dateStr);
        const logs = attendanceLogs.filter(l => l?.date === dateStr);
        groups[monthLabel].push({ dateStr, details, logs });
      } catch (e) {
        console.error("Error grouping attendance by month:", e);
      }
    });

    return Object.entries(groups).map(([monthLabel, items]) => ({
      monthLabel,
      items,
      count: items.length
    }));
  };

  const groupedAttendance = getGroupedAttendance();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();

  const getCalendarMonthTitle = () => {
    const monthsNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthsNames[calendarDate.getMonth()]} de ${calendarDate.getFullYear()}`;
  };

  const getDayString = (day: number) => {
    const y = calendarDate.getFullYear();
    const m = String(calendarDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${y}-${m}-${dStr}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150 dark:border-zinc-800 p-6 md:p-8 relative overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          {/* Avatar/Photo */}
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-brand-red/20 dark:border-brand-red/40 overflow-hidden shadow-md shrink-0 bg-gray-100 dark:bg-gray-750 flex items-center justify-center">
            {activeUserData?.photoBase64 ? (
              <img 
                src={activeUserData.photoBase64} 
                alt={activeUserData.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>

          {/* Student Profile Info */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
              <h3 className="font-display text-2xl md:text-3xl font-black text-brand-dark dark:text-white uppercase tracking-tight">
                {activeUserData?.nickname || activeUserData?.name || "Atleta"}
              </h3>
              {activeUserData?.role === 'admin' && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 w-fit mx-auto md:mx-0">
                  Professor / Admin
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {activeUserData?.belt || "Faixa Branca - 0º Grau"}
            </p>

            {/* Belt render */}
            <div className="w-48 h-8 rounded border border-black/15 shadow-sm overflow-hidden mx-auto md:mx-0 mt-2 bg-zinc-100 dark:bg-zinc-900">
              {renderBeltSVG(activeUserData?.belt || "Faixa Branca - 0º Grau")}
            </div>
          </div>

          {/* Quick Streaks & Belt Info */}
          <div className="flex flex-wrap justify-center gap-3 md:justify-end items-center">
            <div className="bg-orange-500/10 dark:bg-orange-500/5 border border-orange-500/20 px-4 py-3 rounded-xl text-center shrink-0">
              <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-widest">
                Sequência Atual
              </p>
              <div className="flex items-center justify-center gap-1 mt-1 text-orange-600 dark:text-orange-400 font-black">
                <Zap className="w-5 h-5 fill-current animate-pulse" />
                <span className="text-2xl">{currentStreak}</span>
                <span className="text-xs font-bold uppercase tracking-wider">dias</span>
              </div>
            </div>

            <div className="bg-brand-red/10 dark:bg-brand-red/5 border border-brand-red/20 px-4 py-3 rounded-xl text-center shrink-0">
              <p className="text-[10px] font-black uppercase text-brand-red dark:text-brand-red tracking-widest">
                Total de Aulas
              </p>
              <div className="flex items-center justify-center gap-1 mt-1 text-brand-red font-black">
                <Trophy className="w-5 h-5" />
                <span className="text-2xl">{attendanceDates.length}</span>
                <span className="text-xs font-bold uppercase tracking-wider">Treinos</span>
              </div>
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="bg-brand-dark hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-brand-dark px-4 py-3.5 rounded-xl text-center flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 font-black text-xs uppercase tracking-wider transition shadow-md shrink-0 w-full sm:w-auto cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5 text-brand-red" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-150 dark:border-zinc-800/80 text-sm">
          <div className="flex items-center justify-center sm:justify-start gap-2.5 text-gray-600 dark:text-gray-300">
            <Calendar className="w-4.5 h-4.5 text-brand-red shrink-0" />
            <div>
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Data de Matrícula
              </span>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                {getEnrollmentDate()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2.5 text-gray-600 dark:text-gray-300">
            <Award className="w-4.5 h-4.5 text-brand-red shrink-0" />
            <div>
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Graus Atuais
              </span>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                {activeUserData?.belt?.match(/(\d)º/) ? `${activeUserData.belt.match(/(\d)º/)[1]}º Grau` : '0º Grau'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2.5 text-gray-600 dark:text-gray-300">
            <TrendingUp className="w-4.5 h-4.5 text-brand-red shrink-0" />
            <div>
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Nível do Atleta
              </span>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                Nível {userLevel !== undefined ? userLevel : (Math.floor(Math.sqrt((activeUserData?.extraXP || 0) / 100)) + 1)}
                {userXP !== undefined && <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">({userXP} XP)</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Selection Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700/80 gap-6">
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all relative shrink-0 ${
            activeSubTab === 'attendance'
              ? 'text-brand-red font-black'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span>Histórico de Presenças</span>
          {activeSubTab === 'attendance' && (
            <motion.div 
              layoutId="activeSubTabIndicator" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" 
            />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('notes')}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'notes'
              ? 'text-brand-red font-black'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span>Evolução & Notas do Professor</span>
          {progressEvents.length > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-brand-red text-white">
              {progressEvents.length}
            </span>
          )}
          {activeSubTab === 'notes' && (
            <motion.div 
              layoutId="activeSubTabIndicator" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" 
            />
          )}
        </button>
      </div>

      {/* 3. Content Panel */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'attendance' ? (
          <motion.div
            key="attendance-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {attendanceDates.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-150 dark:border-zinc-800">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h4 className="text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-tight text-sm">
                  Nenhum treino registrado
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Sua frequência será mostrada aqui assim que você realizar o primeiro check-in de aula.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* View Mode Switcher */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-150 dark:border-zinc-800/80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-red/10 rounded-xl">
                      <Clock className="w-5 h-5 text-brand-red" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        Aulas assistidas e frequência
                      </h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                        Total de {attendanceDates.length} treinos no prontuário do aluno
                      </p>
                    </div>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-gray-750 p-1 rounded-xl border border-gray-200/50 dark:border-zinc-700/85 w-full sm:w-auto">
                    <button
                      onClick={() => setAttendanceViewMode('grouped')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                        attendanceViewMode === 'grouped'
                          ? 'bg-white dark:bg-gray-800 text-brand-red shadow-sm'
                          : 'text-gray-550 dark:text-gray-400 hover:text-gray-850 dark:hover:text-zinc-200'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>Organizado por Mês</span>
                    </button>
                    <button
                      onClick={() => setAttendanceViewMode('calendar')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                        attendanceViewMode === 'calendar'
                          ? 'bg-white dark:bg-gray-800 text-brand-red shadow-sm'
                          : 'text-gray-550 dark:text-gray-400 hover:text-gray-850 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Calendário</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (Grouped List or Interactive Calendar Grid) */}
                  <div className="lg:col-span-2 space-y-4">
                    {attendanceViewMode === 'grouped' ? (
                      /* Grouped by Month View */
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {groupedAttendance.map(({ monthLabel, items, count }) => (
                          <div 
                            key={monthLabel} 
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-zinc-800/80 p-5 shadow-sm space-y-3.5"
                          >
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/60 pb-2.5">
                              <h5 className="font-extrabold text-sm text-gray-800 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-red" />
                                {monthLabel}
                              </h5>
                              <span className="text-[10px] font-black uppercase tracking-wider bg-brand-red/10 text-brand-red px-2.5 py-1 rounded-full">
                                {count} {count === 1 ? 'Treino' : 'Treinos'}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {items.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-zinc-750/30 rounded-xl transition border border-transparent hover:border-gray-100 dark:hover:border-zinc-800/40"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-red/5 flex items-center justify-center shrink-0">
                                      <CheckCircle className="w-4.5 h-4.5 text-brand-red" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none">
                                        {item.details.weekday}
                                      </p>
                                      <h6 className="font-bold text-gray-800 dark:text-zinc-200 text-xs mt-1">
                                        {item.details.formatted}
                                      </h6>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {item.logs.map((log, logIdx) => (
                                      <span 
                                        key={logIdx} 
                                        className="text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md"
                                      >
                                        {log.time || 'Presença'}
                                      </span>
                                    ))}
                                    {item.logs.length === 0 && (
                                      <span className="text-[9px] font-black uppercase tracking-wider bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-md">
                                        Presença
                                      </span>
                                    )}
                                    <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 shrink-0">
                                      {item.details.short}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Interactive Training Calendar View */
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800/85">
                          <h5 className="font-extrabold text-sm text-gray-800 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                            <Calendar className="w-4.5 h-4.5 text-brand-red" />
                            {getCalendarMonthTitle()}
                          </h5>
                          
                          <div className="flex gap-1.5">
                            <button
                              onClick={handlePrevMonth}
                              className="p-1.5 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-lg transition cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleNextMonth}
                              className="p-1.5 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-lg transition cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 pb-1.5">
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day}>{day}</div>
                          ))}
                        </div>

                        {/* Calendar Grid Days */}
                        <div className="grid grid-cols-7 gap-2">
                          {(() => {
                            const cells = [];
                            // Empty cells for padding before the first day
                            for (let i = 0; i < firstDayIndex; i++) {
                              cells.push(
                                <div key={`empty-${i}`} className="aspect-square bg-transparent rounded-lg border border-transparent" />
                              );
                            }
                            
                            // Days in the month
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dayStr = getDayString(day);
                              const hasTrained = attendanceDates.includes(dayStr);
                              const logsOnThisDay = attendanceLogs.filter(l => l?.date === dayStr);
                              
                              cells.push(
                                <div 
                                  key={`day-${day}`} 
                                  className={`aspect-square flex flex-col items-center justify-center rounded-xl relative border transition duration-200 group cursor-pointer ${
                                    hasTrained 
                                      ? 'bg-brand-red/10 dark:bg-brand-red/15 border-brand-red/35 dark:border-brand-red/50 text-brand-red font-black text-xs sm:text-sm' 
                                      : 'border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-850/20 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 text-xs sm:text-sm'
                                  }`}
                                >
                                  <span>{day}</span>
                                  
                                  {hasTrained && (
                                    <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-brand-red rounded-full" />
                                  )}

                                  {/* Interactive Tooltip containing times */}
                                  {hasTrained && logsOnThisDay.length > 0 && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-brand-dark dark:bg-zinc-900 border border-zinc-700 text-white text-[9px] py-1 px-2.5 rounded-lg shadow-xl z-[150] font-sans font-normal whitespace-nowrap leading-tight pointer-events-none">
                                      {logsOnThisDay.map((log, index) => (
                                        <div key={index} className="uppercase font-bold tracking-wider">{log.time || 'Presença Confirmada'}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return cells;
                          })()}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-brand-red/10 border border-brand-red/30 rounded-md" />
                            <span>Treino Realizado</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-gray-50 dark:bg-zinc-850/20 border border-gray-100 dark:border-zinc-800 rounded-md" />
                            <span>Sem registro</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column (Training Stats / Summary Box) */}
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm">
                      <h4 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-3">
                        Distribuição Mensal
                      </h4>

                      {/* Simple summary counts by Month */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {(() => {
                          const monthCounts: Record<string, number> = {};
                          const monthsNames = [
                            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                          ];

                          attendanceDates.forEach(dateStr => {
                            try {
                              const [year, month] = dateStr.split('-');
                              const label = `${monthsNames[parseInt(month) - 1]} / ${year}`;
                              monthCounts[label] = (monthCounts[label] || 0) + 1;
                            } catch (e) {
                              console.error("Error calculating month counts", e);
                            }
                          });

                          const sortedMonths = Object.entries(monthCounts);

                          if (sortedMonths.length === 0) return <p className="text-xs text-gray-400 font-bold">Sem dados.</p>;

                          // Max month count for percentage calculation
                          const maxVal = Math.max(...sortedMonths.map(([_, v]) => v), 1);

                          return sortedMonths.map(([monthLabel, count]) => {
                            const percent = Math.min(100, Math.round((count / maxVal) * 100));
                            return (
                              <div key={monthLabel} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-zinc-300">
                                  <span>{monthLabel}</span>
                                  <span className="text-brand-red font-black">{count} treinos</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-brand-red rounded-full" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div className="bg-brand-dark text-white p-5 rounded-2xl shadow-md border border-gray-800 relative overflow-hidden">
                      <div className="absolute right-[-10px] bottom-[-10px] text-white/5 font-black text-7xl select-none">BJJ</div>
                      <h4 className="text-[10px] font-black uppercase text-brand-red tracking-widest mb-1.5">
                        Compromisso
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium">
                        &ldquo;A consistência é o caminho mais curto para a excelência técnica. Cada treino é um tijolo na construção da sua faixa preta.&rdquo;
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs font-black text-brand-red uppercase">
                        <span>Oss!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="notes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {progressEvents.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-150 dark:border-zinc-800">
                <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h4 className="text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-tight text-sm">
                  Nenhuma anotação técnica
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  As anotações, notas de treino, graus e avaliações dos professores serão mostradas aqui em uma linha do tempo.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-brand-red/30 dark:border-brand-red/20 pl-6 ml-4 space-y-6 py-2">
                {progressEvents.map((event, idx) => {
                  const isGraduation = event.type === 'graduation';
                  
                  return (
                    <div key={event.id || idx} className="relative">
                      {/* Timeline Dot/Icon */}
                      <span className={`absolute left-[-33px] top-1 flex items-center justify-center w-7.5 h-7.5 rounded-full ring-4 ring-white dark:ring-gray-900 ${
                        isGraduation 
                          ? 'bg-yellow-500 text-white shadow-md' 
                          : 'bg-brand-red text-white'
                      }`}>
                        {isGraduation ? <Award className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                      </span>

                      {/* Card Content */}
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 dark:border-zinc-800/80 pb-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-400">
                              {event.title || (isGraduation ? 'Graduação' : 'Anotação')}
                            </span>
                            <h5 className="font-extrabold text-gray-800 dark:text-zinc-100 text-sm uppercase tracking-tight mt-1">
                              {isGraduation ? `Graduação: ${event.text}` : (event.title || 'Avaliação Técnica')}
                            </h5>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-xs font-bold text-brand-red">
                              {event.date}
                            </p>
                            {event.instructor && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-0.5">
                                Por: {event.instructor}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold whitespace-pre-wrap">
                          {event.text || event.note || event.comment}
                        </div>

                        {/* If they added grades/degrees */}
                        {(event.degrees !== undefined || event.degree !== undefined) && (
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Grau concedido: {event.degrees || event.degree}º</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Complete and Organized Printable Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-150 dark:border-zinc-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-850/35 no-print">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-brand-red" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-800 dark:text-zinc-100 uppercase tracking-tight">
                    Visualização do Relatório
                  </h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
                    Imprima ou salve em PDF o prontuário completo de {activeUserData?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-650 text-gray-500 dark:text-gray-400 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content (Screen Preview) */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-zinc-900 custom-scrollbar">
              {/* Print Sheet Simulation */}
              <div className="bg-white text-gray-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-gray-200 mx-auto max-w-2xl font-sans" id="printable-area-preview">
                {/* Stylesheet specifically for printing */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    /* Hide screen container elements */
                    body * {
                      visibility: hidden;
                    }
                    #printable-sheet, #printable-sheet * {
                      visibility: visible !important;
                    }
                    #printable-sheet {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 20px !important;
                      box-shadow: none !important;
                      border: none !important;
                      background: white !important;
                      color: black !important;
                    }
                    /* Reset layout constraints on all parents during printing */
                    .fixed, .inset-0, .backdrop-blur-sm, .overflow-hidden, .overflow-y-auto, .max-h-\\[90vh\\] {
                      position: relative !important;
                      overflow: visible !important;
                      max-height: none !important;
                      background: transparent !important;
                      backdrop-filter: none !important;
                      box-shadow: none !important;
                      border: none !important;
                      padding: 0 !important;
                    }
                    #printable-area-preview {
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      background: transparent !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

                {/* This div represents the printable sheet layout */}
                <div id="printable-sheet" className="space-y-6">
                  {/* Report Header */}
                  <div className="border-b-4 border-brand-dark pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-brand-dark">
                        TANQUE TEAM - BJJ
                      </h1>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-red">
                        Prontuário Oficial do Atleta
                      </p>
                    </div>
                    <div className="text-left sm:text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                      <p>Ficha de Rendimento Desportivo</p>
                    </div>
                  </div>

                  {/* Student Dossier Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                    <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Atleta</span>
                      <span className="font-extrabold text-gray-800">{activeUserData?.name || "Atleta Tanque Team"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Graduação</span>
                      <span className="font-extrabold text-brand-red">{activeUserData?.belt || "Faixa Branca"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Início</span>
                      <span className="font-extrabold text-gray-800">{getEnrollmentDate()}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Frequência Total</span>
                      <span className="font-extrabold text-gray-800">{attendanceDates.length} Aulas</span>
                    </div>
                  </div>

                  {/* Stats & KPIs */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 border border-gray-200 rounded-xl">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Frequência Geral</span>
                      <span className="text-lg font-black text-gray-800">{attendanceDates.length}</span>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-xl">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Sequência Atual</span>
                      <span className="text-lg font-black text-gray-800">{currentStreak} dias</span>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-xl">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Nível Conquistado</span>
                      <span className="text-lg font-black text-gray-800">
                        Nvl {userLevel !== undefined ? userLevel : (Math.floor(Math.sqrt((activeUserData?.extraXP || 0) / 100)) + 1)}
                      </span>
                    </div>
                  </div>

                  {/* Monthly Attendance breakdown */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-brand-dark tracking-wider border-b border-gray-200 pb-1">
                      I. Distribuição de Presenças por Mês
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {groupedAttendance.map(({ monthLabel, count }) => (
                        <div key={monthLabel} className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg text-[11px] border border-gray-100">
                          <span className="font-bold text-gray-600">{monthLabel}</span>
                          <span className="font-black text-brand-red">{count} {count === 1 ? 'treino' : 'treinos'}</span>
                        </div>
                      ))}
                      {groupedAttendance.length === 0 && (
                        <p className="text-[11px] text-gray-400 italic font-semibold">Nenhum treino registrado até o momento.</p>
                      )}
                    </div>
                  </div>

                  {/* Detailed attendance dates log */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-brand-dark tracking-wider border-b border-gray-200 pb-1">
                      II. Histórico Detalhado de Treinos
                    </h3>
                    {attendanceDates.length === 0 ? (
                      <p className="text-xs text-gray-400 italic font-semibold">Nenhuma presença confirmada.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                        {attendanceDates.slice().reverse().map((dateStr, idx) => {
                          const details = formatAttendanceDate(dateStr);
                          const logs = attendanceLogs.filter(l => l?.date === dateStr);
                          const timeStr = logs.map(l => l.time).join(', ') || 'Presencial';
                          return (
                            <div key={idx} className="p-2 border border-gray-150 rounded-lg bg-gray-50/40 flex flex-col justify-between">
                              <span className="font-bold text-gray-800">{details.formatted}</span>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{details.weekday} • {timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Instructor progress notes & evaluations */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-brand-dark tracking-wider border-b border-gray-200 pb-1">
                      III. Evolução Técnica & Observações do Professor
                    </h3>
                    {progressEvents.length === 0 ? (
                      <p className="text-xs text-gray-400 italic font-semibold">Nenhuma evolução ou nota técnica cadastrada pelo instrutor.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {progressEvents.map((event: any, idx: number) => (
                          <div key={idx} className="text-[10px] space-y-1 bg-gray-50/50 p-3 rounded-lg border border-gray-150">
                            <div className="flex justify-between items-start font-bold">
                              <span className="text-gray-800 uppercase tracking-tight">Avaliação Técnica / Graduação</span>
                              <span className="text-brand-red">{event.date}</span>
                            </div>
                            <p className="text-gray-600 leading-relaxed italic">&ldquo;{event.text || event.note || event.comment}&rdquo;</p>
                            {(event.degrees !== undefined || event.degree !== undefined) && (
                              <p className="text-[9px] font-black uppercase tracking-wider text-yellow-600 mt-0.5">
                                ★ Grau concedido: {event.degrees || event.degree}º Grau
                              </p>
                            )}
                            {event.instructor && (
                              <p className="text-[8px] text-gray-400 font-extrabold uppercase text-right">Avaliado por: {event.instructor}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Endorsement and Signatures */}
                  <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="space-y-1.5">
                      <div className="border-b border-gray-400 w-full h-8" />
                      <span>Assinatura do Aluno / Responsável</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="border-b border-gray-400 w-full h-8" />
                      <span>Tanque Team - Coordenador</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Screen Actions) */}
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50/50 dark:bg-zinc-850/35 no-print">
              <button
                onClick={() => setShowReportModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-200 dark:bg-zinc-750 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Fechar Visualização
              </button>
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>Imprimir Prontuário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
