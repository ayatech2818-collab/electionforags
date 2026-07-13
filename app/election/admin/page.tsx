'use client';

import { useState, useEffect } from 'react';
import { getElections, createElection, updateElectionStatus, getPositions, createPosition, searchStudents, addCandidate, getClasses, updateCandidateSymbol, getStudentsByDivision, removeCandidate, updateCandidatePhoto, removePosition, setDivisionVotingStatus, getDivisionVotingStatus, getAllDivisionStatusesForElection, updateMentorResetAccess, updateStudentName, updateMentorGenerateAllAccess } from './actions';
import { Plus, Trash2, Shield, Calendar, MapPin, Users, User, Settings, PlayCircle, BarChart3, ChevronRight, Activity, Save, LayoutList, CheckCircle, Target, ShieldCheck, Unlock, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ElectionController() {
  const [elections, setElections] = useState<any[]>([]);
  const [activeElec, setActiveElec] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockGrade, setUnlockGrade] = useState<string>('');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [divisionStatuses, setDivisionStatuses] = useState<Record<string, boolean>>({});
  const [downloadGrade, setDownloadGrade] = useState<string>('');
  const [downloadDivision, setDownloadDivision] = useState<string>('');
  const [divisionStudentCount, setDivisionStudentCount] = useState<number | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeElec) loadDetails(activeElec.id);
  }, [activeElec]);

  useEffect(() => {
    if (downloadDivision) {
      getStudentsByDivision(downloadDivision)
        .then(students => setDivisionStudentCount(students.length))
        .catch(console.error);
    } else {
      setDivisionStudentCount(null);
    }
  }, [downloadDivision]);

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
      const [posData, statusData] = await Promise.all([
        getPositions(id),
        getAllDivisionStatusesForElection(id)
      ]);
      setPositions(posData);
      setDivisionStatuses(statusData);
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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Election Controller Configuration</h1>
            <p className="text-slate-500 text-sm md:text-base">Configure elections, positions, and candidates.</p>
          </div>
          <select 
            value={activeElec?.id || ''} 
            onChange={e => setActiveElec(elections.find(el => el.id === e.target.value))}
            className="p-2 border rounded-md w-full md:w-auto"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900"><Target className="text-blue-500"/> Positions & Candidates</h2>
                <form onSubmit={handleAddPosition} className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
                  <input name="name" placeholder="New Position (e.g. Head Girl)" className="border p-2 rounded flex-1 text-slate-900 placeholder:text-slate-500 bg-white" required />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded shrink-0 whitespace-nowrap">Add Position</button>
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
                              <li key={c.id} className="text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded bg-slate-50">
                                <div className="flex items-center gap-3">
                                  {c.photo_url ? (
                                    <img src={c.photo_url} alt="photo" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                  {c.symbol_url ? (
                                    <img src={c.symbol_url} alt="symbol" className="w-8 h-8 object-contain shrink-0" />
                                  ) : (
                                    <span className="text-2xl shrink-0">{['🍎', '⚽', '🌟', '🎸', '🚗', '🎈', '🍕', '🚀', '🎨', '🐶', '📚', '🌻', '🦁', '🚁', '🍔', '🐼'][index % 16]}</span>
                                  )}
                                  <div className="flex flex-col">
                                    {editingCandidate?.id === c.students?.id ? (
                                      <div className="flex items-center gap-2 mt-1">
                                        <input
                                          type="text"
                                          value={editingCandidate?.name || ''}
                                          onChange={(e) => editingCandidate && setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                                          className="border border-blue-400 p-1.5 rounded text-sm w-48 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                                          autoFocus
                                          onKeyDown={async (e) => {
                                            if (e.key === 'Enter' && editingCandidate) {
                                              if (editingCandidate.name.trim() && editingCandidate.name.trim() !== c.students?.full_name) {
                                                try {
                                                  await updateStudentName(c.students?.id, editingCandidate.name.trim());
                                                  toast.success("Name updated successfully!");
                                                  loadDetails(activeElec.id);
                                                } catch (err: any) {
                                                  toast.error(err.message);
                                                }
                                              }
                                              setEditingCandidate(null);
                                            } else if (e.key === 'Escape') {
                                              setEditingCandidate(null);
                                            }
                                          }}
                                        />
                                        <button 
                                          onClick={async () => {
                                            if (editingCandidate.name.trim() && editingCandidate.name.trim() !== c.students?.full_name) {
                                              try {
                                                await updateStudentName(c.students?.id, editingCandidate.name.trim());
                                                toast.success("Name updated successfully!");
                                                loadDetails(activeElec.id);
                                              } catch (err: any) {
                                                toast.error(err.message);
                                              }
                                            }
                                            setEditingCandidate(null);
                                          }} 
                                          className="text-green-700 bg-green-100 hover:bg-green-200 p-1.5 rounded"
                                          title="Save"
                                        >
                                          <Save className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingCandidate(null)} 
                                          className="text-slate-500 bg-slate-200 hover:bg-slate-300 p-1.5 rounded"
                                          title="Cancel"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="leading-tight group flex items-center gap-2">
                                        <span className="font-bold text-slate-800">{c.students?.full_name}</span>
                                        <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">{c.students?.classes?.title || 'Unknown Class'}</span>
                                        <button
                                          onClick={() => setEditingCandidate({ id: c.students?.id, name: c.students?.full_name })}
                                          className="text-slate-400 hover:text-blue-600 transition-colors"
                                          title="Edit Name"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </button>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="relative shrink-0 flex items-center gap-2 self-start sm:self-auto ml-11 sm:ml-0">
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
                  <p className="text-sm text-slate-500 mb-2">Unlock the voting link for an entire grade.</p>
                  
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto p-1 mt-2">
                    {Array.from(new Set(classes.map(d => d.title.split(' ')[1]).filter(Boolean))).sort().map(g => {
                      const gradeString = g as string;
                      const gradeDivisions = classes.filter(d => d.title.split(' ')[1] === gradeString);
                      const isGradeEnabled = gradeDivisions.some(d => divisionStatuses[d.id]);

                      return (
                        <div key={gradeString} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                          isGradeEnabled 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                          <span className={`font-semibold ${isGradeEnabled ? 'text-emerald-900' : 'text-slate-700'}`}>
                            Grade {gradeString}
                          </span>
                          
                          <button
                            onClick={async () => {
                              const newStatus = !isGradeEnabled;
                              try {
                                await Promise.all(gradeDivisions.map(d => setDivisionVotingStatus(activeElec.id, d.id, newStatus)));
                                setDivisionStatuses(prev => {
                                  const next = { ...prev };
                                  gradeDivisions.forEach(d => next[d.id] = newStatus);
                                  return next;
                                });
                                toast.success(`Voting ${newStatus ? 'ENABLED' : 'DISABLED'} for Grade ${gradeString}`);
                              } catch (e: any) {
                                toast.error(e.message);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isGradeEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGradeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mt-6">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Mentor Access Control
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Allow Mother Mentors to reset student voter IDs. When disabled, the Reset button is hidden.
                </p>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="font-medium text-slate-700 text-sm">Enable Reset Button</span>
                  <button
                    onClick={async () => {
                      const newStatus = !activeElec.allow_mentor_reset;
                      try {
                        await updateMentorResetAccess(activeElec.id, newStatus);
                        setActiveElec({ ...activeElec, allow_mentor_reset: newStatus });
                        setElections(elections.map(e => e.id === activeElec.id ? { ...e, allow_mentor_reset: newStatus } : e));
                        toast.success(`Mentor reset access ${newStatus ? 'enabled' : 'disabled'}`);
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${activeElec.allow_mentor_reset ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeElec.allow_mentor_reset ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 mt-3">
                  <span className="font-medium text-slate-700 text-sm">Enable "Generate & Send" for ALL (even if issued)</span>
                  <button
                    onClick={async () => {
                      const newStatus = !activeElec.allow_mentor_generate_all;
                      try {
                        await updateMentorGenerateAllAccess(activeElec.id, newStatus);
                        setActiveElec({ ...activeElec, allow_mentor_generate_all: newStatus });
                        setElections(elections.map(e => e.id === activeElec.id ? { ...e, allow_mentor_generate_all: newStatus } : e));
                        toast.success(`Mentor generate all access ${newStatus ? 'enabled' : 'disabled'}`);
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${activeElec.allow_mentor_generate_all ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeElec.allow_mentor_generate_all ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mt-6">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-lg mb-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  Export Voter Credentials
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Generate and download PDF sheets containing secret voter codes for a specific division. This automatically issues secure codes to any students who don't have them yet.
                </p>
                <div className="flex flex-col gap-3">
                  <select 
                    className="border p-2 text-sm rounded w-full bg-white text-slate-900"
                    value={downloadGrade}
                    onChange={(e) => {
                      setDownloadGrade(e.target.value);
                      setDownloadDivision('');
                    }}
                  >
                    <option value="" disabled>Select Grade</option>
                    {Array.from(new Set(classes.map(d => d.title.split(' ')[1]).filter(Boolean))).sort().map(g => (
                      <option key={g} value={g as string}>Grade {g as string}</option>
                    ))}
                  </select>
                  
                  {downloadGrade && (
                    <select 
                      className="border p-2 text-sm rounded w-full bg-white text-slate-900"
                      value={downloadDivision}
                      onChange={(e) => setDownloadDivision(e.target.value)}
                    >
                      <option value="" disabled>Select Division</option>
                      {classes.filter(d => d.title.split(' ')[1] === downloadGrade).map(d => (
                        <option key={d.id} value={d.id}>Div {d.title.split(' ')[2] || ''}</option>
                      ))}
                    </select>
                  )}
                  
                  {downloadDivision && divisionStudentCount !== null && (
                    <div className="text-sm text-slate-600 bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span><strong>{divisionStudentCount}</strong> students found in this division.</span>
                    </div>
                  )}

                  <button 
                    disabled={!downloadDivision}
                    onClick={() => {
                      window.open(`/api/election/generate-ids?electionId=${activeElec.id}&divisionId=${downloadDivision}&mentorId=system`, '_blank');
                    }}
                    className="w-full bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download PDF
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
