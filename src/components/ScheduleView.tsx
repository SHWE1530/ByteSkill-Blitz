import React, { useState, useEffect } from 'react';
import { db, toPlainObject } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Zap, Target, Bell } from 'lucide-react';
import { Need, Assignment, ActivityLog } from '../types';

interface ScheduleViewProps {
  user: any;
  profile: any;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ user, profile }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [missions, setMissions] = useState<Need[]>([]);
  const [alerts, setAlerts] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 📡 Fetch Missions
    let mq;
    if (profile.role === 'NGO') {
      mq = query(collection(db, 'needs'), where('ngoId', '==', user.uid));
    } else {
      mq = query(collection(db, 'needs'), where('volunteerId', '==', user.uid));
    }

    const unsubMissions = onSnapshot(mq, (snap) => {
      const data = snap.docs.map(d => toPlainObject({ id: d.id, ...d.data() }) as Need);
      setMissions(data);
    }, (err) => console.warn("Mission sync limited:", err.message));

    // 📡 Fetch Alerts (Activity Logs)
    const aq = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubAlerts = onSnapshot(aq, (snap) => {
      const data = snap.docs.map(d => toPlainObject({ id: d.id, ...d.data() }) as ActivityLog);
      setAlerts(data);
      setLoading(false);
    }, (err) => {
      console.warn("Alert sync limited:", err.message);
      setLoading(false);
    });

    return () => {
      unsubMissions();
      unsubAlerts();
    };
  }, [user.uid, profile.role]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getMissionsForDay = (day: number) => {
    return missions.filter(m => {
      if (!m.deadline) return false;
      const d = new Date(m.deadline);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const getAlertsForDay = (day: number) => {
    return alerts.filter(a => {
      const d = new Date(a.timestamp);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const logTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <div className="mono-label !text-emerald-500 tracking-[0.4em] font-black uppercase mb-4">Mission Timeline</div>
          <h2 className="text-5xl lg:text-7xl font-black text-stone-900 leading-[0.85] tracking-tighter uppercase">
            Operational <br />
            <span className="text-emerald-600">Schedule.</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-6 bg-white p-3 rounded-[2rem] border border-stone-200 shadow-sm">
          <button onClick={prevMonth} className="p-3 hover:bg-stone-50 rounded-2xl transition-all">
            <ChevronLeft className="w-6 h-6 text-stone-400" />
          </button>
          <div className="text-center min-w-[140px]">
            <div className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest leading-none mb-1">Active Window</div>
            <div className="text-sm font-black text-stone-900 uppercase tracking-tighter">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button onClick={nextMonth} className="p-3 hover:bg-stone-50 rounded-2xl transition-all">
            <ChevronRight className="w-6 h-6 text-stone-400" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center py-4 text-[10px] font-mono font-bold text-stone-300 uppercase tracking-[0.3em]">
            {d}
          </div>
        ))}
        
        {padding.map(i => <div key={`p-${i}`} className="aspect-square bg-stone-50/50 rounded-3xl border border-dotted border-stone-100" />)}
        
        {days.map(day => {
          const dayMissions = getMissionsForDay(day);
          const dayAlerts = getAlertsForDay(day);
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
          
          return (
            <div 
              key={day} 
              className={`min-h-[100px] aspect-square p-3 rounded-[2rem] border transition-all flex flex-col group ${
                isToday ? 'bg-emerald-50 border-emerald-200 ring-4 ring-emerald-50' : 'bg-white border-stone-100 hover:border-stone-300'
              }`}
            >
              <div className={`text-lg font-black mb-1 ${isToday ? 'text-emerald-600' : 'text-stone-900 group-hover:text-black'}`}>
                {day}
              </div>
              
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayMissions.map((m, idx) => (
                  <div key={`m-${idx}`} className="h-1 w-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                ))}
                {dayAlerts.map((a, idx) => (
                  <div key={`a-${idx}`} className="h-1 w-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)] opacity-60" title={a.message} />
                ))}
              </div>

              {(dayMissions.length > 0 || dayAlerts.length > 0) && (
                <div className="mt-auto">
                  <div className="text-[6px] font-mono font-bold text-stone-400 uppercase tracking-widest">
                    {dayMissions.length > 0 && `${dayMissions.length} Ops `}
                    {dayAlerts.length > 0 && `${dayAlerts.length} Logs`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-stone-100" />
          <span className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest">Active Intelligence Signals</span>
          <div className="h-px flex-1 bg-stone-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alerts.slice(0, 6).map(alert => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={alert.id}
              className="p-6 bg-rose-50/50 border border-rose-100 rounded-[2rem] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Bell className="w-12 h-12 text-rose-600" />
              </div>
              <div className="text-[8px] font-mono font-bold text-rose-400 uppercase tracking-widest mb-2">
                {new Date(alert.timestamp).toLocaleTimeString()} • {logTypeLabel(alert.type)}
              </div>
              <p className="text-xs font-black text-rose-900 leading-relaxed uppercase tracking-tight">
                {alert.message}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-12">
          <div className="h-px flex-1 bg-stone-100" />
          <span className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest">Mission Deadlines Briefing</span>
          <div className="h-px flex-1 bg-stone-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {missions.filter(m => m.deadline).slice(0, 6).map(mission => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={mission.id} 
              className="p-8 bg-white border border-stone-200 rounded-[2.5rem] hover:border-emerald-500 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest leading-none mb-1">Mission Ref</div>
                    <div className="text-[10px] font-black text-stone-900 uppercase">#{mission.id?.slice(0, 6)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest leading-none mb-1">Deadline</div>
                  <div className="text-[11px] font-black text-emerald-600 uppercase">
                    {new Date(mission.deadline!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-black text-stone-900 uppercase tracking-tighter mb-4 line-clamp-1">{mission.title}</h3>
              
              <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-tight">{mission.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-tight">{mission.status}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {missions.filter(m => m.deadline).length === 0 && !loading && (
             <div className="col-span-full py-24 text-center bg-stone-50/50 rounded-[3rem] border-2 border-dashed border-stone-100">
                <CalendarIcon className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                <div className="text-sm font-black text-stone-300 uppercase tracking-[0.2em]">No Deadlines Registered in Tactical Database</div>
             </div>
          )}
        </div>
      </section>
    </div>
  );
};
