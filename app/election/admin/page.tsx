'use client';

import { useState, useEffect } from 'react';
import { getElections, createElection, updateElectionStatus, getPositions, createPosition, searchStudents, addCandidate, getClasses, updateCandidateSymbol, getStudentsByDivision, removeCandidate, updateCandidatePhoto, removePosition, unlockDivisionVoting } from './actions';
import { Plus, Trash2, Shield, Calendar, MapPin, Users, User, Settings, PlayCircle, BarChart3, ChevronRight, Activity, Save, LayoutList, CheckCircle, Target, ShieldCheck, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ElectionController() {
  const [elections, setElections] = useState<any[]>([]);
  const [activeElec, setActiveElec] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockClassId, setUnlockClassId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeElec) loadDetails(activeElec.id);
  }, [activeElec]);

  const loadData = async () => {
    try {
      const [elecData, classData] = await Promise.all([getElections(), getClasses()]);
      setElections(elecData);
      setClasses(classData);
      if (elecData.length > 0) setActiveElec(elecData[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    try {
      const posData = await getPositions(id);
      setPositions(posData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateElec = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (e.target as any).name.value;
    const date = (e.target as any).date.value;
    const newElec = await createElection(name, date);
    setElections([newElec, ...elections]);
    setActiveElec(newElec);
  };

  const handleStatusUpdate = async (status: string) => {
    if (status === 'published') {
      toast((t) => (
        <div className="flex flex-col gap-4 w-[320px]">
          <div className="flex items-start gap-4">
            <div className="bg-purple-50 p-2.5 rounded-full shrink-0">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 pr-2">
              <p className="font-bold text-slate-900 text-base">Publish Results</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Are you sure you want to publish results? This cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition-colors" onClick={() => toast.dismiss(t.id)}>Cancel</button>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors" onClick={async () => {
              toast.dismiss(t.id);
              await updateElectionStatus(activeElec.id, status);
              setActiveElec({ ...activeElec, status });
              setElections(elections.map(e => e.id === activeElec.id ? { ...e, status } : e));
              toast.success('Election results published!');
            }}>Publish</button>
            <button className="px-3 py-1 bg-slate-200 text-slate-800 rounded text-sm font-medium" onClick={() => toast.dismiss(t.id)}>Cancel</button>
          </div>
        </div>
      ), { duration: Infinity });
      return;
    }
    
    await updateElectionStatus(activeElec.id, status);
    setActiveElec({ ...activeElec, status });
    setElections(elections.map(e => e.id === activeElec.id ? { ...e, status } : e));
    toast.success(`Election status changed to ${status}`);
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (e.target as any).name.value;
    // Simplification for demo: passing null for scopes implies all grades/divisions
    const newPos = await createPosition(activeElec.id, name, null, null);
    setPositions([...positions, { ...newPos, election_candidates: [] }]);
    (e.target as any).reset();
  };

  // State for adding candidate UI (Dropdowns)
  const [activePosIdForSearch, setActivePosIdForSearch] = useState('');
  const [activeNominationGrade, setActiveNominationGrade] = useState<string>('');
  const [activeNominationDivision, setActiveNominationDivision] = useState<string>('');
  const [activeNominationStudent, setActiveNominationStudent] = useState<string>('');
  const [nominationStudents, setNominationStudents] = useState<any[]>([]);

  const handleSelectCandidate = async (studentId: string, posId: string) => {
    await addCandidate(posId, studentId);
    setActiveNominationStudent('');
    toast.success('Candidate added!');
    loadDetails(activeElec.id);
  };

  const handleRemoveCandidate = (candidateId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 w-[320px]">
        <div className="flex items-start gap-4">
          <div className="bg-red-50 p-2.5 rounded-full shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 pr-2">
            <p className="font-bold text-slate-900 text-base">Remove Candidate</p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Are you sure you want to remove them from this position?</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
          <button 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition-colors" 
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await removeCandidate(candidateId);
                toast.success('Candidate removed');
                loadDetails(activeElec.id);
              } catch (err: any) {
                toast.error('Failed to remove candidate: ' + err.message);
              }
            }}
          >
            Yes, Remove
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleRemovePosition = (positionId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 w-[320px]">
        <div className="flex items-start gap-4">
          <div className="bg-red-50 p-2.5 rounded-full shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 pr-2">
            <p className="font-bold text-slate-900 text-base">Delete Position</p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Are you sure? All candidates under it will also be removed.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
          <button 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition-colors" 
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await removePosition(positionId);
                toast.success('Position deleted');
                loadDetails(activeElec.id);
              } catch (err: any) {
                toast.error('Failed to delete position: ' + err.message);
              }
            }}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleUploadSymbol = async (candidateId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG/JPG)');
      return;
    }

    const toastId = toast.loading('Uploading symbol...');
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));
      
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 128;
      
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      await updateCandidateSymbol(candidateId, base64);
      await loadDetails(activeElec.id);
      toast.success('Symbol updated!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update symbol: ' + err.message, { id: toastId });
    }
  };

  const handleUploadPhoto = async (candidateId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG/JPG)');
      return;
    }

    const toastId = toast.loading('Uploading photo...');
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));
      
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 128;
      
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      await updateCandidatePhoto(candidateId, base64);
      await loadDetails(activeElec.id);
      toast.success('Photo updated!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update photo: ' + err.message, { id: toastId });
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Configurator...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Election Controller Configuration</h1>
            <p className="text-slate-500">Configure elections, positions, and candidates.</p>
          </div>
          <select 
            value={activeElec?.id || ''} 
            onChange={e => setActiveElec(elections.find(el => el.id === e.target.value))}
            className="p-2 border rounded-md"
          >
            {elections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </header>

        {!activeElec && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Create First Election</h2>
            <form onSubmit={handleCreateElec} className="flex gap-4">
              <input name="name" placeholder="Election Name" className="border p-2 rounded flex-1 text-slate-900 placeholder:text-slate-500 bg-white" required />
              <input name="date" type="date" className="border p-2 rounded text-slate-900 bg-white" required />
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded">Create</button>
            </form>
          </div>
        )}

        {activeElec && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><Target className="text-blue-500"/> Positions & Candidates</h2>
                <form onSubmit={handleAddPosition} className="flex gap-4 mb-6">
                  <input name="name" placeholder="New Position (e.g. Head Girl)" className="border p-2 rounded flex-1 text-slate-900 placeholder:text-slate-500 bg-white" required />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Position</button>
                </form>

                <div className="space-y-4">
                  {positions.map(pos => (
                    <div key={pos.id} className="border border-slate-100 bg-slate-50 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-lg text-slate-800">{pos.name}</h3>
                        <button 
                          onClick={() => handleRemovePosition(pos.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Delete Position"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-slate-400 uppercase font-bold mb-2">Contesting Candidates</p>
                          {pos.election_candidates?.length === 0 ? <p className="text-sm text-slate-500 italic">None</p> : null}
                          <ul className="space-y-2 mt-3">
                            {pos.election_candidates
                              ?.sort((a: any, b: any) => a.id.localeCompare(b.id))
                              .map((c: any, index: number) => (
                              <li key={c.id} className="text-sm font-medium flex flex-wrap items-center justify-between gap-2 p-2 border rounded bg-slate-50">
                                <div className="flex items-center gap-2">
                                  {c.photo_url ? (
                                    <img src={c.photo_url} alt="photo" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                                      <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                  {c.symbol_url ? (
                                    <img src={c.symbol_url} alt="symbol" className="w-7 h-7 object-contain" />
                                  ) : (
                                    <span className="text-xl">{['🍎', '⚽', '🌟', '🎸', '🚗', '🎈', '🍕', '🚀', '🎨', '🐶', '📚', '🌻', '🦁', '🚁', '🍔', '🐼'][index % 16]}</span>
                                  )}
                                  <span>{c.students?.full_name}</span>
                                </div>
                                <div className="relative shrink-0 flex items-center gap-1">
                                  <div className="relative">
                                    <input 
                                      type="file" 
                                      accept="image/*"
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      title="Upload Symbol"
                                      onChange={(e) => handleUploadSymbol(c.id, e)}
                                    />
                                    <button className="text-[10px] uppercase font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded">
                                      {c.symbol_url ? 'Symbol' : '+ Symbol'}
                                    </button>
                                  </div>
                                  <div className="relative">
                                    <input 
                                      type="file" 
                                      accept="image/*"
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      title="Upload Photo"
                                      onChange={(e) => handleUploadPhoto(c.id, e)}
                                    />
                                    <button className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${c.photo_url ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                      {c.photo_url ? 'Photo' : '+ Photo'}
                                    </button>
                                  </div>
                                  <button 
                                    onClick={() => handleRemoveCandidate(c.id)}
                                    className="text-[10px] uppercase font-bold bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                                    title="Remove Candidate"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-slate-400 uppercase font-bold mb-2">Nominate Student</p>
                          <div className="flex flex-col gap-2">
                            <select 
                              className="border p-1.5 text-sm rounded w-full bg-white text-slate-900"
                              value={activePosIdForSearch === pos.id ? activeNominationGrade : ''}
                              onChange={(e) => {
                                setActivePosIdForSearch(pos.id);
                                setActiveNominationGrade(e.target.value);
                                setActiveNominationDivision('');
                                setActiveNominationStudent('');
                                setNominationStudents([]);
                              }}
                            >
                              <option value="" disabled>Select Grade</option>
                              {Array.from(new Set(classes.map(d => d.title.split(' ')[1]).filter(Boolean))).sort().map(g => (
                                <option key={g} value={g as string}>Grade {g as string}</option>
                              ))}
                            </select>
                            
                            {(activePosIdForSearch === pos.id && activeNominationGrade) && (
                              <select 
                                className="border p-1.5 text-sm rounded w-full bg-white text-slate-900"
                                value={activeNominationDivision}
                                onChange={async (e) => {
                                  setActiveNominationDivision(e.target.value);
                                  setActiveNominationStudent('');
                                  const studs = await getStudentsByDivision(e.target.value);
                                  setNominationStudents(studs);
                                }}
                              >
                                <option value="" disabled>Select Division</option>
                                {classes.filter(d => d.title.split(' ')[1] === activeNominationGrade).map(d => (
                                  <option key={d.id} value={d.id}>Div {d.title.split(' ')[2] || ''}</option>
                                ))}
                              </select>
                            )}

                            {(activePosIdForSearch === pos.id && activeNominationDivision) && (
                              <div className="flex gap-2">
                                <select 
                                  className="border p-1.5 text-sm rounded w-full bg-white text-slate-900"
                                  value={activeNominationStudent}
                                  onChange={(e) => setActiveNominationStudent(e.target.value)}
                                >
                                  <option value="" disabled>Select Student</option>
                                  {nominationStudents.map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                  ))}
                                </select>
                                <button 
                                  onClick={() => handleSelectCandidate(activeNominationStudent, pos.id)}
                                  disabled={!activeNominationStudent}
                                  className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Lifecycle Status</h2>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleStatusUpdate('draft')} className={`p-2 rounded border font-medium ${activeElec.status === 'draft' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>Draft</button>
                  <button onClick={() => handleStatusUpdate('open')} className={`p-2 rounded border font-medium ${activeElec.status === 'open' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Open (Polling)</button>
                  <button onClick={() => handleStatusUpdate('closed')} className={`p-2 rounded border font-medium ${activeElec.status === 'closed' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>Closed</button>
                  <button onClick={() => handleStatusUpdate('published')} className={`p-2 rounded border font-medium ${activeElec.status === 'published' ? 'bg-green-600 text-white' : 'text-slate-600'}`}>Publish Results</button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><Unlock className="w-5 h-5 text-blue-500" /> Voting Access Control</h2>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-500 mb-2">Unlock the voting link for a specific division.</p>
                  <select 
                    className="border p-2 text-sm rounded w-full bg-white text-slate-900"
                    value={unlockClassId}
                    onChange={(e) => setUnlockClassId(e.target.value)}
                  >
                    <option value="" disabled>Select Division</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <button 
                    disabled={!unlockClassId}
                    onClick={async () => {
                      try {
                        await unlockDivisionVoting(activeElec.id, unlockClassId);
                        toast.success('Voting link is now accessible for this division!');
                        setUnlockClassId('');
                      } catch(err: any) {
                        toast.error(err.message);
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    Unlock Voting
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <button 
                  onClick={() => window.open(`/election/admin/results`, '_blank')}
                  className="w-full bg-emerald-50 text-emerald-700 font-bold p-4 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  Open Live Results Dashboard &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
