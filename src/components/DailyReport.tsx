import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Send, Calendar, Clock, Smile, Frown, Meh, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface Report {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string;
  content: string;
  impactMinutes: number;
  mood: string;
  createdAt: any;
}

interface DailyReportProps {
  user: any;
  profile: any;
}

export const DailyReport: React.FC<DailyReportProps> = ({ user, profile }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [content, setContent] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [mood, setMood] = useState('Satisfied');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'reports'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Report));
    }, (err) => {
      console.warn("Personal reports sync limited:", err.message);
    });

    return () => unsub();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        userId: user.uid,
        userName: profile.name,
        userRole: profile.role,
        date: new Date().toISOString().split('T')[0],
        content,
        impactMinutes: minutes,
        mood,
        createdAt: serverTimestamp()
      });
      setContent('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Report failure:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header>
        <div className="mono-label !text-emerald-500 tracking-[0.4em] font-black uppercase mb-4">Operational debrief</div>
        <h2 className="text-5xl lg:text-7xl font-black text-stone-900 leading-[0.85] tracking-tighter uppercase">
          Daily <br />
          <span className="text-emerald-600">Reporting.</span>
        </h2>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* 📝 SUBMISSION FORM */}
        <section className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 bg-white border border-stone-200 rounded-[3rem] shadow-sm sticky top-12"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Submit Entry</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest ml-1">Daily Summary</label>
                <textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Intelligence briefing on today's tactical operations..."
                  className="w-full h-40 px-6 py-5 bg-stone-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white text-stone-900 font-medium rounded-3xl outline-none transition-all placeholder:text-stone-300 resize-none text-sm"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest ml-1">Impact Duration (Minutes)</label>
                <div className="flex items-center gap-6">
                  <input 
                    type="range" 
                    min="15" 
                    max="480" 
                    step="15"
                    value={minutes}
                    onChange={e => setMinutes(parseInt(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <div className="w-20 px-3 py-2 bg-stone-900 text-white font-black text-xs rounded-xl text-center">
                    {minutes}m
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest ml-1">Operational Mood</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Productive', icon: Smile, color: 'text-emerald-500' },
                    { id: 'Satisfied', icon: Meh, color: 'text-amber-500' },
                    { id: 'Exhausted', icon: Frown, color: 'text-rose-500' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        mood === m.id ? 'border-emerald-500 bg-emerald-50' : 'border-transparent bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <m.icon className={`w-6 h-6 ${mood === m.id ? m.color : 'text-stone-300'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${mood === m.id ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {m.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full group relative overflow-hidden px-8 py-5 bg-stone-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 shadow-xl shadow-stone-900/10 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : success ? (
                  <>
                    Protocol Transmitted
                    <CheckCircle className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Enshrine Entry
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </section>

        {/* 📚 REPORT HISTORY */}
        <section className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-4">
             <div className="h-px flex-1 bg-stone-100" />
             <span className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest">Tactical Log History</span>
             <div className="h-px flex-1 bg-stone-100" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {reports.map((report, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={report.id}
                  className="p-8 bg-white border border-stone-200 rounded-[2.5rem] hover:border-black transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400">
                        {report.mood === 'Productive' ? <Smile className="w-5 h-5 text-emerald-500" /> : 
                         report.mood === 'Exhausted' ? <Frown className="w-5 h-5 text-rose-500" /> : 
                         <Meh className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div>
                        <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest leading-none mb-1">Transmission Date</div>
                        <div className="text-[11px] font-black text-stone-900 uppercase">
                          {new Date(report.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-xl">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-black text-stone-900 uppercase">{report.impactMinutes}m Debrief</span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-stone-600 leading-relaxed tracking-tight italic border-l-2 border-stone-100 pl-6 py-2">
                    "{report.content}"
                  </p>

                  <div className="mt-8 pt-6 border-t border-stone-50 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                    <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest">
                      ID: {report.id.slice(0, 8)}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${report.mood === 'Productive' ? 'bg-emerald-500' : report.mood === 'Exhausted' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                       <span className="text-[10px] font-black text-stone-900 uppercase tracking-tight">{report.mood}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {reports.length === 0 && (
              <div className="py-32 text-center bg-white border-2 border-dashed border-stone-100 rounded-[3rem]">
                <FileText className="w-16 h-16 text-stone-100 mx-auto mb-6" />
                <h3 className="text-xl font-black text-stone-300 uppercase tracking-widest">No Tactical Logs Recorded</h3>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
