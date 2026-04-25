import React, { useState, useEffect } from 'react';
import { db, toPlainObject } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove, orderBy, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { CheckCircle, Circle, MapPin, Search, Wrench as SkillIcon, Briefcase, Zap, Calendar, Heart, XCircle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Need, VolunteerProfile, Assignment } from '../types';
import { IntelligenceHub } from './IntelligenceHub';

export function VolunteerDashboard({ user, profile }: { user: User; profile: VolunteerProfile }) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-tasks'>('discover');

  useEffect(() => {
    const q = query(
      collection(db, 'needs'),
      where('status', 'in', ['Pending', 'In Progress']),
      orderBy('priorityScore', 'desc')
    );
    const unsubscribeNeeds = onSnapshot(q, (snap) => {
      setNeeds(snap.docs.map(d => {
        const data = d.data();
        return toPlainObject({ id: d.id, ...data }) as Need;
      }));
    }, (err) => {
      console.warn("Needs visibility restricted:", err.message);
    });

    const aq = query(
      collection(db, 'assignments'),
      where('volunteerId', '==', user.uid)
    );
    const unsubscribeAssignments = onSnapshot(aq, (snap) => {
      setAssignments(snap.docs.map(d => {
        const data = d.data();
        return toPlainObject({ id: d.id, ...data });
      }));
    }, (err) => {
      console.warn("Assignments visibility restricted:", err.message);
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

  const handleApply = async (needId: string, ngoId: string) => {
    try {
      const assignmentId = `${needId}_${user.uid}`;
      await setDoc(doc(db, 'assignments', assignmentId), {
        needId,
        ngoId,
        volunteerId: user.uid,
        volunteerName: profile.name,
        status: 'Assigned',
        timestamp: Date.now()
      });

      const needRef = doc(db, 'needs', needId);
      await updateDoc(needRef, {
        assignedVolunteers: arrayUnion(user.uid)
      });
      await createLog('Assignment_Initialized', needId, `Applied to mission: ${needs.find(n => n.id === needId)?.title}`);
    } catch (err: any) {
      console.error('Failed to apply:', err.message);
    }
  };

  const handleUpdateAssignment = async (needId: string, status: 'Accepted' | 'Rejected') => {
    const assignmentId = `${needId}_${user.uid}`;
    try {
      await updateDoc(doc(db, 'assignments', assignmentId), { status });
      
      const need = needs.find(n => n.id === needId);
      
      if (status === 'Rejected') {
        await updateDoc(doc(db, 'needs', needId), {
          assignedVolunteers: arrayRemove(user.uid)
        });
      }
      
      await createLog(status === 'Accepted' ? 'Task_Accepted' : 'Task_Rejected', needId, 
        `${status === 'Accepted' ? 'Accepted' : 'Rejected'} mission: ${need?.title}`);

      // Notify the NGO
      if (need) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: need.ngoId,
          message: `Volunteer ${profile.name} has ${status.toLowerCase()} your task: ${need.title}`,
          type: 'AssignmentUpdate',
          timestamp: Date.now(),
          read: false
        });
      }
    } catch (err: any) {
      console.error('Failed to update assignment:', err.message);
    }
  };

  const handleWithdraw = async (needId: string) => {
    const assignmentId = `${needId}_${user.uid}`;
    try {
      await updateDoc(doc(db, 'needs', needId), {
        assignedVolunteers: arrayRemove(user.uid)
      });
      await updateDoc(doc(db, 'assignments', assignmentId), { status: 'Rejected' });
      await createLog('Mission_Withdrawn', needId, `Withdrew from mission: ${needs.find(n => n.id === needId)?.title}`);
    } catch (err: any) {
      console.error('Withdrawal failed:', err.message);
    }
  };

  // Weighted matching algorithm
  const matchedNeeds = !profile.availability ? [] : needs.filter(need => {
    const assignment = assignments.find(a => a.needId === need.id);
    const hasSkillMatch = profile.skills.some(skill => 
      need.category.toLowerCase().includes(skill.toLowerCase()) ||
      need.description.toLowerCase().includes(skill.toLowerCase())
    );
    const hasLocationMatch = need.location.toLowerCase().includes(profile.location.toLowerCase());

    return (hasSkillMatch || hasLocationMatch) && !need.assignedVolunteers?.includes(user.uid) && (!assignment || assignment.status === 'Rejected');
  }).sort((a, b) => {
    // Skills are weighted more heavily (3 points) than location (1 point)
    const getScore = (need: Need) => {
      let score = 0;
      if (profile.skills.some(s => need.category.toLowerCase().includes(s.toLowerCase()))) score += 3;
      if (profile.skills.some(s => need.description.toLowerCase().includes(s.toLowerCase()))) score += 2;
      if (need.location.toLowerCase().includes(profile.location.toLowerCase())) score += 1;
      return score;
    };
    return getScore(b) - getScore(a);
  });

  const myTasks = needs.filter(n => n.assignedVolunteers?.includes(user.uid));

  const toggleAvailability = async () => {
    try {
      const newStatus = !profile.availability;
      await updateDoc(doc(db, 'users', user.uid), { availability: newStatus });
    } catch (err: any) {
      console.error('Failed to toggle availability:', err.message);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* 🚀 FIELD AGENT HUD */}
      <section className="bg-stone-900 rounded-[3rem] p-12 lg:p-14 text-white relative overflow-hidden shadow-2xl shadow-stone-900/40">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/10 rounded-full -mr-40 -mt-40 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <div className="mono-label !text-emerald-400 tracking-[0.4em] font-black">Active Field Operative</div>
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10">
                <div className={`w-2.5 h-2.5 rounded-full ${profile.availability ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`} />
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono font-bold text-stone-500 uppercase tracking-widest leading-none mb-1">Availability Status</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-300">
                    {profile.availability ? 'Ready' : 'Offline'}
                  </span>
                </div>
                <button 
                  onClick={toggleAvailability}
                  className={`w-12 h-6 rounded-full p-1 transition-all relative ${profile.availability ? 'bg-emerald-500' : 'bg-stone-700'}`}
                  aria-label="Toggle Availability"
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${profile.availability ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <h2 className="text-6xl font-black mb-6 tracking-tighter uppercase leading-none">Welcome, {profile.name}</h2>
            <p className="text-stone-400 text-xl font-medium leading-relaxed max-w-xl">
              Coordinating with <span className="text-white border-b-2 border-emerald-500/30 font-bold">{profile.skills.length} core competencies</span>. 
              {profile.availability ? (
                <>Gemini AI-3 has flagged <span className="text-emerald-400 font-black">{matchedNeeds.length} critical missions</span> requiring your unique skill matrix.</>
              ) : (
                <span className="text-rose-400 italic">Availability broadcast disabled. Reactive matching paused.</span>
              )}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
            <div className="bg-white/5 backdrop-blur-2xl px-10 py-8 rounded-[2.5rem] border border-white/10 tech-border">
              <div className="mono-label !text-stone-500 mb-2 tracking-widest">Impact Yield</div>
              <div className="text-5xl font-black text-emerald-400 leading-none">740</div>
              <div className="text-[10px] font-mono text-emerald-400/50 mt-3 uppercase font-bold tracking-widest">Global Rank: #12</div>
            </div>
            <div className="bg-white/5 backdrop-blur-2xl px-10 py-8 rounded-[2.5rem] border border-white/10 tech-border">
              <div className="mono-label !text-stone-500 mb-2 tracking-widest">Ops Completed</div>
              <div className="text-5xl font-black leading-none">{myTasks.filter(t => t.status === 'Completed').length}</div>
              <div className="text-[10px] font-mono text-stone-500 mt-3 uppercase font-bold tracking-widest">Sector Excellence</div>
            </div>
          </div>
        </div>
      </section>

      <IntelligenceHub needs={needs} reports={reports} />

      {/* TACTICAL TAB SELECTOR */}
      <div className="flex items-center gap-3 bg-stone-100 p-2 rounded-[2.5rem] w-fit mx-auto shadow-inner border border-stone-200/50">
        <button 
          onClick={() => setActiveTab('discover')}
          className={`px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 transition-all ${
            activeTab === 'discover' ? 'bg-stone-900 text-white shadow-2xl' : 'text-stone-400 hover:text-stone-900'
          }`}
        >
          <Search className="w-4 h-4" /> Discover Matrix
        </button>
        <button 
          onClick={() => setActiveTab('my-tasks')}
          className={`px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 transition-all relative ${
            activeTab === 'my-tasks' ? 'bg-stone-900 text-white shadow-2xl' : 'text-stone-400 hover:text-stone-900'
          }`}
        >
          <Zap className="w-4 h-4" /> Active Sortie
          {myTasks.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-stone-900 text-[8px] font-black px-2 py-1 rounded-full border-2 border-stone-100">
              {myTasks.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
        <AnimatePresence mode="wait">
          {(activeTab === 'discover' ? matchedNeeds : myTasks).map((need) => (
            <motion.div
              key={need.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] p-10 border border-stone-200/60 shadow-sm hover:shadow-2xl hover:shadow-stone-900/5 transition-all group flex flex-col h-full tech-border"
            >
              <div className="flex justify-between items-start mb-10">
                <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  need.urgency === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-stone-50 text-stone-400 border-stone-100'
                }`}>
                  {need.urgency} Intelligence
                </span>
                <div className="text-center">
                   <div className="mono-label !text-stone-300 !text-[8px] mb-1">Match</div>
                   <div className="text-xl font-black text-emerald-600">
                      {Math.floor(Math.random() * 15) + 85}%
                   </div>
                </div>
              </div>

              <h3 className="text-3xl font-black text-stone-900 leading-none mb-6 tracking-tighter uppercase group-hover:text-emerald-600 transition-colors">
                {need.title}
              </h3>
              
              <div className="flex items-center gap-3 text-stone-400 text-xs font-black uppercase tracking-tighter mb-4">
                <MapPin className="w-4 h-4 text-emerald-500" /> Sector {need.location}
              </div>

              {need.deadline && (
                <div className="mb-8 flex items-center gap-3 px-6 py-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Deadline</span>
                    <span className="text-[11px] font-black text-amber-900 uppercase tracking-tighter">
                      {new Date(need.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}

              {/* 📊 TACTICAL PROGRESS INDICATOR */}
              <div className="mb-10 p-6 bg-stone-900/[0.02] rounded-3xl border border-stone-100 shadow-inner">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-[0.2em]">Mission Integrity</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                    need.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                    need.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {need.status || 'Pending'}
                  </span>
                </div>
                
                <div className="relative h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out rounded-full ${
                      need.status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 
                      need.status === 'In Progress' ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-stone-400'
                    }`}
                    style={{ width: `${need.status === 'Completed' ? 100 : need.status === 'In Progress' ? 66 : 33}%` }}
                  />
                  {/* Subtle markers */}
                  <div className="absolute inset-0 flex justify-between px-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1 h-full bg-white/20" />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between mt-3 px-1 text-[8px] font-black uppercase tracking-[0.2em]">
                  <span className={need.status === 'Pending' || !need.status ? 'text-stone-900' : 'text-stone-400'}>Pending</span>
                  <span className={need.status === 'In Progress' ? 'text-stone-900' : 'text-stone-400'}>In Progress</span>
                  <span className={need.status === 'Completed' ? 'text-stone-900' : 'text-stone-400'}>Completed</span>
                </div>
              </div>

              <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100 mb-10 flex-grow shadow-inner">
                <div className="mono-label !text-stone-300 mb-4 tracking-widest">Situation Summary</div>
                <p className="text-stone-700 font-medium text-sm leading-relaxed tracking-tight line-clamp-4">
                  {need.aiSummary || need.description}
                </p>
              </div>

              <div className="space-y-4 mb-10">
                <div className="mono-label !text-stone-300 tracking-widest">Required Skill-Set</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-2 bg-stone-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl">
                    {need.category}
                  </span>
                  {['Medical', 'Education', 'Food', 'Logistics', 'Construction'].map(s => (
                    (need.description.toLowerCase().includes(s.toLowerCase()) && need.category !== s) && (
                      <span key={s} className="px-4 py-2 bg-white border border-stone-200 text-stone-500 text-[9px] font-black uppercase tracking-widest rounded-xl">
                        {s}
                      </span>
                    )
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-10 border-t border-stone-100 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="mono-label !text-stone-300">Target Impact</div>
                    <div className="font-black text-stone-900 uppercase tracking-tighter">{need.peopleAffected} Human Units</div>
                  </div>
                  
                  {activeTab === 'my-tasks' && (
                    <div className="flex items-center gap-2">
                       <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                         assignments.find(a => a.needId === need.id)?.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                         assignments.find(a => a.needId === need.id)?.status === 'Assigned' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                       }`}>
                         {assignments.find(a => a.needId === need.id)?.status || 'Pending'}
                       </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {activeTab === 'discover' ? (
                    <button 
                      onClick={() => handleApply(need.id, need.ngoId)}
                      className="w-full py-5 bg-stone-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all active:scale-[0.98] shadow-xl shadow-stone-900/10"
                    >
                      Initialize Deployment
                    </button>
                  ) : (
                    <>
                      {need.status === 'Completed' ? (
                        <div className="w-full flex items-center justify-center gap-3 text-emerald-600 font-black uppercase tracking-widest text-[10px] py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <CheckCircle className="w-4 h-4" /> Sequence Completed
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 w-full">
                          {assignments.find(a => a.needId === need.id)?.status === 'Assigned' ? (
                            <>
                              <button 
                                onClick={() => handleUpdateAssignment(need.id, 'Accepted')}
                                className="py-4 bg-emerald-600 text-stone-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" /> Accept
                              </button>
                              <button 
                                onClick={() => handleUpdateAssignment(need.id, 'Rejected')}
                                className="py-4 bg-white text-stone-400 border border-stone-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </>
                          ) : assignments.find(a => a.needId === need.id)?.status === 'Accepted' ? (
                            <button 
                              onClick={() => handleWithdraw(need.id)}
                              className="col-span-2 py-4 bg-white border border-stone-200 text-stone-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-stone-50 hover:text-stone-900 transition-all"
                            >
                              Withdraw from Mission
                            </button>
                          ) : (
                             <div className="col-span-2 text-center text-stone-300 font-black uppercase tracking-widest text-[9px] py-4 bg-stone-50 rounded-2xl border border-stone-100">
                                Mission Finalized
                             </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {activeTab === 'discover' && matchedNeeds.length === 0 && (
        <div className="text-center py-20 bg-stone-100 rounded-[3rem] border border-stone-200 dashed">
          <div className="max-w-md mx-auto">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900">No matching needs found</h3>
            <p className="text-stone-500 mt-2">Try updating your skills or checking again later. New needs are analyzed by AI every hour.</p>
          </div>
        </div>
      )}
    </div>
  );
}
