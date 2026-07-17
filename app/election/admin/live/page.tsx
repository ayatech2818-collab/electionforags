'use client';

import { useState, useEffect } from 'react';
import { getElections, getPositions, getLiveTallies } from '../actions';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
);

// Neumorphic shadow presets for bg-[#e6eaf0]
const shadowRaised = "shadow-[8px_8px_16px_#c8ccd3,-8px_-8px_16px_#ffffff]";
const shadowRaisedSm = "shadow-[4px_4px_8px_#c8ccd3,-4px_-4px_8px_#ffffff]";
const shadowRecessed = "shadow-[inset_6px_6px_12px_#c8ccd3,inset_-6px_-6px_12px_#ffffff]";

const barColors = [
  "bg-gradient-to-b from-slate-300 to-slate-400",
  "bg-gradient-to-b from-orange-400 to-orange-500",
  "bg-gradient-to-b from-amber-400 to-amber-500",
  "bg-gradient-to-b from-blue-400 to-blue-500",
  "bg-gradient-to-b from-emerald-400 to-emerald-500",
  "bg-gradient-to-b from-rose-400 to-rose-500",
  "bg-gradient-to-b from-indigo-400 to-indigo-500",
];

export default function LiveAnalyticsPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [activeElec, setActiveElec] = useState<any>(null);
  
  const [positions, setPositions] = useState<any[]>([]);
  const [tallies, setTallies] = useState<Record<string, any[]>>({});
  
  const [activePositionIndex, setActivePositionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const elecData = await getElections();
      setElections(elecData);
      if (elecData.length > 0) setActiveElec(elecData[0]);
      setIsLoading(false);
    }
    init();
  }, []);

  const loadDashboardData = async () => {
    try {
      const posData = await getPositions(activeElec.id);
      setPositions(posData);
      
      const newTallies = await getLiveTallies(activeElec.id, posData.map((p: any) => p.id), ['all']);
      setTallies(newTallies);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeElec) {
      loadDashboardData();

      // Setup Supabase Realtime
      const channel = supabase.channel(`election_updates_${activeElec.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'election_votes', filter: `election_id=eq.${activeElec.id}` },
          (payload) => {
            console.log('New vote cast!', payload);
            loadDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeElec]);

  if (isLoading) return <div className="h-screen w-full bg-[#e6eaf0] flex items-center justify-center font-sans text-slate-500 animate-pulse">Loading Live Analytics...</div>;
  if (!activeElec) return <div className="h-screen w-full bg-[#e6eaf0] flex items-center justify-center font-sans text-slate-500">No active elections found.</div>;

  const activePosition = positions[activePositionIndex];
  
  // Calculate candidate data for the active position
  let candidateData: any[] = [];
  if (activePosition) {
    const posTallies = tallies[activePosition.id] || [];
    
    candidateData = activePosition.election_candidates.map((c: any, index: number) => {
      const tallyObj = posTallies.find((t: any) => t.candidate_id === c.id);
      const votes = tallyObj ? Number(tallyObj.vote_count) : 0;
      
      let grade = '';
      if (c.students?.classes) {
        const cl = Array.isArray(c.students.classes) ? c.students.classes[0] : c.students.classes;
        if (cl?.title) grade = cl.title.replace('Grade ', '');
      }

      return {
        id: c.id,
        name: c.students?.full_name || 'Unknown',
        grade: grade,
        photoUrl: c.photo_url,
        symbolUrl: c.symbol_url,
        votes: votes,
        colorIndex: index % barColors.length
      };
    });
    
    // Sort by original order or alphabetically
    candidateData.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }

  const maxVotes = Math.max(...candidateData.map(c => c.votes), 10); // Minimum 10 to prevent empty bars looking weird
  const highestVotes = Math.max(...candidateData.map(c => c.votes), 0);
  const winners = candidateData.filter(c => c.votes === highestVotes && highestVotes > 0).map(c => c.id);

  const handleNext = () => {
    setActivePositionIndex(prev => (prev + 1) % positions.length);
  };
  
  const handlePrev = () => {
    setActivePositionIndex(prev => (prev === 0 ? positions.length - 1 : prev - 1));
  };

  return (
    <div className="min-h-screen w-full bg-[#e6eaf0] font-sans text-[#2d3748] p-8 flex flex-col selection:bg-transparent">
      
      {/* Header */}
      <header className="mb-6 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#718096] uppercase mb-2">
            Ayadi Glocal School • Student Council Election {new Date().getFullYear()}
          </p>
          <h1 className="text-3xl font-extrabold text-[#1a202c]">
            {activePosition?.name || 'Loading...'}
          </h1>
        </div>
        
        <div className="flex gap-4">
          <button onClick={handlePrev} className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#e6eaf0] ${shadowRaised} text-[#4a5568] hover:text-[#2d3748] transition-all active:shadow-[inset_4px_4px_8px_#c8ccd3,inset_-4px_-4px_8px_#ffffff]`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleNext} className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#e6eaf0] ${shadowRaised} text-[#4a5568] hover:text-[#2d3748] transition-all active:shadow-[inset_4px_4px_8px_#c8ccd3,inset_-4px_-4px_8px_#ffffff]`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide mb-2 pl-1">
        {positions.map((pos, idx) => {
          const isActive = idx === activePositionIndex;
          return (
            <button 
              key={pos.id}
              onClick={() => setActivePositionIndex(idx)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-bold tracking-wider whitespace-nowrap transition-all uppercase ${
                isActive 
                  ? `bg-[#e6eaf0] ${shadowRaised} text-[#1a202c] border-2 border-slate-700/10` 
                  : `bg-transparent text-[#718096] hover:text-[#4a5568]`
              }`}
            >
              {pos.name}
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <main className={`flex-1 w-full bg-[#e6eaf0] rounded-[40px] ${shadowRaised} p-12 flex flex-col relative overflow-hidden`}>
        
        {/* Candidates Grid */}
        <div className="flex-1 flex items-end justify-center gap-12 lg:gap-16 xl:gap-20 relative z-10 pt-16">
          
          {candidateData.map((cand) => {
            const isWinner = winners.includes(cand.id);
            const heightPercent = maxVotes > 0 ? (cand.votes / maxVotes) * 100 : 0;
            
            return (
              <div key={cand.id} className="flex flex-col items-center w-[120px] relative">
                
                {/* Winner Badge */}
                {isWinner && (
                  <div className={`absolute -top-16 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-full ${shadowRaisedSm} flex items-center gap-1.5 z-20 whitespace-nowrap text-[10px] font-black text-emerald-600 tracking-wider`}>
                    WINNER <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  </div>
                )}

                {/* Photo */}
                <div className={`w-[90px] h-[90px] rounded-[24px] bg-[#e6eaf0] ${shadowRaised} mb-6 p-1.5 relative z-10`}>
                  <div className={`w-full h-full rounded-[18px] overflow-hidden bg-white/40 ${shadowRecessed} border-2 border-dashed border-slate-300 flex items-center justify-center`}>
                    {cand.photoUrl ? (
                      <img src={cand.photoUrl} alt={cand.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[9px] text-slate-400 font-medium text-center leading-tight">
                        <div className="mb-1 opacity-50">🖼️</div>
                        Photo<br/>or browse files
                      </div>
                    )}
                  </div>
                  {isWinner && <div className="absolute inset-0 border-2 border-emerald-400 rounded-[24px] z-20 pointer-events-none"></div>}
                </div>

                {/* Vote Count */}
                <div className="text-3xl font-black text-[#2d3748] mb-4 tracking-tighter">
                  {cand.votes}
                </div>

                {/* Progress Bar */}
                <div className={`w-14 h-56 rounded-full bg-[#e6eaf0] ${shadowRecessed} p-1.5 mb-8 flex items-end relative overflow-hidden`}>
                  {/* Fill */}
                  <div 
                    className={`w-full rounded-full ${barColors[cand.colorIndex]} shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-1000 ease-out`}
                    style={{ height: `${Math.max(heightPercent, 12)}%` }} // Minimum height
                  ></div>
                </div>

                {/* Name */}
                <h3 className="text-[11px] font-bold text-[#1a202c] text-center mb-2 leading-tight min-h-[2.5rem] flex items-center justify-center px-1">
                  {cand.name}
                </h3>
                
                {/* Grade Badge */}
                <div className={`px-2.5 py-1 rounded-full bg-[#e6eaf0] ${shadowRaisedSm} text-[9px] font-bold text-[#a0aec0] mb-5`}>
                  {cand.grade}
                </div>

                {/* Symbol */}
                <div className={`w-9 h-9 rounded-full bg-[#e6eaf0] ${shadowRaisedSm} flex items-center justify-center p-1.5`}>
                  {cand.symbolUrl ? (
                    <img src={cand.symbolUrl} alt="Symbol" className="w-full h-full object-contain mix-blend-multiply" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-200"></div>
                  )}
                </div>

              </div>
            );
          })}

        </div>

        {/* Footer Labels */}
        <div className="absolute bottom-6 left-12 right-12 flex justify-between items-center text-[9px] font-bold text-[#a0aec0] tracking-widest uppercase">
          <span>Number of Votes</span>
          <span>Candidates & Symbols • Use ← → to switch category</span>
        </div>

      </main>

    </div>
  );
}
