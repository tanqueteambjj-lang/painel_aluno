import { doc, updateDoc, getDoc } from 'firebase/firestore';

export interface AccessLog {
  timestamp: string;
  date: string;
  device?: string;
  action?: string;
}

export const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
};

export const recordStudentAccess = async (
  db: any,
  appId: string,
  studentId: string,
  studentData?: any
) => {
  if (!studentId || studentId === 'mock_student_id') return;

  try {
    const sessionKey = `tanque_access_logged_${studentId}`;
    const lastLogged = sessionStorage.getItem(sessionKey);
    const now = Date.now();

    // Debounce within the same browser tab session: 10 minutes
    if (lastLogged && (now - parseInt(lastLogged, 10)) < 10 * 60 * 1000) {
      return;
    }
    sessionStorage.setItem(sessionKey, now.toString());

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];
    const device = getDeviceType();

    const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
    let currentData = studentData;

    if (!currentData || typeof currentData.accessCount === 'undefined') {
      const snap = await getDoc(studentRef);
      if (snap.exists()) {
        currentData = snap.data();
      }
    }

    const currentCount = Number(currentData?.accessCount || 0) + 1;
    const accessDates: string[] = Array.isArray(currentData?.accessDates) ? currentData.accessDates : [];
    const updatedDates = accessDates.includes(todayStr) ? accessDates : [...accessDates, todayStr];

    const currentLogs: AccessLog[] = Array.isArray(currentData?.accessLogs) ? currentData.accessLogs : [];
    const newLog: AccessLog = {
      timestamp: nowIso,
      date: todayStr,
      device: device,
      action: 'login_portal'
    };
    // Keep last 40 logs
    const updatedLogs = [...currentLogs.slice(-39), newLog];

    const payload: Record<string, any> = {
      accessCount: currentCount,
      lastAccessAt: nowIso,
      lastAccessDate: todayStr,
      lastAccessDevice: device,
      accessDates: updatedDates,
      accessLogs: updatedLogs
    };

    if (!currentData?.firstAccessAt) {
      payload.firstAccessAt = nowIso;
    }

    await updateDoc(studentRef, payload);

    // Sync to backup instance if distinct
    if (appId !== 'tanqueteam-bjj') {
      try {
        await updateDoc(doc(db, 'artifacts', 'tanqueteam-bjj', 'public', 'data', 'students', studentId), payload);
      } catch (err) {
        // silent fallback
      }
    }
  } catch (error) {
    console.error("Error recording student portal access:", error);
  }
};

export const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return 'Nunca acessou';
  
  try {
    const accessDate = new Date(isoString);
    if (isNaN(accessDate.getTime())) return 'Data inválida';

    const now = new Date();
    const diffMs = now.getTime() - accessDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHours < 24) {
      const hoursStr = accessDate.getHours().toString().padStart(2, '0');
      const minStr = accessDate.getMinutes().toString().padStart(2, '0');
      if (diffDays === 0 && accessDate.getDate() === now.getDate()) {
        return `Hoje às ${hoursStr}:${minStr}`;
      }
      return `Há ${diffHours}h`;
    }
    if (diffDays === 1) {
      const hoursStr = accessDate.getHours().toString().padStart(2, '0');
      const minStr = accessDate.getMinutes().toString().padStart(2, '0');
      return `Ontem às ${hoursStr}:${minStr}`;
    }
    if (diffDays < 7) {
      return `Há ${diffDays} dias`;
    }

    const day = accessDate.getDate().toString().padStart(2, '0');
    const month = (accessDate.getMonth() + 1).toString().padStart(2, '0');
    const year = accessDate.getFullYear();
    const hours = accessDate.getHours().toString().padStart(2, '0');
    const minutes = accessDate.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return 'Nunca acessou';
  }
};

export const computeAccessMetrics = (students: any[]) => {
  const list = Array.isArray(students) ? students : [];
  const validStudents = list.filter(s => s && !s.archived && s.enrollmentStatus !== 'Inativo');
  const totalStudents = validStudents.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalAccessCount = 0;
  let activeUsersCount = 0;
  let accessedTodayCount = 0;
  let accessedThisWeekCount = 0;
  let accessedThisMonthCount = 0;
  let neverAccessedCount = 0;

  validStudents.forEach(s => {
    const count = Number(s.accessCount || 0);
    totalAccessCount += count;

    if (count > 0 || s.lastAccessAt) {
      activeUsersCount++;

      if (s.lastAccessDate === todayStr || (s.lastAccessAt && s.lastAccessAt.startsWith(todayStr))) {
        accessedTodayCount++;
      }

      if (s.lastAccessAt) {
        const lastDate = new Date(s.lastAccessAt);
        if (!isNaN(lastDate.getTime())) {
          if (lastDate >= sevenDaysAgo) accessedThisWeekCount++;
          if (lastDate >= thirtyDaysAgo) accessedThisMonthCount++;
        }
      }
    } else {
      neverAccessedCount++;
    }
  });

  const adoptionPercentage = totalStudents > 0 ? Math.round((activeUsersCount / totalStudents) * 100) : 0;

  // Sorted by most accesses descending
  const ranking = [...validStudents].sort((a, b) => {
    const countA = Number(a.accessCount || 0);
    const countB = Number(b.accessCount || 0);
    if (countB !== countA) return countB - countA;
    const dateA = a.lastAccessAt ? new Date(a.lastAccessAt).getTime() : 0;
    const dateB = b.lastAccessAt ? new Date(b.lastAccessAt).getTime() : 0;
    return dateB - dateA;
  });

  return {
    totalStudents,
    totalAccessCount,
    activeUsersCount,
    adoptionPercentage,
    accessedTodayCount,
    accessedThisWeekCount,
    accessedThisMonthCount,
    neverAccessedCount,
    ranking
  };
};
