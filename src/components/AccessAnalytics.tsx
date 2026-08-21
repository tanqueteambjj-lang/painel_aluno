import React, { useState, useMemo } from 'react';
import { 
  Activity, Eye, Smartphone, Monitor, Search, Filter, Sparkles, Send, 
  Crown, Medal, Trophy, Clock, CheckCircle, AlertTriangle, User, 
  ExternalLink, ChevronRight, X, Calendar, RefreshCw, SmartphoneNfc, 
  Share2, ArrowUpRight, Flame, Shield, HelpCircle, Check, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { computeAccessMetrics, formatRelativeTime } from '@/utils/accessTracker';

interface AccessAnalyticsProps {
  students: any[];
  onImpersonate?: (student: any) => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function AccessAnalytics({ students = [], onImpersonate, showAlert }: AccessAnalyticsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'top' | 'today' | 'week' | 'never'>('all');
  const [filterBelt, setFilterBelt] = useState('Todas');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);

  // Compute metrics
  const metrics = useMemo(() => {
    return computeAccessMetrics(students);
  }, [students]);

  // Belts list
  const beltsList = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach(s => {
      if (s?.belt) set.add(s.belt.split(' - ')[0] || s.belt);
    });
    return ['Todas', ...Array.from(set)];
  }, [students]);

  // Filtered ranking list
  const filteredList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return metrics.ranking.filter(s => {
      if (!s) return false;

      // Belt filter
      if (filterBelt !== 'Todas') {
        const baseBelt = s.belt?.split(' - ')[0] || s.belt || '';
        if (!baseBelt.toLowerCase().includes(filterBelt.toLowerCase())) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (s.name || '').toLowerCase();
        const nickname = (s.nickname || '').toLowerCase();
        const login = (s.studentLogin || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        if (!name.includes(query) && !nickname.includes(query) && !login.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      // Period filter
      const count = Number(s.accessCount || 0);
      if (filterPeriod === 'never') {
        return count === 0 && !s.lastAccessAt;
      }
      if (filterPeriod === 'top') {
        return count > 0;
      }
      if (filterPeriod === 'today') {
        return s.lastAccessDate === todayStr || (s.lastAccessAt && s.lastAccessAt.startsWith(todayStr));
      }
      if (filterPeriod === 'week') {
        if (!s.lastAccessAt) return false;
        const lastDate = new Date(s.lastAccessAt);
        return !isNaN(lastDate.getTime()) && lastDate >= sevenDaysAgo;
      }

      return true;
    });
  }, [metrics.ranking, searchQuery, filterPeriod, filterBelt]);

  // Send WhatsApp to student about portal access
  const handleSendWhatsApp = (student: any) => {
    const phone = (student.phone || '').replace(/\D/g, '');
    if (!phone) {
      if (showAlert) showAlert("Telefone ausente", `O aluno ${student.name} não possui telefone cadastrado.`, "warning");
      return;
    }

    const count = Number(student.accessCount || 0);
    let message = '';

    if (count === 0) {
      // Invitation / credentials reminder
      message = `Olá, *${student.name}*! Tudo bem? 🥋🔥\n\n` +
        `Passando para lembrar que você já tem acesso exclusivo ao nosso *Portal do Aluno Tanque Team BJJ*!\n\n` +
        `📱 No aplicativo você pode:\n` +
        `✅ Fazer check-in nos treinos\n` +
        `✅ Acompanhar sua graduação, aulas e histórico de XP\n` +
        `✅ Indicar amigos com desconto na mensalidade\n` +
        `✅ Acessar o feed e conteúdos da academia\n\n` +
        `🔑 *Seus dados de acesso:*\n` +
        `• Login: *${student.studentLogin || student.email || 'Seu CPF/Login'}*\n` +
        `• Senha: *${student.studentPassword || 'Sua senha'}*\n\n` +
        `Acesse agora pelo link: https://tanqueteambjj.com.br\n\n` +
        `Nos vemos no tatame! Oss! 👊🥋`;
    } else {
      // Engagement praise
      message = `Fala, *${student.name}*! Tudo bem? 🥋🔥\n\n` +
        `Parabéns pela dedicação! Você já acessou o *Portal do Aluno Tanque Team* ${count} vezes e está acompanhando seu progresso de perto!\n\n` +
        `Continue firme nos treinos rumo à sua próxima graduação! Oss! 👊🥋`;
    }

    const encoded = encodeURIComponent(message);
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
  };

  // Top 3 Podium
  const top3 = useMemo(() => {
    const activeOnly = metrics.ranking.filter(s => Number(s.accessCount || 0) > 0);
    return activeOnly.slice(0, 3);
  }, [metrics.ranking]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-gray-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider">
              <Activity size={14} className="animate-pulse" />
              <span>Engajamento & Estatísticas</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
              Controle de Acessos ao Portal
            </h2>
            <p className="text-gray-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Monitore a frequência de acesso dos alunos, identifique os mais engajados no aplicativo e veja quem ainda precisa do primeiro acesso.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Adesão ao App</p>
                <p className="text-lg font-black text-white">{metrics.adoptionPercentage}% dos alunos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Card 1: Total de Acessos */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Logins</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
              <Activity size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white italic">
            {metrics.totalAccessCount}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Acessos registrados
          </p>
        </div>

        {/* Card 2: Alunos Ativos no Portal */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alunos Conectados</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <User size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 italic">
            {metrics.activeUsersCount} <span className="text-xs text-gray-400 font-bold">/ {metrics.totalStudents}</span>
          </p>
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, metrics.adoptionPercentage)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Acessos Hoje */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ativos Hoje</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Flame size={16} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 italic">
            {metrics.accessedTodayCount}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Entraram no portal hoje
          </p>
        </div>

        {/* Card 4: Acessos Esta Semana */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Últimos 7 Dias</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 italic">
            {metrics.accessedThisWeekCount}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Alunos ativos na semana
          </p>
        </div>

        {/* Card 5: Nunca Acessaram */}
        <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sem Acesso</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 italic">
            {metrics.neverAccessedCount}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Nunca entraram no app
          </p>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-800/40 p-6 rounded-3xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-500" size={20} />
              <h3 className="font-black italic uppercase text-gray-900 dark:text-white text-base">
                Pódio dos Alunos Mais Ativos no Portal
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-400">Top 3 Destaques</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((student, idx) => {
              const rank = idx + 1;
              const medalColors = {
                1: {
                  bg: 'from-amber-500/20 via-yellow-500/10 to-amber-500/5 border-amber-500/40',
                  badge: 'bg-amber-500 text-black',
                  icon: Crown,
                  title: '1º Lugar • Mais Conectado'
                },
                2: {
                  bg: 'from-slate-400/20 via-gray-300/10 to-slate-400/5 border-slate-400/40',
                  badge: 'bg-slate-400 text-white',
                  icon: Medal,
                  title: '2º Lugar'
                },
                3: {
                  bg: 'from-amber-700/20 via-amber-800/10 to-amber-700/5 border-amber-700/40',
                  badge: 'bg-amber-700 text-white',
                  icon: Medal,
                  title: '3º Lugar'
                }
              }[rank as 1 | 2 | 3];

              const IconComp = medalColors.icon;

              return (
                <div 
                  key={student.id || idx}
                  className={`relative p-5 rounded-2xl bg-gradient-to-b ${medalColors.bg} border backdrop-blur-sm shadow-sm flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {student.photo ? (
                          <img 
                            src={student.photo} 
                            alt={student.name} 
                            className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-gray-700 shadow" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-black text-gray-500 text-base shadow">
                            {student.name?.charAt(0) || 'A'}
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${medalColors.badge} shadow`}>
                          #{rank}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{medalColors.title}</p>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {student.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {student.belt || 'Faixa Branca'}
                        </p>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm shrink-0">
                      <IconComp size={18} className={rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : 'text-amber-700'} />
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-black/5 dark:border-white/5 space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Total de Acessos:</span>
                      <span className="font-black text-red-600 dark:text-red-400 text-sm">
                        {student.accessCount || 0} logins
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Último Acesso:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {formatRelativeTime(student.lastAccessAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-2 border-t border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setSelectedStudentForModal(student)}
                      className="flex-1 py-1.5 px-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      <Eye size={13} /> Histórico
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(student)}
                      className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition shadow-sm"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno por nome, apelido, login ou email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-500 dark:text-white transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Belt selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterBelt}
              onChange={(e) => setFilterBelt(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-red-500"
            >
              {beltsList.map(b => (
                <option key={b} value={b}>{b === 'Todas' ? 'Todas as Faixas' : b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
          {[
            { id: 'all', label: `Todos (${metrics.totalStudents})` },
            { id: 'top', label: `Já Acessaram (${metrics.activeUsersCount})` },
            { id: 'today', label: `Acessaram Hoje (${metrics.accessedTodayCount})` },
            { id: 'week', label: `Últimos 7 Dias (${metrics.accessedThisWeekCount})` },
            { id: 'never', label: `Nunca Acessaram (${metrics.neverAccessedCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterPeriod(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                filterPeriod === tab.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Students Ranking Table / Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Lista de Alunos & Frequência de Acesso
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Exibindo {filteredList.length} aluno(s)
            </p>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Activity size={36} className="mx-auto opacity-30 animate-pulse" />
            <p className="text-sm font-bold">Nenhum aluno encontrado para este filtro.</p>
            <p className="text-xs">Tente limpar a busca ou selecionar outro período.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {filteredList.map((student, index) => {
              const count = Number(student.accessCount || 0);
              const hasAccessed = count > 0 || !!student.lastAccessAt;
              const globalIndex = metrics.ranking.findIndex(s => s.id === student.id) + 1;

              return (
                <div 
                  key={student.id || index}
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors"
                >
                  {/* Left: Position & Student Info */}
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      globalIndex === 1 
                        ? 'bg-amber-500 text-black shadow' 
                        : globalIndex === 2 
                        ? 'bg-slate-400 text-white shadow' 
                        : globalIndex === 3 
                        ? 'bg-amber-700 text-white shadow' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      #{globalIndex}
                    </span>

                    <div className="relative shrink-0">
                      {student.photo ? (
                        <img 
                          src={student.photo} 
                          alt={student.name} 
                          className="w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-gray-700" 
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-gray-500 text-sm">
                          {student.name?.charAt(0) || 'A'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {student.name}
                        </h4>
                        {student.nickname && (
                          <span className="text-xs text-gray-400 italic">
                            ({student.nickname})
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          hasAccessed 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                        }`}>
                          {hasAccessed ? 'Ativo no App' : 'Nunca Acessou'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {student.belt || 'Faixa Branca'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px] bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded">
                          Login: {student.studentLogin || '(sem login)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right: Stats & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6 shrink-0 pl-11 md:pl-0">
                    {/* Access Count Badge */}
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Total de Acessos</p>
                      <div className="flex items-center md:justify-end gap-1.5 mt-0.5">
                        <Activity size={14} className={hasAccessed ? "text-red-500" : "text-gray-300"} />
                        <span className={`text-base font-black italic ${hasAccessed ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                          {count} {count === 1 ? 'login' : 'logins'}
                        </span>
                      </div>
                    </div>

                    {/* Last Access Relative Time */}
                    <div className="text-left md:text-right min-w-[130px]">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Último Acesso</p>
                      <div className="flex items-center md:justify-end gap-1 mt-0.5">
                        <Clock size={12} className="text-gray-400 shrink-0" />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {formatRelativeTime(student.lastAccessAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStudentForModal(student)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition shadow-sm"
                        title="Ver histórico detalhado de acessos"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleSendWhatsApp(student)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-xl transition shadow-sm border border-emerald-200 dark:border-emerald-800"
                        title={hasAccessed ? "Enviar mensagem de incentivo via WhatsApp" : "Enviar dados de acesso via WhatsApp"}
                      >
                        <MessageCircle size={16} />
                      </button>

                      {onImpersonate && (
                        <button
                          onClick={() => onImpersonate(student)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
                          title="Ver painel como este aluno"
                        >
                          Acessar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Detailed Student Access History */}
      <AnimatePresence>
        {selectedStudentForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                  {selectedStudentForModal.photo ? (
                    <img 
                      src={selectedStudentForModal.photo} 
                      alt={selectedStudentForModal.name} 
                      className="w-12 h-12 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-black text-lg">
                      {selectedStudentForModal.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-base">
                      {selectedStudentForModal.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedStudentForModal.belt || 'Faixa Branca'} • Login: <span className="font-mono">{selectedStudentForModal.studentLogin}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total de Logins</p>
                    <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1 italic">
                      {selectedStudentForModal.accessCount || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Dias Conectados</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 italic">
                      {(selectedStudentForModal.accessDates || []).length || (selectedStudentForModal.accessCount ? 1 : 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-150 dark:border-gray-700 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Primeiro acesso registrado:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedStudentForModal.firstAccessAt 
                        ? formatRelativeTime(selectedStudentForModal.firstAccessAt) 
                        : 'Não registrado'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Último acesso ao portal:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedStudentForModal.lastAccessAt 
                        ? formatRelativeTime(selectedStudentForModal.lastAccessAt) 
                        : 'Nunca acessou'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Dispositivo mais recente:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                      {selectedStudentForModal.lastAccessDevice === 'Mobile' ? (
                        <><Smartphone size={13} className="text-emerald-500" /> Smartphone</>
                      ) : (
                        <><Monitor size={13} className="text-blue-500" /> Computador</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Detailed Logs Timeline */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                    <Calendar size={14} /> Histórico Recente de Entradas
                  </h4>

                  {Array.isArray(selectedStudentForModal.accessLogs) && selectedStudentForModal.accessLogs.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {[...selectedStudentForModal.accessLogs].reverse().map((log: any, idx: number) => {
                        const dateFormatted = log.timestamp ? formatRelativeTime(log.timestamp) : log.date;
                        const isMobile = log.device === 'Mobile' || log.device === 'Tablet';

                        return (
                          <div 
                            key={idx}
                            className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-700 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                {isMobile ? <Smartphone size={14} /> : <Monitor size={14} />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 dark:text-gray-200">
                                  Login efetuado no portal
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  Dispositivo: {log.device || 'Web'}
                                </p>
                              </div>
                            </div>
                            <span className="font-medium text-gray-500 dark:text-gray-400 text-[11px]">
                              {dateFormatted}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold">Nenhum log detalhado registrado ainda.</p>
                      <p className="text-[10px] mt-0.5">Os próximos acessos do aluno aparecerão aqui em tempo real.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSendWhatsApp(selectedStudentForModal)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  <MessageCircle size={15} /> WhatsApp
                </button>
                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
