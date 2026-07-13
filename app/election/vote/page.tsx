'use client';

import { useState } from 'react';
import { validateCode, getBallot, submitBallot } from './actions';
import { CheckCircle2, Lock, Vote, AlertCircle, Loader2 } from 'lucide-react';

export default function StudentVotingBooth() {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  
  const [session, setSession] = useState<any>(null);
  const [ballot, setBallot] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({}); // positionId -> candidateId
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Code must be exactly 6 characters.');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    try {
      const res = await validateCode(code.toUpperCase());
      if (!res.success) {
        setError(res.error || 'Invalid code.');
      } else {
        setSession(res);
        const ballotData = await getBallot(res.electionId, res.divisionId);
        setBallot(ballotData);
      }
    } catch (err) {
      setError('A system error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelect = (positionId: string, candidateId: string) => {
    setSelections(prev => ({ ...prev, [positionId]: candidateId }));
  };

  const isComplete = ballot.length > 0 && ballot.every(pos => selections[pos.id]);

  const handleSubmit = async () => {
    if (!isComplete) return;
    setIsSubmitting(true);
    setError('');

    try {
      const votes = Object.entries(selections).map(([posId, candId]) => ({
        position_id: posId,
        candidate_id: candId
      }));

      const res = await submitBallot(session.electionId, session.secretCodeId, session.sessionId, votes);
      if (res.success) {
        setIsDone(true);
      } else {
        setError(res.error || 'Failed to submit ballot. Please seek assistance.');
      }
    } catch (err) {
      setError('An error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Vote Recorded</h1>
            <p className="text-slate-400">Your ballot has been securely and anonymously cast. You may now close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-white flex items-center justify-center gap-3 mb-2">
            <Vote className="text-blue-500 w-10 h-10" />
            AGS Voting Booth
          </h1>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-sm">Secure • Anonymous • Verified</p>
        </div>

        <form onSubmit={handleVerify} className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl max-w-sm w-full space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" /> Enter Secret Code
            </label>
            <input 
              type="text" 
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
              placeholder="e.g. A9B2X4"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-4 text-center text-3xl font-black tracking-widest text-white uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isVerifying || code.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : 'Enter Booth'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-900">Official Ballot</h1>
          <p className="text-slate-500">Please select exactly one candidate for each position.</p>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {ballot.map((pos) => {
            const isSelected = selections[pos.id] !== undefined;
            return (
              <div key={pos.id} className={`bg-white rounded-3xl border-2 transition-colors ${isSelected ? 'border-emerald-200 shadow-sm' : 'border-slate-200 shadow-md'}`}>
                <div className={`px-6 py-4 border-b transition-colors flex justify-between items-center ${isSelected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h2 className="text-xl font-bold text-slate-800">{pos.name}</h2>
                  {isSelected && <CheckCircle2 className="text-emerald-500 w-6 h-6" />}
                </div>
                <div className="p-6">
                  {pos.election_candidates.length === 0 ? (
                    <p className="text-slate-400 italic">No candidates nominated.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {pos.election_candidates
                        .sort((a: any, b: any) => a.id.localeCompare(b.id))
                        .map((c: any, index: number) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelect(pos.id, c.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                            selections[pos.id] === c.id 
                              ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.01]' 
                              : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-5xl drop-shadow-sm flex items-center justify-center shrink-0 w-16 h-16">
                              {c.symbol_url ? (
                                <img src={c.symbol_url} alt="symbol" className="w-full h-full object-contain" />
                              ) : (
                                <span>
                                  {['🍎', '⚽', '🌟', '🎸', '🚗', '🎈', '🍕', '🚀', '🎨', '🐶', '📚', '🌻', '🦁', '🚁', '🍔', '🐼'][index % 16]}
                                </span>
                              )}
                            </span>
                            <div className="flex flex-col gap-1">
                              <span className={`font-bold text-lg leading-tight transition-colors ${selections[pos.id] === c.id ? 'text-blue-900' : 'text-slate-800'}`}>
                                {c.students?.full_name}
                              </span>
                              {c.students?.classes?.title && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-max uppercase tracking-wider transition-colors ${selections[pos.id] === c.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {c.students.classes.title.split(' ').slice(0, 2).join(' ')}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none ${selections[pos.id] === c.id ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${selections[pos.id] === c.id ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-slate-50/80 backdrop-blur-xl border-t border-slate-200 p-4 -mx-4 sm:mx-0 sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold py-5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSubmitting ? <><Loader2 className="w-6 h-6 animate-spin" /> Submitting...</> : 'Submit your Vote'}
          </button>
          {!isComplete && (
            <p className="text-center text-slate-500 text-sm mt-3 font-medium">You must select a candidate for all positions before submitting.</p>
          )}
        </div>

      </div>
    </div>
  );
}
