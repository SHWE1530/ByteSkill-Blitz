import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { User as UserIcon, MapPin, Briefcase, Clock, Star, Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { VolunteerProfile } from '../types';
import { ProfileCompleteness } from './ProfileCompleteness';

interface VolunteerRegistrationProps {
  user: User;
  onComplete: (profile: any) => void;
  onBack?: () => void;
}

export function VolunteerRegistration({ user, onComplete, onBack }: VolunteerRegistrationProps) {
  const [name, setName] = useState(user.displayName || '');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState(true);
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Intermediate');
  const [loading, setLoading] = useState(false);

  const availableSkills = ['Medical', 'First Aid', 'Teaching', 'Logistics', 'Cooking', 'I.T.', 'Construction', 'Social Work', 'Translation'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const profile = {
      uid: user.uid,
      name,
      email: user.email,
      role: 'Volunteer',
      location,
      skills,
      availability,
      experienceLevel,
      deleted: false,
      createdAt: Date.now(),
      impactScore: 0
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      onComplete(profile);
    } catch (err: any) {
      console.error('Registration error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-6">
        {onBack && (
          <button onClick={onBack} className="p-3 bg-stone-100 rounded-2xl text-stone-400 hover:text-stone-900 transition-all">
            <ArrowRight className="w-6 h-6 rotate-180" />
          </button>
        )}
        <div>
           <div className="mono-label tracking-[0.3em] mb-1">Operative Setup</div>
           <h2 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none">Field Agent Profile</h2>
        </div>
      </div>

      <ProfileCompleteness 
        role="Volunteer" 
        profile={{ 
          name, 
          location, 
          skills, 
          experienceLevel 
        }} 
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Basic Info */}
        <div className="space-y-10">
          <div className="space-y-4">
            <label className="mono-label !text-stone-400 flex items-center gap-3">
              <UserIcon className="w-3.5 h-3.5" /> Agent Identity
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-3xl outline-none focus:border-stone-900 transition-all font-bold text-lg"
              placeholder="e.g., Alex Rivers"
            />
          </div>

          <div className="space-y-4">
            <label className="mono-label !text-stone-400 flex items-center gap-3">
              <MapPin className="w-3.5 h-3.5" /> Deployment Base
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-6 py-5 bg-stone-50 border border-stone-100 rounded-3xl outline-none focus:border-stone-900 transition-all font-bold text-lg"
              placeholder="e.g., Downtown, Sector 4"
            />
          </div>

          <div className="space-y-4">
            <label className="mono-label !text-stone-400 flex items-center gap-3">
              <Star className="w-3.5 h-3.5" /> Technical Tier
            </label>
            <div className="grid grid-cols-3 gap-3 p-1.5 bg-stone-100 rounded-[2rem]">
              {(['Beginner', 'Intermediate', 'Expert'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setExperienceLevel(level)}
                  className={`py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    experienceLevel === level 
                      ? 'bg-stone-900 text-white shadow-xl shadow-stone-900/10' 
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 bg-stone-900 rounded-[2.5rem] shadow-2xl shadow-stone-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  availability ? 'bg-emerald-500 text-stone-900' : 'bg-stone-800 text-stone-500'
                }`}>
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-white font-black text-lg leading-none mb-1">Availability</div>
                  <div className="mono-label !text-stone-500 !text-[8px]">{availability ? 'Active Operative' : 'Offline Mode'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvailability(!availability)}
                className={`w-16 h-9 rounded-full p-1.5 transition-all ${availability ? 'bg-emerald-500' : 'bg-stone-700'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${availability ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Skills Selection */}
        <div className="space-y-10">
          <div className="space-y-4">
            <label className="mono-label !text-stone-400 flex items-center gap-3">
              <Briefcase className="w-3.5 h-3.5" /> Skill Matrix (Multi-Select)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableSkills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`flex items-center justify-between px-6 py-4 rounded-3xl tech-border text-xs font-black uppercase tracking-tighter transition-all ${
                    skills.includes(skill)
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'bg-white border-stone-100 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {skill}
                  {skills.includes(skill) && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <button
              disabled={loading || !location || skills.length === 0}
              className="w-full py-6 bg-emerald-600 text-stone-900 rounded-[2.5rem] font-black text-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-7 h-7 border-4 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
              ) : (
                <>
                  Initialize Protocol
                  <ArrowRight className="w-7 h-7" />
                </>
              )}
            </button>
            <p className="text-center font-mono text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-6 px-10 leading-relaxed">
              By initializing, you confirm availability for high-priority humanitarian response.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
