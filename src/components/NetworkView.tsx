import React, { useState, useEffect } from 'react';
import { db, toPlainObject } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Zap, Search, MapPin, Star, Filter, Heart, ArrowRight, Map as MapIcon } from 'lucide-react';
import { VolunteerProfile, Need, UserRole } from '../types';
import { TacticalMap } from './TacticalMap';

export const NetworkView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'volunteers' | 'ngos' | 'activities' | 'map'>('activities');
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [activities, setActivities] = useState<Need[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 📡 Stream Volunteers
    const vq = query(collection(db, 'users'), where('role', '==', 'Volunteer'));
    const unsubVolunteers = onSnapshot(vq, (snap) => {
      setVolunteers(snap.docs
        .map(d => toPlainObject({ uid: d.id, ...d.data() }) as VolunteerProfile)
        .filter(v => v.deleted !== true)
      );
    }, (err) => {
      console.warn("Volunteers sync limited:", err.message);
    });

    // 📡 Stream NGOs
    const nq = query(collection(db, 'users'), where('role', '==', 'NGO'));
    const unsubNgos = onSnapshot(nq, (snap) => {
      setNgos(snap.docs
        .map(d => toPlainObject({ uid: d.id, ...d.data() }) as any)
        .filter(n => n.deleted !== true)
      );
    }, (err) => {
      console.warn("NGOs sync limited:", err.message);
    });

    // 📡 Stream Activities
    const aq = query(collection(db, 'needs'));
    const unsubActivities = onSnapshot(aq, (snap) => {
      const sorted = snap.docs
        .map(d => toPlainObject({ id: d.id, ...d.data() }) as Need)
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      setActivities(sorted);
      setLoading(false);
    }, (err) => {
      console.warn("Activities stream limited:", err.message);
    });

    return () => {
      unsubVolunteers();
      unsubNgos();
      unsubActivities();
    };
  }, []);

  const filteredVolunteers = volunteers.filter(v => 
    v.name?.toLowerCase().includes(search.toLowerCase()) || 
    v.location?.toLowerCase().includes(search.toLowerCase()) ||
    v.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredNgos = ngos.filter(n => 
    n.name?.toLowerCase().includes(search.toLowerCase()) || 
    n.location?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActivities = activities.filter(a => 
    a.title?.toLowerCase().includes(search.toLowerCase()) || 
    a.location?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      {/* 🚀 HEADER & NAVIGATION */}
      <section className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="space-y-4">
          <div className="mono-label !text-emerald-500 tracking-[0.4em] font-black uppercase">Global Connectivity Hub</div>
          <h2 className="text-5xl lg:text-7xl font-black text-stone-900 leading-[0.85] tracking-tighter uppercase">
            Browse the <br />
            <span className="text-emerald-600">Network.</span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 p-2 bg-white border border-stone-200 rounded-[2rem] shadow-sm">
          {[
            { id: 'activities', label: 'Missions', icon: Zap },
            { id: 'volunteers', label: 'Field Agents', icon: Users },
            { id: 'ngos', label: 'NGO Hubs', icon: Shield },
            { id: 'map', label: 'Tactical Map', icon: MapIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-stone-900 text-white shadow-xl shadow-stone-900/20' 
                : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 🔍 SEARCH & FILTERS (Hide on map) */}
      {activeTab !== 'map' && (
        <section className="relative animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
            <Search className="w-6 h-6" />
          </div>
          <input 
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-16 pr-8 py-8 bg-white border-2 border-transparent focus:border-emerald-500 rounded-[2.5rem] shadow-sm font-black text-xl tracking-tight outline-none placeholder:text-stone-200 transition-all uppercase"
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
            <button className="p-3 bg-stone-50 rounded-2xl text-stone-400 hover:text-stone-900 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {/* 📦 CONTENT GRID / MAP */}
      <div className={activeTab === 'map' ? 'block' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}>
        <AnimatePresence mode="popLayout">
          {activeTab === 'volunteers' && filteredVolunteers.map(v => (
            <VolunteerCard key={v.uid} volunteer={v} />
          ))}
          {activeTab === 'ngos' && filteredNgos.map(n => (
            <NGOCard key={n.uid} ngo={n} />
          ))}
          {activeTab === 'activities' && filteredActivities.map(a => (
            <ActivityCard key={a.id} activity={a} />
          ))}
          {activeTab === 'map' && (
            <motion.div 
              key="tactical-map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full"
            >
              <TacticalMap ngos={ngos} missions={activities} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading && activeTab !== 'map' && (
          <div className="col-span-full py-32 text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <div className="mono-label !text-stone-300 uppercase tracking-widest">Synchronizing Network Data...</div>
          </div>
        )}

        {!loading && activeTab !== 'map' && (
          (activeTab === 'volunteers' && filteredVolunteers.length === 0) ||
          (activeTab === 'ngos' && filteredNgos.length === 0) ||
          (activeTab === 'activities' && filteredActivities.length === 0)
        ) && (
          <div className="col-span-full py-32 text-center border-4 border-dashed border-stone-100 rounded-[3rem]">
            <Search className="w-16 h-16 text-stone-100 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter mb-2">No Matches Found</h3>
            <p className="text-stone-400 font-medium">Try broadening your tactical search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

const VolunteerCard: React.FC<{ volunteer: VolunteerProfile }> = ({ volunteer }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-[2.5rem] p-8 border border-stone-200 hover:border-stone-400 transition-all group"
  >
    <div className="flex items-center gap-6 mb-8">
      <div className="w-20 h-20 rounded-3xl bg-stone-900 p-1 border-2 border-white shadow-xl group-hover:scale-105 transition-transform">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${volunteer.uid}`} alt={volunteer.name} className="w-full h-full object-cover rounded-2xl" />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xl font-black text-stone-900 uppercase leading-none">{volunteer.name}</h3>
          {volunteer.trustScore > 90 && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${volunteer.availability ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest">
            {volunteer.availability ? 'Available' : 'Busy'}
          </span>
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 mb-8">
      {volunteer.skills?.slice(0, 4).map(skill => (
        <span key={skill} className="px-3 py-1.5 bg-stone-50 rounded-xl text-[9px] font-black uppercase text-stone-600 tracking-tighter">
          {skill}
        </span>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-stone-100">
      <div className="space-y-1">
        <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest">Location</div>
        <div className="text-[11px] font-black text-stone-800 uppercase flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-500" /> Sector {volunteer.location}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest">Impact</div>
        <div className="text-[11px] font-black text-stone-800 uppercase flex items-center gap-1">
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> {volunteer.impactScore || 0} Points
        </div>
      </div>
    </div>
  </motion.div>
);

const NGOCard: React.FC<{ ngo: any }> = ({ ngo }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-[2.5rem] p-8 border border-stone-200 hover:border-black transition-all group"
  >
    <div className="flex items-center gap-6 mb-8">
      <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center border-2 border-white shadow-xl group-hover:scale-105 transition-transform">
        <Shield className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-xl font-black text-stone-900 uppercase leading-none mb-1">{ngo.name}</h3>
        <div className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest">Verified NGO Hub</div>
      </div>
    </div>

    <p className="text-xs text-stone-500 font-medium leading-relaxed tracking-tight mb-8 line-clamp-2">
      Authorized coordination body managing high-impact humanitarian missions within the UnitySync protocol.
    </p>

    <div className="pt-6 border-t border-stone-100 flex justify-between items-center">
      <div className="space-y-1">
        <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest">Operational Sector</div>
        <div className="text-[11px] font-black text-stone-800 uppercase flex items-center gap-1">
          <MapPin className="w-3 h-3 text-stone-900" /> {ngo.location || 'Central Command'}
        </div>
      </div>
      <ArrowRight className="w-6 h-6 text-stone-200 group-hover:text-black group-hover:translate-x-2 transition-all" />
    </div>
  </motion.div>
);

const ActivityCard: React.FC<{ activity: Need }> = ({ activity }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-[2.5rem] p-8 border border-stone-200 hover:border-emerald-500 transition-all group"
  >
    <div className="flex justify-between items-start mb-6">
      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
        activity.urgency === 'High' ? 'bg-rose-100 text-rose-700' : 
        activity.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
      }`}>
        {activity.urgency} Priority
      </div>
      <div className={`w-3 h-3 rounded-full ${
        activity.status === 'Completed' ? 'bg-emerald-500' : 
        activity.status === 'In Progress' ? 'bg-amber-500' : 'bg-stone-300'
      }`} />
    </div>

    <h3 className="text-xl font-black text-stone-900 uppercase leading-snug mb-3 line-clamp-1">{activity.title}</h3>
    <p className="text-xs text-stone-500 font-medium leading-relaxed tracking-tight mb-8 line-clamp-3">
      {activity.aiSummary || activity.description}
    </p>

    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-stone-100">
      <div className="space-y-1">
        <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest">Sector</div>
        <div className="text-[11px] font-black text-stone-800 uppercase flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-500" /> {activity.location}
        </div>
      </div>
      <div className="space-y-1 text-right">
        <div className="text-[8px] font-mono font-bold text-stone-300 uppercase tracking-widest">Impact</div>
        <div className="text-[11px] font-black text-stone-800 uppercase">
          {activity.peopleAffected}+ Lives
        </div>
      </div>
    </div>
  </motion.div>
);
