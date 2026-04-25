import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Shield, Users, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { VolunteerRegistration } from './VolunteerRegistration';
import { ProfileCompleteness } from './ProfileCompleteness';

interface RegistrationProps {
  user: User;
  onComplete: (profile: any) => void;
}

export function Registration({ user, onComplete }: RegistrationProps) {
  const [role, setRole] = useState<'NGO' | 'Volunteer' | null>(null);
  const [location, setLocation] = useState('');
  const [orgType, setOrgType] = useState('Non-Profit');
  const [loading, setLoading] = useState(false);

  const handleSubmitNGO = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const profile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Strategic Agent',
      email: user.email,
      role: 'NGO',
      location,
      orgType,
      deleted: false,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      onComplete(profile);
    } catch (err: any) {
      console.error("NGO profile sync failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (role === 'Volunteer') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full bg-white rounded-[3rem] shadow-2xl shadow-stone-200 border border-stone-100 overflow-hidden p-8 md:p-16"
        >
          <VolunteerRegistration user={user} onComplete={onComplete} onBack={() => setRole(null)} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl shadow-stone-200 border border-stone-100 overflow-hidden"
      >
        <div className="p-8 md:p-12">
          {!role ? (
            <>
              <h2 className="text-3xl font-black text-stone-900 mb-2">Join the Mission</h2>
              <p className="text-stone-500 mb-10 text-lg">Choose how you'll impact the community today.</p>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setRole('NGO')}
                  className="p-8 rounded-[2rem] border-2 text-left transition-all border-stone-100 hover:border-emerald-600 group"
                >
                  <Shield className="w-10 h-10 mb-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                  <div className="font-black text-2xl text-stone-900">I am an NGO</div>
                  <div className="text-stone-500 mt-1">Submit needs, analyze priority, and manage aid.</div>
                </button>

                <button
                  onClick={() => setRole('Volunteer')}
                  className="p-8 rounded-[2rem] border-2 text-left transition-all border-stone-100 hover:border-emerald-600 group"
                >
                  <Users className="w-10 h-10 mb-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                  <div className="font-black text-2xl text-stone-900">I'm a Volunteer</div>
                  <div className="text-stone-500 mt-1">Get matched with urgent tasks based on your skills.</div>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmitNGO} className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setRole(null)} className="p-2 -ml-2 text-stone-400"><ArrowRight className="w-5 h-5 rotate-180" /></button>
                <h2 className="text-3xl font-black text-stone-900">NGO Registration</h2>
              </div>
              
              <ProfileCompleteness 
                role="NGO" 
                profile={{ 
                  name: user.displayName || user.email?.split('@')[0],
                  location, 
                  orgType 
                }} 
              />

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Organization Location</label>
                <input
                  type="text"
                  required
                  placeholder="City, HQ Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Organization Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                >
                  <option value="Non-Profit">Non-Profit / NGO</option>
                  <option value="Governmental">Governmental Body</option>
                  <option value="Community Group">Local Community Group</option>
                  <option value="International">International Aid Org</option>
                  <option value="Other">Other Strategic Body</option>
                </select>
              </div>

              <button
                disabled={loading}
                className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black text-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 group"
              >
                Register NGO
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
