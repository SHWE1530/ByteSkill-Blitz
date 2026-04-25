import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileCompletenessProps {
  profile: any;
  role: 'NGO' | 'Volunteer';
}

export const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({ profile, role }) => {
  const { percentage, missingFields } = useMemo(() => {
    let fields: { name: string; label: string; value: any }[] = [];
    
    if (role === 'Volunteer') {
      fields = [
        { name: 'name', label: 'Agent Handle', value: profile.name },
        { name: 'location', label: 'Deployment Base', value: profile.location },
        { name: 'skills', label: 'Skill Matrix', value: profile.skills && profile.skills.length > 0 ? profile.skills : null },
        { name: 'experienceLevel', label: 'Technical Tier', value: profile.experienceLevel },
      ];
    } else {
      fields = [
        { name: 'name', label: 'Org Name', value: profile.name },
        { name: 'location', label: 'HQ Location', value: profile.location },
        { name: 'orgType', label: 'Strategic Category', value: profile.orgType },
      ];
    }

    const filledFields = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    const percentage = Math.round((filledFields.length / fields.length) * 100);
    const missing = fields.filter(f => !f.value || (Array.isArray(f.value) && f.value.length === 0)).map(f => f.label);

    return { percentage, missingFields: missing };
  }, [profile, role]);

  return (
    <div className="bg-white border border-stone-100 rounded-[2rem] p-6 shadow-sm overflow-hidden relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${percentage === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">Tactical Readiness</div>
            <div className="text-lg font-black text-stone-900 uppercase tracking-tight">{percentage}% Complete</div>
          </div>
        </div>
        {percentage === 100 ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        ) : (
          <AlertCircle className="w-6 h-6 text-amber-500 animate-pulse" />
        )}
      </div>

      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden mb-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full transition-all duration-1000 ease-out ${
            percentage === 100 ? 'bg-emerald-500' : percentage > 50 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
        />
      </div>

      {missingFields.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[8px] font-mono font-bold text-stone-400 uppercase tracking-widest">Awaiting Intel on:</div>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map(field => (
              <span key={field} className="px-2 py-0.5 bg-stone-50 border border-stone-100 rounded-md text-[8px] font-black text-stone-500 uppercase tracking-tight">
                {field}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-widest">
          Mission Ready • All Systems Nominal
        </div>
      )}
    </div>
  );
};
