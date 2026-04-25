import React, { useState, useEffect } from 'react';
import { auth, db, toPlainObject } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { NGODashboard } from './components/NGODashboard';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import { Registration } from './components/Registration';
import { LoginPage } from './components/LoginPage';
import { NetworkView } from './components/NetworkView';
import { ScheduleView } from './components/ScheduleView';
import { DailyReport } from './components/DailyReport';
import { ProfileCompleteness } from './components/ProfileCompleteness';
import { LogOut, Heart, Shield, Users, Bell, Zap, Terminal, Activity, Layers, ArrowRight, AlertCircle, Globe, Trash2, Settings as SettingsIcon, Calendar as CalendarIcon, Save, RefreshCw, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActivityLog } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const [activeView, setActiveView] = useState<'dashboard' | 'notifications' | 'terminal' | 'settings' | 'network' | 'schedule' | 'reports'>('dashboard');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 📝 PROFILE EDITING STATE
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editOrgType, setEditOrgType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditLocation(profile.location || '');
      setEditOrgType(profile.orgType || 'Non-Profit');
    }
  }, [profile]);

  const updateProfileData = async () => {
    if (!user || !profile) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        name: editName,
        location: editLocation,
        orgType: profile.role === 'NGO' ? editOrgType : (profile.orgType || null),
        updatedAt: serverTimestamp()
      });
      alert("Operational Profile Protocol Synchronized.");
    } catch (err: any) {
      console.error("Sync failure:", err.message);
      alert(`Sync failure: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 🔐 ACCOUNT DELETION PROTOCOL
  const deleteAccount = async () => {
    if (!user) return;
    const confirmed = window.confirm("CRITICAL WARNING: This will permanently purge your tactical profile from UnitySync. This action is irreversible. Proceed?");
    if (!confirmed) return;

    try {
      // 1. Mark Operational Profile as Purged
      await setDoc(doc(db, 'users', user.uid), { 
        ...profile,
        deleted: true, 
        deletedAt: serverTimestamp(),
      });
      // 2. Clear Auth Session & Reset State
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setActiveView('dashboard');
      alert("Operational profile purged. Terminal session terminated.");
    } catch (err: any) {
      console.error("Purge failure:", err.message);
      alert(`Purge failed: ${err.message}`);
    }
  };

  // 🔐 AUTHENTICATION PROTOCOL
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        // Strict sanitization of user object for state
        const sanitized = {
          uid: u.uid,
          email: u.email || 'unknown@ops.local',
          displayName: u.displayName || u.email?.split('@')[0] || 'Field Agent'
        };
        setUser(sanitized as any);

        if (unsubProfile) unsubProfile();
        unsubProfile = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) setProfile(toPlainObject(snap.data())); // Use tactical sanitization
          else setProfile(null);
          setLoading(false);
        }, (err) => {
          console.error("Profile sync failure:", err.message);
        });
      } else {
        if (unsubProfile) unsubProfile();
        unsubProfile = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // 📡 GLOBAL ACTIVITY PROTOCOL
  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }

    const lq = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(15));
    const unsubLogs = onSnapshot(lq, (snap) => {
      setLogs(snap.docs.map(d => toPlainObject({ id: d.id, ...d.data() }) as ActivityLog));
    }, (err) => {
      console.warn("Stream visibility issue:", err.message);
    });

    return () => unsubLogs();
  }, [user?.uid]);

  const login = async (email?: string, password?: string, username?: string, isSignUp?: boolean, role?: 'Volunteer' | 'NGO') => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      if (email && password) {
        if (isSignUp) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (username) {
            await updateProfile(cred.user, { displayName: username });
          }
          // Seed initial user record with the selected role protocol
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            email: email,
            name: username || email.split('@')[0],
            role: role || null, 
            createdAt: serverTimestamp(),
            deleted: false
          });
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      console.error('Auth error:', error.code, error.message);
      let friendlyMessage = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        friendlyMessage = `Operational Protocol Restricted: This sign-in method is not enabled in your Firebase Console. 
        Please enable "Email/Password" at: https://console.firebase.google.com/project/gen-lang-client-0257777742/authentication/providers
        Alternatively, use the redundant "Google Tactical Sync" protocol.`;
      } else if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = "Email already registered in the operational network. Try synchronizing instead of initializing.";
      }
      setLoginError(friendlyMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage 
        onLogin={login} 
        isLoggingIn={isLoggingIn} 
        loginError={loginError} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* 🧭 GLOBAL NAVIGATION */}
      <aside className="w-20 lg:w-28 flex flex-col items-center py-10 bg-white border-r border-stone-200 sticky top-0 h-screen z-40">
        <div className="w-12 lg:w-16 h-12 lg:h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center text-white mb-12 shadow-2xl shadow-stone-900/20">
          <Zap className="w-6 lg:w-8 h-6 lg:h-8 fill-emerald-400 text-emerald-400" />
        </div>
        
        <div className="flex flex-col gap-6 lg:gap-8 grow items-center">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'dashboard' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('notifications')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'notifications' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Bell className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('terminal')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'terminal' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Terminal className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('network')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'network' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Globe className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('schedule')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'schedule' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <CalendarIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'reports' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <FileText className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('settings')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'settings' ? 'bg-emerald-50 text-emerald-600 md:scale-110 shadow-sm' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="p-4 text-stone-400 hover:text-rose-600 transition-all rounded-2xl hover:bg-rose-50"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </aside>

      {/* 🚀 MAIN OPERATIONAL VIEW */}
      <main className="flex-1 min-h-screen p-6 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 lg:mb-16">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-stone-100 rounded-3xl tech-border">
               {!profile ? <Users className="w-8 h-8 text-emerald-600" /> : profile.role === 'NGO' ? <Shield className="w-8 h-8 text-emerald-600" /> : <Users className="w-8 h-8 text-emerald-600" />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-stone-900 tracking-tighter uppercase">{!profile ? 'Strategic Entry' : profile.role === 'NGO' ? 'NGO Command' : 'Volunteer OP'}</h1>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black font-mono px-3 py-1 rounded-full uppercase">System Ready</span>
              </div>
              <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-[0.3em]">Sector: {profile?.location || 'Global Discovery'} | Trust Index: 100%</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white p-3 pr-6 rounded-3xl border border-stone-200/60 shadow-sm group hover:border-stone-400 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 overflow-hidden border-2 border-white shadow-lg overflow-hidden group-hover:scale-105 transition-transform">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="User" />
            </div>
            <div>
               <div className="mono-label !text-stone-300 !text-[8px] mb-0.5">Active Agent</div>
               <div className="text-xs font-black text-stone-900 uppercase">{user.displayName || user.email?.split('@')[0]}</div>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[9px] font-mono text-stone-400 font-bold tracking-widest">{user.email}</span>
               </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={errorStatus ? 'error' : (profile ? activeView : 'registration') + (profile?.role || '')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {errorStatus ? (
              <div className="min-h-[60vh] glass-card p-12 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
                <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter mb-2">Sync Interrupted</h3>
                <p className="text-stone-500 font-medium max-w-sm">{errorStatus}</p>
                <button 
                   onClick={() => window.location.reload()}
                   className="mt-8 px-8 py-3 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all"
                >
                   Retry Synchronization
                </button>
              </div>
            ) : (!profile || !profile.role || profile.deleted) ? (
              <Registration user={user} onComplete={(p: any) => setProfile(p)} />
            ) : activeView === 'dashboard' ? (
              profile.role === 'NGO' ? (
                <NGODashboard user={user} />
              ) : (
                <VolunteerDashboard user={user} profile={profile} />
              )
            ) : activeView === 'network' ? (
              <NetworkView />
            ) : activeView === 'schedule' ? (
              <ScheduleView user={user} profile={profile} />
            ) : activeView === 'reports' ? (
              <DailyReport user={user} profile={profile} />
            ) : activeView === 'settings' ? (
              <div className="max-w-4xl border-t border-stone-200 mt-12 py-16">
                 <div className="space-y-16">
                    <section>
                       <div className="flex justify-between items-end mb-8">
                          <div>
                             <h2 className="text-4xl font-black text-stone-900 tracking-tighter uppercase mb-2">Operational Intel</h2>
                             <p className="text-stone-400 font-medium tracking-tight">Modify your tactical footprint in the response network.</p>
                          </div>
                          <button 
                             onClick={updateProfileData}
                             disabled={isSaving}
                             className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-3 disabled:opacity-50"
                          >
                             {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                             Save Protocol
                          </button>
                       </div>
                       
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-1">
                             <div className="p-10 bg-white border border-stone-200 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm">
                                <div className="w-24 h-24 rounded-3xl bg-stone-900 p-1 border-4 border-stone-50 mb-6 shadow-xl">
                                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="User" className="w-full h-full rounded-2xl" />
                                </div>
                                <div className="text-2xl font-black text-stone-900 uppercase tracking-tighter mb-1">{profile.name}</div>
                                <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full tracking-widest mb-4">
                                   {profile.role} Operative
                                </div>

                                <div className="w-full mb-4">
                                   <ProfileCompleteness 
                                      role={profile.role} 
                                      profile={{
                                         ...profile,
                                         name: editName,
                                         location: editLocation,
                                         orgType: profile.role === 'NGO' ? editOrgType : profile.orgType
                                      }} 
                                   />
                                </div>
                                                <div className="flex gap-2 p-1.5 bg-stone-100 rounded-2xl w-full mb-2">
                                   <button 
                                      onClick={() => setDoc(doc(db, 'users', user.uid), { ...profile, role: 'Volunteer' })}
                                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${profile.role === 'Volunteer' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}
                                   >
                                      Volunteer
                                   </button>
                                   <button 
                                      onClick={() => setDoc(doc(db, 'users', user.uid), { ...profile, role: 'NGO' })}
                                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${profile.role === 'NGO' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}
                                   >
                                      NGO
                                   </button>
                                </div>
                             </div>
                          </div>

                          <div className="lg:col-span-2 space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest ml-1">Agent Handle</label>
                                   <input 
                                      type="text"
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      className="w-full px-6 py-4 bg-white border border-stone-200 rounded-2xl font-bold text-stone-900 focus:border-stone-900 outline-none transition-all"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest ml-1">Sector Assignment</label>
                                   <input 
                                      type="text"
                                      value={editLocation}
                                      onChange={e => setEditLocation(e.target.value)}
                                      className="w-full px-6 py-4 bg-white border border-stone-200 rounded-2xl font-bold text-stone-900 focus:border-stone-900 outline-none transition-all"
                                   />
                                </div>
                             </div>

                             {profile.role === 'NGO' && (
                                <div className="space-y-2 animate-in fade-in duration-500">
                                   <label className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-widest ml-1">NGO Strategic Category</label>
                                   <select 
                                      value={editOrgType}
                                      onChange={e => setEditOrgType(e.target.value)}
                                      className="w-full px-6 py-4 bg-white border border-stone-200 rounded-2xl font-bold text-stone-900 focus:border-stone-900 outline-none transition-all appearance-none"
                                   >
                                      <option value="Non-Profit">Non-Profit / NGO</option>
                                      <option value="Governmental">Governmental Body</option>
                                      <option value="Community Group">Local Community Group</option>
                                      <option value="International">International Aid Org</option>
                                      <option value="Other">Other Strategic Body</option>
                                   </select>
                                </div>
                             )}

                             <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                                <div className="flex items-center gap-3 text-stone-400 mb-2">
                                   <Shield className="w-4 h-4" />
                                   <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Digital Signature</span>
                                </div>
                                <div className="text-xs font-mono text-stone-300 break-all">{user.uid}</div>
                             </div>
                          </div>
                       </div>
                    </section>

                    <section className="pt-12 border-t border-stone-100">
                       <h2 className="text-xl font-black text-rose-600 tracking-tighter uppercase mb-2 flex items-center gap-3">
                          <AlertCircle className="w-5 h-5" />
                          Danger Zone
                       </h2>
                       <p className="text-stone-400 font-medium tracking-tight mb-8">Irreversible administrative actions.</p>
                       
                       <div className="p-10 bg-rose-50 border border-rose-100 rounded-[2.5rem]">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                             <div className="max-w-md">
                                <div className="text-lg font-black text-rose-900 uppercase tracking-tighter mb-1">Purge Operational Profile</div>
                                <p className="text-stone-500 font-medium text-sm leading-relaxed">
                                   Permanently delete all your records, missions, and trust index data. This cannot be undone.
                                </p>
                             </div>
                             <button 
                                onClick={deleteAccount}
                                className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 flex items-center gap-3 active:scale-95 whitespace-nowrap"
                             >
                                <Trash2 className="w-4 h-4" />
                                Initiate Purge
                             </button>
                          </div>
                       </div>
                    </section>
                 </div>
              </div>
            ) : (
              <div className="min-h-[60vh] glass-card p-12 flex flex-col items-center justify-center text-center">
                <Terminal className="w-16 h-16 text-stone-200 mb-6" />
                <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter mb-2">Protocol: {activeView.toUpperCase()}</h3>
                <p className="text-stone-500 font-medium max-w-sm">
                  The {activeView} module is currently undergoing AI maintenance. Tactical synchronization will resume shortly.
                </p>
                <button 
                   onClick={() => setActiveView('dashboard')}
                   className="mt-8 px-8 py-3 bg-stone-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all"
                >
                   Return to Dashboard
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 📡 GLOBAL ACTIVITY STREAM */}
      <aside className="hidden xl:flex w-96 flex-col bg-stone-100/30 border-l border-stone-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        <div className="p-10 border-b border-stone-200 bg-white/50 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-[0.2em] flex items-center gap-3">
               <Activity className="w-4 h-4 text-emerald-600" />
               Coordination Stream
            </h2>
            <div className="p-1.5 bg-emerald-100 rounded-lg">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest">Real-time Global Operations</p>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {logs.map((log, i) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-8"
            >
              <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-stone-900 shadow-[0_0_0_4px_rgba(255,255,255,1),0_0_0_6px_rgba(0,0,0,0.1)]" />
              <div className="absolute left-[3px] top-6 bottom-[-40px] w-px bg-stone-200 last:hidden" />
              
              <div className="mono-label !text-stone-300 mb-2">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-xs font-black text-stone-800 leading-relaxed tracking-tight group">
                {log.message}
              </div>
              <div className="flex items-center gap-2 mt-3">
                 <span className="text-[9px] font-mono font-black py-1 px-2.5 bg-stone-100 rounded-lg text-stone-400 uppercase border border-stone-200">
                   {log.type.replace('_', ' ')}
                 </span>
              </div>
            </motion.div>
          ))}
          {logs.length === 0 && (
             <div className="py-24 text-center">
                <Terminal className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                <div className="mono-label !text-stone-300">Awaiting encrypted signals...</div>
             </div>
          )}
        </div>

        <div className="p-10 border-t border-stone-200 bg-white/80 backdrop-blur-md">
           <div className="p-6 bg-stone-900 rounded-[2rem] shadow-xl shadow-stone-900/10">
              <div className="mono-label !text-stone-500 mb-3 tracking-[0.2em]">Regional Status</div>
              <div className="flex items-center justify-between">
                 <div className="text-sm font-black text-white flex items-center gap-3 uppercase">
                    All Sectors Sync'd
                 </div>
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-stone-900 bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-stone-900">
                        {i}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </aside>
    </div>
  );
}
