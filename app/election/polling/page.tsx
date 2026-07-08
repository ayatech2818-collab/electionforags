'use client';

import { useState, useEffect } from 'react';
import { getOfficerElections, getOfficerDivisions, getPollingRoster } from './actions';
import { createClient } from '@supabase/supabase-js';
import { Search, Eye, Filter, CheckCircle2, Clock, XCircle, BarChart2 } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
);

export default function PollingOfficerDashboard() {
  // In reality, from auth
  const mockMentorId = '00000000-0000-0000-0000-000000000002';
  
  const [elections, setElections] = useState<any[]>([]);
  const [activeElec, setActiveElec] = useState<any>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [activeGrade, setActiveGrade] = useState<string>('');
  const [activeDiv, setActiveDiv] = useState<string>('');
  
  const [roster, setRoster] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    async function init() {
      const elecData = await getOfficerElections(mockMentorId);
      setElections(elecData);
      if (elecData.length > 0) setActiveElec(elecData[0]);
    }
    init();
  }, []);

  useEffect(() => {
    if (activeElec) {
      getOfficerDivisions(mockMentorId, activeElec.id).then(divs => {
        setDivisions(divs);
        if (divs.length > 0) {
          const initialGrade = divs[0].title.split(' ')[1];
          setActiveGrade(initialGrade);
        }
      });
    }
  }, [activeElec]);

  useEffect(() => {
    if (activeGrade && divisions.length > 0) {
      const divs = divisions.filter(d => d.title.split(' ')[1] === activeGrade);
      if (divs.length > 0 && !divs.find(d => d.id === activeDiv)) {
        setActiveDiv(divs[0].id);
      }
    }
  }, [activeGrade, divisions]);

  useEffect(() => {
    if (activeElec && activeDiv) {
      loadRoster();

      const channel = supabase.channel(`polling_updates_${activeDiv}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'election_voting_sessions', filter: `division_id=eq.${activeDiv}` },
          () => {
            loadRoster(true);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeElec, activeDiv]);

  const loadRoster = async (silent = false) => {
    const data = await getPollingRoster(activeDiv, activeElec.id);
    setRoster(data);
  };

  const filteredRoster = roster.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          s.roll_no.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: roster.length,
    not_issued: roster.filter(r => r.status === 'not_issued').length,
    not_done: roster.filter(r => r.status === 'not_done').length,
    doing: roster.filter(r => r.status === 'doing').length,
    done: roster.filter(r => r.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="text-blue-600" />
              Polling Station Officer
            </h1>
            <p className="text-slate-500 text-sm mt-1">Monitor live turnout for your assigned divisions.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select 
              value={activeElec?.id || ''} 
              onChange={e => setActiveElec(elections.find(el => el.id === e.target.value))}
              className="p-2 border rounded-md text-sm"
            >
              <option value="" disabled>Select Election</option>
              {elections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select 
              value={activeGrade}
              onChange={e => setActiveGrade(e.target.value)}
              className="p-2 border rounded-md text-sm bg-white"
            >
              <option value="" disabled>Select Grade</option>
              {Array.from(new Set(divisions.map(d => d.title.split(' ')[1]).filter(Boolean))).sort().map(g => (
                <option key={g} value={g as string}>Grade {g as string}</option>
              ))}
            </select>

            <select 
              value={activeDiv} 
              onChange={e => setActiveDiv(e.target.value)}
              className="p-2 border rounded-md text-sm bg-white"
            >
              <option value="" disabled>Select Division</option>
              {divisions.filter(d => d.title.split(' ')[1] === activeGrade).map(d => (
                <option key={d.id} value={d.id}>Div {d.title.split(' ')[2] || ''}</option>
              ))}
            </select>
            
            {activeElec?.status === 'published' && (
              <Link href="/election/admin/results" className="inline-flex justify-center items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-700 text-sm">
                <BarChart2 className="w-4 h-4" /> View Final Results
              </Link>
            )}
          </div>
        </header>

        {!activeElec || !activeDiv ? (
           <div className="text-center p-12 bg-white rounded-2xl border text-slate-500 shadow-sm">
             Select an election and division to monitor polling.
           </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            
            {/* Stats Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Turnout Summary</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Total Eligible</span>
                      <span className="font-bold text-slate-800">{stats.total}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Voted (Done)</span>
                      <span className="font-bold text-slate-800">{stats.done}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-emerald-500 h-2 rounded-full" style={{width: `${stats.total > 0 ? (stats.done/stats.total)*100 : 0}%`}}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-yellow-600 font-medium flex items-center gap-1"><Clock className="w-4 h-4"/> Voting (Doing)</span>
                      <span className="font-bold text-slate-800">{stats.doing}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500 font-medium flex items-center gap-1"><XCircle className="w-4 h-4"/> Not Voted</span>
                      <span className="font-bold text-slate-800">{stats.not_done}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Roster List */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 bg-slate-50">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    placeholder="Search by name or roll number..." 
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select 
                    className="border p-2 rounded-lg text-sm bg-white outline-none"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="done">Voted (Done)</option>
                    <option value="doing">Voting Now (Doing)</option>
                    <option value="not_done">Not Voted</option>
                    <option value="not_issued">No Code Issued</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                    <tr>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Roll No</th>
                      <th className="px-6 py-3">Voting Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoster.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{s.full_name}</td>
                        <td className="px-6 py-4 text-slate-500">{s.roll_no}</td>
                        <td className="px-6 py-4">
                          {s.status === 'done' && <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full text-xs font-semibold"><CheckCircle2 className="w-3 h-3"/> Voted</span>}
                          {s.status === 'doing' && <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full text-xs font-semibold"><Clock className="w-3 h-3 animate-pulse"/> Voting...</span>}
                          {s.status === 'not_done' && <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full text-xs font-semibold"><XCircle className="w-3 h-3"/> Not Started</span>}
                          {s.status === 'not_issued' && <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full text-xs font-semibold">No Code</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredRoster.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No students match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
