import React from 'react';
import { motion } from 'motion/react';
import { Zap, ArrowRight, Shield, Globe, Cpu, Users, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email?: string, password?: string, username?: string, isSignUp?: boolean, role?: 'Volunteer' | 'NGO') => void;
  isLoggingIn: boolean;
  loginError: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoggingIn, loginError }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<'Volunteer' | 'NGO'>('Volunteer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password, username, isSignUp, selectedRole);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500 selection:text-black flex flex-col lg:flex-row overflow-hidden">
      {/* 🟢 LEFT PANEL: STRATEGIC BRANDING */}
      <div className="relative flex-1 p-8 lg:p-20 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
        {/* Ambient background effect */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
            <Zap className="text-black w-7 h-7 fill-black" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter uppercase leading-none block">UnitySync</span>
            <span className="text-[8px] font-mono font-bold text-white/30 tracking-[0.4em] uppercase">Tactical Ops Node</span>
          </div>
        </motion.header>

        <div className="relative z-10 mt-10 lg:mt-0">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Protocol V3.4 Active</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl xl:text-[100px] font-black leading-[0.85] tracking-tighter uppercase mb-10 translate-x-[-0.05em]">
              Strategic <br />
              <span className="text-emerald-500">Response.</span>
            </h1>
            
            <p className="text-base lg:text-lg text-white/50 max-w-sm font-medium leading-relaxed tracking-tight mb-8">
              The world's most advanced community aid synchronization engine. 
              Matching humanitarian needs with field agents.
            </p>

            <div className="grid grid-cols-2 gap-8 max-w-xs">
              <div className="space-y-2">
                <div className="text-2xl font-black tracking-tighter">98.4%</div>
                <div className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-widest">Match Rate</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-black tracking-tighter">240ms</div>
                <div className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-widest">Latency</div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 mt-10 lg:mt-0 pt-8 border-t border-white/5"
        >
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-xl bg-white/5 border-2 border-[#050505] overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 555}`} alt="Agent" />
                </div>
              ))}
            </div>
            <div className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-widest">
              1,240 Agents Online
            </div>
          </div>
        </motion.footer>
      </div>

      {/* ⚪ RIGHT PANEL: ACCESS CONTROL */}
      <div className="flex-1 bg-white flex flex-col justify-center p-8 lg:p-20 relative overflow-hidden">
        {/* Subtle grid pattern for light side */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="max-w-sm w-full mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-10">
              <h2 className="text-3xl font-black text-black tracking-tighter uppercase mb-2">
                {isSignUp ? 'Initialize Profile.' : 'Authenticate.'}
              </h2>
              <p className="text-stone-400 text-sm font-medium tracking-tight">
                Google Login is the primary tactical sync protocol. Manual email entry requires console activation.
              </p>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-4"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[9px] font-mono font-bold text-rose-500 uppercase tracking-widest mb-1">Access Protocol Failed</div>
                    <p className="text-[11px] text-rose-700 font-bold leading-relaxed tracking-tight">{loginError}</p>
                  </div>
                </div>
                {loginError.includes('auth/operation-not-allowed') && (
                  <div className="pt-4 border-t border-rose-100 space-y-3">
                    <p className="text-[10px] text-rose-600 font-medium leading-relaxed">
                      Tactical Note: The Manual Credentials protocol is currently restricted. To resolve this:
                    </p>
                    <ul className="text-[9px] text-rose-500 space-y-1.5 list-disc pl-4 font-bold uppercase tracking-tight">
                      <li>Enable "Email/Password" in <a href="https://console.firebase.google.com/project/gen-lang-client-0257777742/authentication/providers" target="_blank" rel="noopener noreferrer" className="underline hover:text-rose-700 transition-colors">Firebase Console</a></li>
                      <li>Alternatively, use the redundant "Google Tactical Sync" protocol below</li>
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            <button
              type="button"
              onClick={() => onLogin()}
              disabled={isLoggingIn}
              className="w-full group relative overflow-hidden px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] hover:bg-emerald-700 transition-all flex items-center justify-center gap-6 shadow-2xl shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 mb-8"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google Tactical Sync
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-stone-100" />
              <span className="text-[9px] font-mono font-bold text-stone-300 uppercase tracking-widest">Manual Legacy Access</span>
              <div className="h-px flex-1 bg-stone-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 opacity-60 hover:opacity-100 transition-opacity">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest ml-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="field_agent_01"
                    className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-black focus:bg-white text-black font-semibold rounded-2xl outline-none transition-all placeholder:text-stone-300"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest ml-1">Operational Protocol</label>
                  <div className="grid grid-cols-2 gap-3 p-2 bg-stone-50 rounded-2xl border border-stone-100">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('Volunteer')}
                      className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${selectedRole === 'Volunteer' ? 'bg-black text-white shadow-lg' : 'text-stone-400 hover:text-black'}`}
                    >
                      Field Agent
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('NGO')}
                      className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${selectedRole === 'NGO' ? 'bg-black text-white shadow-lg' : 'text-stone-400 hover:text-black'}`}
                    >
                      NGO Coordinator
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest ml-1">Secure Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@agency.gov"
                  className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-black focus:bg-white text-black font-semibold rounded-2xl outline-none transition-all placeholder:text-stone-300"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest ml-1">Credentials</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-black focus:bg-white text-black font-semibold rounded-2xl outline-none transition-all placeholder:text-stone-300"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full group relative overflow-hidden px-8 py-5 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-6 shadow-2xl shadow-black/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create ID' : 'Synchronize'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="text-[11px] text-stone-400 font-medium">
                {isSignUp ? 'Already have manual credentials?' : 'New field operative?'}
              </span>
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[11px] font-black text-black uppercase tracking-tighter hover:text-emerald-600 underline underline-offset-4 decoration-stone-200"
              >
                {isSignUp ? 'Authenticate' : 'Initialize ID'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Layers = (props: any) => (
  <svg 
    {...props} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.27a1 1 0 0 0 0 1.83l8.58 4.09a2 2 0 0 0 1.66 0l8.58-4.09a1 1 0 0 0 0-1.83Z" />
    <path d="m2.6 11.39 8.58 4.09a2 2 0 0 0 1.66 0l8.58-4.09" />
    <path d="m2.6 15.61 8.58 4.09a2 2 0 0 0 1.66 0l8.58-4.09" />
  </svg>
);
