'use client';

import { useState, useEffect } from 'react';
import { getElections, getPositions, getLiveTallies, getTurnoutStats } from '../actions';
import { createClient } from '@supabase/supabase-js';
import { Trophy, AlertTriangle, Activity, Users, ArrowUpRight } from 'lucide-react';

// Client-side supabase for realtime. Needs public anon key in a real app.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
);

export default function LiveResultsDashboard() {
  const [elections, setElections] = useState<any[]>([]);
  const [activeElec, setActiveElec] = useState<any>(null);
  
  const [positions, setPositions] = useState<any[]>([]);
  const [tallies, setTallies] = useState<Record<string, any[]>>({});
  const [turnout, setTurnout] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function init() {
      const elecData = await getElections();
      setElections(elecData);
      if (elecData.length > 0) setActiveElec(elecData[0]);
      setIsLoading(false);
    }
    init();
  }, []);

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
            loadDashboardData(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'election_voting_sessions', filter: `election_id=eq.${activeElec.id}` },
          (payload) => {
            console.log('Session updated!', payload);
            loadDashboardData(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeElec]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setIsUpdating(true);
    try {
      const posData = await getPositions(activeElec.id);
      setPositions(posData);
      
      const [newTallies, newTurnout] = await Promise.all([
        getLiveTallies(activeElec.id, posData.map((p: any) => p.id)),
        getTurnoutStats(activeElec.id)
      ]);
      
      setTallies(newTallies);
      setTurnout(newTurnout);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Live Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Activity className="text-emerald-400" />
              Live Election Results
            </h1>
            <p className="text-slate-400 mt-1">Real-time vote tallies and turnout statistics.</p>
          </div>
          
          <div className="flex items-center gap-4">
            {isUpdating && <span className="text-xs text-emerald-400 animate-pulse font-bold">● LIVE UPDATING</span>}
            <select 
              value={activeElec?.id || ''} 
              onChange={e => setActiveElec(elections.find(el => el.id === e.target.value))}
              className="p-2 border rounded-md bg-slate-700 border-slate-600 text-white"
            >
              {elections.map(e => <option key={e.id} value={e.id}>{e.name} ({e.status})</option>)}
            </select>
          </div>
        </header>

        {activeElec && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold border-b border-slate-700 pb-2"><Trophy className="inline mb-1 mr-2 text-yellow-400"/> Position Results</h2>
              
              {positions.map(pos => {
                const posTallies = tallies[pos.id] || [];
                const totalVotes = posTallies.reduce((sum: number, t: any) => sum + Number(t.vote_count), 0);
                
                // Map candidates with their tallies
                const candidates = pos.election_candidates.map((c: any) => {
                  const tallyObj = posTallies.find((t: any) => t.candidate_id === c.id);
                  const votes = tallyObj ? Number(tallyObj.vote_count) : 0;
                  return {
                    id: c.id,
                    name: c.students.full_name,
                    votes
                  };
                });

                // Sort by votes DESC
                candidates.sort((a: any, b: any) => b.votes - a.votes);

                // Competition ranking and tie breaks
                let currentRank = 1;
                for (let i = 0; i < candidates.length; i++) {
                  if (i > 0 && candidates[i].votes < candidates[i-1].votes) {
                    currentRank = i + 1;
                  }
                  candidates[i].rank = currentRank;
                  candidates[i].isTie = (i > 0 && candidates[i].votes === candidates[i-1].votes) || 
                                        (i < candidates.length - 1 && candidates[i].votes === candidates[i+1].votes);
                  
                  // Calculate lag (gap to adjacent)
                  if (i > 0) {
                    candidates[i].lag = candidates[i-1].votes - candidates[i].votes;
                  }
                  
                  // Percentage
                  candidates[i].percentage = totalVotes > 0 ? ((candidates[i].votes / totalVotes) * 100).toFixed(1) : '0.0';
                }

                // Check for tie at Rank 1
                const rank1Candidates = candidates.filter((c: any) => c.rank === 1);
                const hasFirstPlaceTie = rank1Candidates.length > 1;

                return (
                  <div key={pos.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
                    <div className="bg-slate-700/50 px-6 py-4 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">{pos.name}</h3>
                      <span className="text-sm font-medium text-slate-300 bg-slate-700 px-3 py-1 rounded-full">{totalVotes} Total Votes</span>
                    </div>

                    {hasFirstPlaceTie && totalVotes > 0 && (
                      <div className="bg-red-900/30 border-y border-red-500/50 p-3 flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5" />
                        TIE DETECTED AT RANK 1 - MANUAL REVIEW REQUIRED
                      </div>
                    )}

                    <div className="p-6 space-y-4">
                      {candidates.length === 0 ? (
                        <p className="text-slate-500 text-center">No candidates nominated.</p>
                      ) : candidates.map((c: any, index: number) => (
                        <div key={c.id} className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border ${c.rank === 1 && c.votes > 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                          
                          <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${c.rank === 1 && c.votes > 0 ? 'bg-yellow-500 text-yellow-950' : 'bg-slate-700 text-slate-300'}`}>
                              #{c.rank}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">{c.name}</h4>
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                {c.isTie && <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">Tied</span>}
                                {index > 0 && c.lag > 0 && (
                                  <span className="text-red-400 flex items-center">
                                    <ArrowUpRight className="w-3 h-3 rotate-180 mr-1" /> {c.lag} behind rank {candidates[index-1].rank}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right mt-4 sm:mt-0 w-full sm:w-auto flex justify-between sm:block">
                            <div className="text-2xl font-black text-white">{c.votes} <span className="text-sm font-normal text-slate-400">votes</span></div>
                            <div className="text-sm font-bold text-emerald-400">{c.percentage}%</div>
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-slate-700 pb-2"><Users className="inline mb-1 mr-2 text-blue-400"/> Division Turnout</h2>
              
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-6 shadow-lg">
                {turnout.length === 0 ? (
                  <p className="text-slate-500 text-center">No voting sessions found.</p>
                ) : turnout.sort((a,b) => (b.voted/b.total) - (a.voted/a.total)).map((t: any) => {
                  const percent = t.total > 0 ? (t.voted / t.total) * 100 : 0;
                  return (
                    <div key={t.className} className="space-y-2">
                      <div className="flex justify-between items-end text-sm">
                        <span className="font-bold text-slate-200">{t.className}</span>
                        <div>
                          <span className="text-white font-bold">{t.voted}</span>
                          <span className="text-slate-500 mx-1">/</span>
                          <span className="text-slate-400">{t.total}</span>
                          <span className="ml-2 font-black text-blue-400">({percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700">
                        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                      <div className="flex gap-4 text-xs font-medium mt-1">
                        <span className="text-emerald-400">{t.voted} Done</span>
                        {t.voting > 0 && <span className="text-yellow-400">{t.voting} Voting...</span>}
                        <span className="text-slate-500">{t.total - t.voted - t.voting} Not Started</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
