import React, { useState, useEffect } from 'react';
import { generateSystemInsights } from '../lib/gemini';
import { Need } from '../types';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCcw, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IntelligenceHubProps {
  needs: Need[];
  reports: any[];
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ needs, reports }) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (needs.length === 0) return;
    setLoading(true);
    try {
      const data = await generateSystemInsights(needs, reports);
      setInsights(data);
    } catch (err) {
      console.error("Intelligence failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [needs.length]);

  return (
    <div className="bg-stone-900 rounded-[3rem] p-10 lg:p-12 text-white border border-white/10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-emerald-500/20 transition-all duration-1000" />
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500 text-stone-900 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <div className="mono-label !text-emerald-400 tracking-[0.4em] font-black uppercase mb-1">Tactical Analysis</div>
              <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">Neural Intelligence Hub</h3>
            </div>
          </div>
          
          <button 
            onClick={fetchInsights}
            disabled={loading}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Resync Analysis
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatePresence mode="wait">
            {loading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="space-y-4 animate-pulse">
                    <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                    <div className="h-20 w-full bg-white/5 rounded-3xl" />
                 </div>
               ))
            ) : insights?.insights ? (
              insights.insights.map((insight: any, idx: number) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/[0.08] transition-all group/card"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       {insight.urgency === 'Critical' ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : 
                        insight.urgency === 'Action Required' ? <Zap className="w-5 h-5 text-amber-500" /> : 
                        <Lightbulb className="w-5 h-5 text-emerald-500" />}
                       <span className={`text-[8px] font-black uppercase tracking-widest ${
                         insight.urgency === 'Critical' ? 'text-rose-500' : 
                         insight.urgency === 'Action Required' ? 'text-amber-500' : 'text-emerald-500'
                       }`}>{insight.urgency}</span>
                    </div>
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tighter mb-4 text-stone-100">{insight.title}</h4>
                  <p className="text-xs text-stone-400 leading-relaxed font-semibold">{insight.content}</p>
                </motion.div>
              ))
            ) : (
                <div className="col-span-full py-12 text-center text-stone-500 font-black uppercase tracking-widest italic">
                  Systems idling. Initialize resync to generate tactical patterns.
                </div>
            )}
          </AnimatePresence>
        </div>

        {insights && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 p-8 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[8px] font-mono font-bold text-emerald-500/50 uppercase tracking-widest mb-1">Global Theater Sentiment</div>
                <div className="text-xl font-black text-emerald-400 uppercase tracking-tighter">{insights.overallSentiment}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 border-l border-emerald-500/20 pl-8 h-full">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[8px] font-mono font-bold text-emerald-500/50 uppercase tracking-widest mb-1">Priority Sector</div>
                <div className="text-xl font-black text-emerald-400 uppercase tracking-tighter">{insights.recommendedFocus}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
