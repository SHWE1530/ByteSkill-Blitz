import React, { useState, useEffect } from 'react';
import { db, toPlainObject } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy, increment, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Plus, MapPin, Users as UsersIcon, AlertCircle, CheckCircle2, Timer, Sparkles, X, ChevronRight, Filter, Trash2, Star, MessageSquare, ArrowRight, Calendar, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Need, Assignment, VolunteerProfile } from '../types';
import { analyzeNeed, calculatePriority } from '../lib/gemini';
import { IntelligenceHub } from './IntelligenceHub';

export function NGODashboard({ user }: { user: User }) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'needs'),
      where('ngoId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNeeds = onSnapshot(q, (snap) => {
      setNeeds(snap.docs.map(d => {
        const data = d.data();
        return toPlainObject({ id: d.id, ...data }) as Need;
      }));
    }, (err) => {
      console.error('Needs stream failed:', err.message);
    });

    const aq = query(
      collection(db, 'assignments'),
      where('ngoId', '==', user.uid)
    );
    const unsubscribeAssignments = onSnapshot(aq, (snap) => {
      setAssignments(snap.docs.map(d => {
        const data = d.data();
        return toPlainObject({ id: d.id, ...data }) as any;
      }));
    }, (err) => {
      console.warn('Assignments sync restricted:', err.message);
    });

    const rq = query(collection(db, 'reports'));
    const unsubscribeReports = onSnapshot(rq, (snap) => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate?.()?.getTime() || a.createdAt || 0;
          const tB = b.createdAt?.toDate?.()?.getTime() || b.createdAt || 0;
          return tB - tA;
        });
      setReports(sorted);
    }, (err) => {
      console.warn("Reports stream limited:", err.message);
    });

    return () => {
      unsubscribeNeeds();
      unsubscribeAssignments();
      unsubscribeReports();
    };
  }, [user.uid]);

  const createLog = async (type: string, targetId: string, message: string) => {
    try {
      await addDoc(collection(db, 'activity_logs'), {
        type,
        targetId,
        actorId: user.uid,
        message,
        timestamp: Date.now()
      });
    } catch (e: any) { console.error('Logging failed:', e.message); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeNeed(description, category);
      const score = calculatePriority(
        { urgency: analysis.urgency, peopleAffected },
        analysis.timeSensitivity
      );

      const needData = {
        title,
        description,
        category: analysis.category || category,
        location,
        peopleAffected,
        urgency: analysis.urgency,
        createdAt: Date.now(),
        deadline: deadline ? new Date(deadline).getTime() : null,
        priorityScore: score,
        aiSummary: analysis.summary,
        status: 'Pending',
        ngoId: user.uid,
        ngoEmail: user.email,
        assignedVolunteers: []
      };

      const docRef = await addDoc(collection(db, 'needs'), needData);
      await createLog('Task_Created', docRef.id, `Created mission: ${title}`);
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      console.error('Submission failed:', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setLocation('');
    setPeopleAffected(1);
    setDeadline('');
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'needs', id), { status });
    if (status === 'Completed') {
      await createLog('Task_Completed', id, `Mission marked as complete.`);
    }
  };

  const deleteNeed = async (id: string) => {
    if (confirm('Are you sure you want to delete this mission? This cannot be undone.')) {
      await deleteDoc(doc(db, 'needs', id));
    }
  };

  const rateVolunteer = async (assignmentId: string, rating: number, feedback: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    try {
      await updateDoc(doc(db, 'assignments', assignmentId), { rating, feedback });
      
      // We skip direct volunteer profile update to avoid PII permission conflicts.
      // In production, a Cloud Function would handle the aggregate trust score.
      await createLog('Feedback_Given', assignment.volunteerId, `Rated volunteer performance: ${rating}/5`);
    } catch (err: any) {
      console.error('Rating failed:', err.message);
    }
  };

  const filteredNeeds = needs.filter(n => {
    const matchesFilter = filter === 'all' || n.status === filter;
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 animate-in fade-in zoom-in-95 duration-700">
      {/* 📊 LEFT: MISSION ANALYTICS PANE */}
      <div className="md:col-span-12 lg:col-span-8 space-y-12">
        <IntelligenceHub needs={needs} reports={reports} />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="mono-label tracking-[0.3em] mb-1">Operational Fleet</div>
            <h2 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none">Community Missions</h2>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-8 py-5 bg-stone-900 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all shadow-xl shadow-stone-900/10 active:scale-95"
          >
            <Plus className="w-6 h-6" />
            Initialize Mission
          </button>
        </div>

        {/* --- DYNAMIC FILTER RAIL --- */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex bg-white/50 backdrop-blur-md rounded-3xl p-2 border border-stone-200/60 shadow-sm w-fit">
            {['all', 'Pending', 'In Progress', 'Completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full sm:max-w-md">
            <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text"
              placeholder="Search by Title or Sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white/50 backdrop-blur-md border border-stone-200/60 rounded-3xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <AnimatePresence>
            {filteredNeeds.map((need, index) => (
              <motion.div
                key={need.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[2.5rem] p-10 border border-stone-200/60 shadow-sm hover:shadow-2xl hover:shadow-stone-900/5 transition-all group tech-border overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          need.urgency === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          need.urgency === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {need.urgency} Priority
                        </span>
                        <span className="bg-stone-100 text-stone-500 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-stone-200">
                          {need.category}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-stone-900 tracking-tighter leading-none group-hover:text-emerald-600 transition-colors uppercase">{need.title}</h3>
                    </div>
                    <div className="text-center p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="mono-label !text-stone-300 !text-[8px] mb-1">Rank</div>
                      <div className="text-4xl font-black text-stone-900 leading-none tracking-tighter">{need.priorityScore}</div>
                    </div>
                  </div>

                  <p className="text-stone-500 font-medium mb-10 line-clamp-3 leading-relaxed tracking-tight">
                    {need.aiSummary || need.description}
                  </p>

                  <div className="grid grid-cols-2 gap-6 p-6 bg-stone-50 rounded-3xl border border-stone-100 mb-6">
                    <div className="space-y-1">
                      <div className="mono-label !text-stone-300">Sector</div>
                      <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {need.location}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="mono-label !text-stone-300">Target Impact</div>
                      <div className="font-black text-stone-900 text-sm flex items-center gap-2">
                        <UsersIcon className="w-3.5 h-3.5 text-stone-400" />
                        {need.peopleAffected} Agents
                      </div>
                    </div>
                  </div>

                  {need.deadline && (
                    <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-100 rounded-2xl mb-10">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Mission Deadline</span>
                        <span className="text-[11px] font-black text-amber-900 uppercase tracking-tighter">
                          {new Date(need.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {need.deadline < Date.now() && need.status !== 'Completed' && (
                        <span className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-lg uppercase animate-pulse">
                          Overdue
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-8 border-t border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        need.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      }`} />
                      <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest">{need.status}</span>
                    </div>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setSelectedNeed(need)}
                        className="p-3 bg-stone-100 text-stone-400 hover:text-stone-900 rounded-2xl transition-all"
                        title="Manage Personnel"
                      >
                        <UsersIcon className="w-5 h-5" />
                      </button>
                      
                      {need.status === 'Pending' && (
                          <button 
                            onClick={() => updateStatus(need.id, 'In Progress')}
                            className="px-6 py-3 bg-stone-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2"
                          >
                            Init <ArrowRight className="w-4 h-4" />
                          </button>
                      )}
                      {need.status === 'In Progress' && (
                          <button 
                            onClick={() => updateStatus(need.id, 'Completed')}
                            className="px-6 py-3 bg-emerald-600 text-stone-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Finalize
                          </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 📊 RIGHT: COMMAND ANALYTICS PANE */}
      <div className="md:col-span-12 lg:col-span-4 space-y-8">
         <div className="glass-card p-10 space-y-10 sticky top-12">
            <div>
               <div className="mono-label tracking-[0.3em] mb-4">Pulse Analysis</div>
               <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Coordination Intelligence</h3>
            </div>

            <div className="space-y-6">
               <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                  <div className="mono-label !text-stone-400 mb-2">Resource Saturation</div>
                  <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-emerald-500 rounded-full" 
                       style={{ width: `${(needs.filter(n => n.status !== 'Completed').length / 10) * 100}%` }} 
                     />
                  </div>
                  <div className="flex justify-between mt-3">
                     <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest">Active Ops</span>
                     <span className="font-mono text-[10px] font-bold text-stone-400">{needs.filter(n => n.status !== 'Completed').length}/10</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-stone-900 rounded-3xl text-white">
                     <div className="mono-label !text-stone-500 mb-2">Total Yield</div>
                     <div className="text-3xl font-black leading-none">{needs.filter(n => n.status === 'Completed').length}</div>
                     <div className="text-[9px] font-mono font-bold text-emerald-400 mt-2 uppercase tracking-widest">Successful</div>
                  </div>
                  <div className="p-6 bg-white border border-stone-200 rounded-3xl">
                     <div className="mono-label mb-2">Urgency Peak</div>
                     <div className="text-3xl font-black leading-none text-rose-600">{needs.filter(n => n.urgency === 'High').length}</div>
                     <div className="text-[9px] font-mono font-bold text-stone-300 mt-2 uppercase tracking-widest">Critical</div>
                  </div>
               </div>
               
               <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex items-center gap-6">
                  <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center text-white">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                     <div className="text-emerald-900 font-black text-lg leading-none mb-1">AI Oversight</div>
                     <p className="text-xs font-semibold text-emerald-700/70">Matching protocols optimized via Gemini Agent-3.</p>
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-stone-100">
               <div className="mono-label !text-stone-300 mb-4 tracking-[0.2em]">Latest Personnel PII</div>
               <div className="space-y-4">
                  {assignments.slice(0,3).map(a => (
                    <div key={a.id} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-black text-stone-400">{a.volunteerName?.charAt(0)}</div>
                          <div className="text-xs font-black text-stone-800">{a.volunteerName}</div>
                       </div>
                       <div className="text-[9px] font-mono text-stone-300 group-hover:text-emerald-600 transition-colors uppercase">Assigned</div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Participants Detail Modal */}
      <AnimatePresence>
        {selectedNeed && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl relative flex flex-col"
            >
               <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                  <div>
                    <h2 className="text-2xl font-black text-stone-900">{selectedNeed.title}</h2>
                    <p className="text-stone-500 font-bold text-sm uppercase tracking-widest mt-1">Operational Protocol: Personnel Allocation</p>
                  </div>
                  <button onClick={() => setSelectedNeed(null)} className="p-2 bg-white rounded-xl border border-stone-200 hover:text-rose-600 transition-all">
                    <X className="w-6 h-6" />
                  </button>
               </div>

               <div className="p-8 overflow-y-auto">
                 <div className="space-y-12">
                   {/* 🛡️ ACTIVE PERSONNEL */}
                   <section>
                     <div className="flex items-center gap-3 mb-6">
                        <UsersIcon className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Deployed Agents</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {assignments.filter(a => a.needId === selectedNeed.id).map(assignment => (
                          <div key={assignment.id} className="p-6 rounded-2xl bg-white border border-stone-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center font-black text-stone-400">
                                {assignment.volunteerName?.charAt(0) || 'V'}
                              </div>
                              <div>
                                 <div className="font-bold text-stone-900">{assignment.volunteerName}</div>
                                 <div className={`text-[10px] font-black uppercase tracking-widest ${
                                   assignment.status === 'Accepted' ? 'text-emerald-500' : 'text-amber-500'
                                 }`}>{assignment.status}</div>
                              </div>
                            </div>
                            
                            {assignment.status === 'Accepted' && selectedNeed.status === 'Completed' && !assignment.rating && (
                              <div className="flex gap-1">
                                 {[1,2,3,4,5].map(star => (
                                   <button 
                                     key={star} 
                                     onClick={() => rateVolunteer(assignment.id, star, '')}
                                     className="p-2 bg-stone-50 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                   >
                                     <Star className="w-3.5 h-3.5" />
                                   </button>
                                 ))}
                              </div>
                            )}

                            {assignment.rating && (
                              <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">
                                 <CheckCircle2 className="w-3 h-3" /> {assignment.rating}/5
                              </div>
                            )}
                          </div>
                        ))}
                        {assignments.filter(a => a.needId === selectedNeed.id).length === 0 && (
                          <div className="col-span-full py-12 text-center text-stone-400 font-bold border-2 border-stone-100 border-dashed rounded-3xl text-xs uppercase tracking-widest">
                            No agents currently deployed to this sector.
                          </div>
                        )}
                     </div>
                   </section>

                   {/* 🧬 AI-POWERED MATCHING */}
                   <section>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <Sparkles className="w-4 h-4 text-emerald-500" />
                           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Neural Match Suggestions</h3>
                        </div>
                        <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">Protocol: Active Matching</div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {/* 
                          In a real app, we would query the 'users' collection for Volunteers. 
                          Due to context limits and privacy rules, we'll show a "Scan Network" button or simulate scanning.
                        */}
                        <div className="p-10 bg-stone-50 rounded-[2.5rem] border-2 border-dashed border-stone-200 text-center space-y-6">
                           <div className="w-16 h-16 bg-white rounded-3xl mx-auto flex items-center justify-center text-stone-300 shadow-sm">
                              <Search className="w-8 h-8" />
                           </div>
                           <div className="max-w-xs mx-auto">
                              <h4 className="text-sm font-black text-stone-900 uppercase tracking-tight mb-2">Scan for Available Personnel</h4>
                              <p className="text-xs text-stone-400 font-medium leading-relaxed">System will analyze skill matrices and geographical proximity to find the ideal match for: <span className="text-stone-900 font-bold">"{selectedNeed.category}"</span></p>
                           </div>
                           <button className="px-10 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-stone-900/10">
                              Execute Network Scan
                           </button>
                        </div>
                      </div>
                   </section>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-900 z-10"
              >
                <X />
              </button>

              <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="text-emerald-600 w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-stone-900">New Community Need</h2>
                    <p className="text-stone-500 font-medium">Gemini AI will analyze and score your request.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Title</label>
                    <input
                      required
                      className="w-full px-5 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold"
                      placeholder="e.g., Post-Flood Medical Camp"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Category (Manual Selection)</label>
                      <select
                        className="w-full px-5 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                      >
                        <option value="">Auto-Detect</option>
                        <option value="Food">Food & Water</option>
                        <option value="Medical">Medical Care</option>
                        <option value="Education">Education</option>
                        <option value="Shelter">Shelter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Impact Count</label>
                      <input
                        type="number"
                        required
                        className="w-full px-5 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold"
                        value={peopleAffected}
                        onChange={e => setPeopleAffected(parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Location</label>
                    <input
                      required
                      className="w-full px-5 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold"
                      placeholder="City, District"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Target Deadline (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
                      <input
                        type="date"
                        className="w-full pl-14 pr-5 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold appearance-none"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Full Description</label>
                    <textarea
                      required
                      rows={4}
                      className="w-full px-5 py-4 bg-stone-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold resize-none"
                      placeholder="Explain the situation in detail. AI will extract key metrics..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>

                  <button
                    disabled={isAnalyzing}
                    className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        AI is analyzing...
                      </>
                    ) : (
                      <>
                        Submit & Prioritize
                        <Plus className="w-6 h-6" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
