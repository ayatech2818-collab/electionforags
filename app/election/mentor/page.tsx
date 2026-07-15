'use client';

import { useState, useEffect, useRef } from 'react';
import { getActiveElections, getMentorDivisions, getDivisionRoster, invalidateCode, generateSingleCodeForWhatsapp } from './actions';
import { Download, Users, AlertTriangle, RefreshCw, CheckCircle, MessageCircle, ShieldCheck, Fingerprint, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
);

export default function MentorPortal() {
  const [elections, setElections] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  
  const [activeElection, setActiveElection] = useState<string>('');
  const [activeGrade, setActiveGrade] = useState<string>('');
  const [activeDivision, setActiveDivision] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Hidden card generation state
  const cardRef = useRef<HTMLDivElement>(null);
  const [generatingCard, setGeneratingCard] = useState<any | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [elecData, divData] = await Promise.all([
          getActiveElections(),
          getMentorDivisions() // Server action checks auth session securely
        ]);
        
        if ((divData as any)?.error === 'Not authenticated') {
          window.location.href = '/login';
          return;
        }

        setElections(elecData);
        setDivisions(divData as any[]);
        if (elecData.length > 0) setActiveElection(elecData[0].id);
        if ((divData as any[]).length > 0) {
          const initialGrade = (divData as any[])[0].title.split(' ')[1];
          setActiveGrade(initialGrade);
        }
      } catch (err: any) {
        if (err.message === 'Not authenticated' || err.message.includes('authenticated') || err.message.includes('digest')) {
          window.location.href = '/login';
        } else {
          setErrorMsg(err.message || 'Unknown error occurred while loading data.');
        }
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (activeGrade && divisions.length > 0) {
      const divs = divisions.filter(d => d.title.split(' ')[1] === activeGrade);
      if (divs.length > 0 && !divs.find(d => d.id === activeDivision)) {
        setActiveDivision(divs[0].id);
      }
    }
  }, [activeGrade, divisions]);

  useEffect(() => {
    const channel = supabase.channel('elections-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'elections' }, (payload) => {
        setElections(prev => prev.map(e => e.id === payload.new.id ? { ...e, allow_mentor_reset: payload.new.allow_mentor_reset, allow_mentor_generate_all: payload.new.allow_mentor_generate_all } : e));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeElection && activeDivision) {
      loadRoster(activeElection, activeDivision);
    }
  }, [activeElection, activeDivision]);

  // Auto-generate PNG and copy to clipboard when triggered
  useEffect(() => {
    if (!generatingCard || !cardRef.current) return;
    
    const generateAndSend = async () => {
      try {
        const node = cardRef.current;
        if (!node) return;
        // Wait briefly for DOM to fully paint the hidden card
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(node, {
          backgroundColor: '#ffffff',
          pixelRatio: 2 // High resolution
        });
        
        if (!blob) throw new Error('Failed to generate image');
        
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          
          // Open WA directly without blocking alert
          window.open(generatingCard.url, '_blank');
        } catch (clipErr) {
          console.error('Clipboard error:', clipErr);
          toast.error('Failed to automatically copy image to clipboard. Please check your browser permissions.');
        } finally {
          setGeneratingCard(null); // Clean up
          loadRoster(activeElection, activeDivision);
        }
      } catch (err) {
        console.error('Image generation error:', err);
        setGeneratingCard(null);
      }
    };
    
    generateAndSend();
  }, [generatingCard]);

  const loadRoster = async (elecId: string, divId: string) => {
    const data = await getDivisionRoster(divId, elecId);
    setRoster(data);
  };

  const handleDownload = () => {
    // Navigates to the API route which generates the PDF
    window.open(`/api/election/generate-ids?electionId=${activeElection}&divisionId=${activeDivision}`, '_blank');
    // Refresh roster after a delay to reflect newly issued codes
    setTimeout(() => loadRoster(activeElection, activeDivision), 3000);
  };

  const handleRegenerate = async (studentId: string, studentName: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-sm">WARNING: This will invalidate the existing code for {studentName}. Are you sure you want to proceed?</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium" onClick={async () => {
            toast.dismiss(t.id);
            try {
              const res = await invalidateCode(studentId, activeElection);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success('Code invalidated. Click "Download ID Cards" to generate a new code and PDF.');
              loadRoster(activeElection, activeDivision);
            } catch (err: any) {
              toast.error(err.message || 'Failed to invalidate code.');
            }
          }}>Invalidate</button>
          <button className="px-3 py-1 bg-slate-200 text-slate-800 rounded text-sm font-medium" onClick={() => toast.dismiss(t.id)}>Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeWhatsappGeneration = async (student: any) => {
    try {
      const res = await generateSingleCodeForWhatsapp(student.id, activeElection);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      
      const plaintextCode = res.plaintextCode;
      
      let formattedPhone = student.phone.replace(/[^0-9]/g, '');
      if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
      else if (formattedPhone.length < 10) formattedPhone = '91' + formattedPhone;
      else if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) formattedPhone = '91' + formattedPhone.substring(1);
      
      const message = `Hi ${student.full_name},\n\nYour secret voter code for the AGS Elections is:\n*${plaintextCode}*\n\nYou can cast your vote here:\nhttps://agselection.vercel.app/election/vote\n\nKeep this code strictly confidential. Do not share it with anyone.`;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp directly
      window.open(url, '_blank');
      
      // Refresh to show status changed to 'Issued'
      loadRoster(activeElection, activeDivision);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate code.');
    }
  };

  const handleSendWhatsapp = async (student: any) => {
    if (student.hasCode && !student.isPlaintext) {
      toast((t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm">WARNING: {student.full_name} already has a code. You cannot send an existing code for security reasons. You must REGENERATE their code to send it via WhatsApp. Do you want to invalidate their old code and send a new one now?</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium" onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await invalidateCode(student.id, activeElection);
                if (res?.error) {
                  toast.error(res.error);
                  return;
                }
                await executeWhatsappGeneration(student);
              } catch (e: any) { toast.error(e.message || 'Failed to invalidate code.'); }
            }}>Invalidate & Send</button>
            <button className="px-3 py-1 bg-slate-200 text-slate-800 rounded text-sm font-medium" onClick={() => toast.dismiss(t.id)}>Cancel</button>
          </div>
        </div>
      ), { duration: Infinity });
      return;
    }
    
    await executeWhatsappGeneration(student);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500">Loading Portal...</div>;
  if (errorMsg) return <div className="p-10 text-center text-red-500 font-bold">Error: {errorMsg}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-purple-600" />
              Mother Mentor Portal
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage and download voter ID cards for your class.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-4 md:mt-0 w-full md:w-auto">
            <select 
              value={activeElection}
              onChange={e => setActiveElection(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="" disabled>Select Election</option>
              {elections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            
            <select 
              value={activeGrade}
              onChange={e => setActiveGrade(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="" disabled>Select Grade</option>
              {Array.from(new Set(divisions.map(d => d.title.split(' ')[1]).filter(Boolean))).sort().map(g => (
                <option key={g} value={g as string}>Grade {g as string}</option>
              ))}
            </select>

            <select 
              value={activeDivision}
              onChange={e => setActiveDivision(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="" disabled>Select Division</option>
              {divisions.filter(d => d.title.split(' ')[1] === activeGrade).map(d => (
                <option key={d.id} value={d.id}>Div {d.title.split(' ')[2] || ''}</option>
              ))}
            </select>
          </div>
        </header>

        {divisions.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500">
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No Classes Assigned</h2>
            <p>Your mentor account does not have any classes assigned to it. Please contact the administrator.</p>
          </div>
        ) : (!activeElection || !activeDivision) ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500">
            Please select an election and division to manage.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-800">Class Roster & Code Status</h2>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Generate & Download IDs
              </button>
            </div>
            
            <div className="bg-amber-50 p-4 border-b border-amber-100 flex gap-3 text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>For security, <strong>plaintext codes are never saved</strong>. Clicking download will only generate PDFs for students who <em>do not</em> currently have a code. If a student loses their card, you must click <strong>Regenerate</strong> below to invalidate the old one before downloading a new PDF.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Roll No</th>
                    <th className="px-6 py-4">Code Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map(student => {
                    const currentElec = elections.find(e => e.id === activeElection);
                    const effectiveHasCode = currentElec?.allow_mentor_generate_all ? false : (student.hasCode && !student.isPlaintext);
                    
                    return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{student.roll_no}</td>
                      <td className="px-6 py-4">
                        {student.hasCode ? (
                          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Issued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Not Issued
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!effectiveHasCode && (
                            student.phone ? (
                              <button 
                                onClick={() => handleSendWhatsapp(student)}
                                className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 sm:px-3 py-1.5 rounded-lg transition-colors text-xs font-medium border border-transparent hover:border-emerald-200"
                              >
                                <MessageCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> 
                                <span className="hidden sm:inline">
                                  {student.hasCode ? 'Re-send WhatsApp' : 'Generate & Send'}
                                </span>
                                <span className="sm:hidden">Send</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic px-2">No Phone #</span>
                            )
                          )}
                          
                          {student.hasCode && elections.find(e => e.id === activeElection)?.allow_mentor_reset && (
                            <button 
                              onClick={() => handleRegenerate(student.id, student.full_name)}
                              className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
                            >
                              <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Reset</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Card Template for Image Generation */}
      {generatingCard && (
        <div 
          className="fixed" 
          style={{ top: '-9999px', left: '-9999px' }}
        >
          <div 
            ref={cardRef} 
            className="w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl font-sans relative border-4 border-slate-100"
            style={{ padding: '0' }} // ensure no parent padding messes up canvas
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-center text-white relative">
              <ShieldCheck className="absolute -right-4 -top-4 w-32 h-32 opacity-10" />
              <h2 className="text-xs font-bold tracking-widest uppercase mb-1 opacity-90">Ayadi Glocal School</h2>
              <h1 className="text-xl font-bold">{generatingCard.electionName}</h1>
              <p className="text-sm font-medium opacity-80 mt-1">Official Voter Pass</p>
            </div>

            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Elector Name</p>
                  <p className="text-lg font-bold text-slate-900">{generatingCard.student.full_name}</p>
                  
                  <div className="flex gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Roll No</p>
                      <p className="text-sm font-semibold text-slate-700">{generatingCard.student.roll_no}</p>
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-200 shadow-inner">
                  <User className="w-8 h-8" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center relative overflow-hidden">
                <Fingerprint className="absolute -left-4 -bottom-4 w-24 h-24 text-purple-100 opacity-50" />
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 relative z-10">Your Secret Code</p>
                <div className="font-mono text-4xl font-extrabold tracking-widest text-slate-900 relative z-10">
                  {generatingCard.code}
                </div>
                <p className="text-xs text-purple-600 font-semibold mt-3 relative z-10">Do not share this code with anyone.</p>
              </div>

              <div className="mt-8 flex gap-2 justify-center text-xs font-medium text-slate-400">
                <span>Issued by Mother Mentor</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
