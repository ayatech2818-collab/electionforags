import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { ShieldCheck, User, Fingerprint } from 'lucide-react';

import { hashSecretCode } from '@/lib/election/code-generator';

export default async function VoterCardPage({ params, searchParams }: { params: { studentId: string }, searchParams: { code?: string } }) {
  const studentId = params.studentId;
  const plaintextCode = searchParams.code;

  if (!plaintextCode) return notFound();

  // 1. Fetch the secret code details using the student ID
  const { data: codeData, error: codeError } = await supabaseAdmin
    .from('election_secret_codes')
    .select('student_id, election_id, status, salt, code_hash')
    .eq('student_id', studentId)
    .single();

  if (codeError || !codeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Invalid Card</h1>
          <p className="text-slate-500 text-sm">No active voting pass found for this student.</p>
        </div>
      </div>
    );
  }

  // 2. Verify the hash
  const crypto = require('crypto');
  const computedHash = crypto.createHash('sha256').update(plaintextCode + codeData.salt).digest('hex');

  if (computedHash !== codeData.code_hash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Invalid Code</h1>
          <p className="text-slate-500 text-sm">This Voter ID code is incorrect or has been revoked.</p>
        </div>
      </div>
    );
  }

  // 3. Fetch student details
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('full_name, roll_no, classes(title)')
    .eq('id', codeData.student_id)
    .single();

  const classTitle = student?.classes 
    ? (Array.isArray(student.classes) ? student.classes[0]?.title : (student.classes as any).title)
    : 'Unknown Class';

  // 4. Fetch election details
  const { data: election } = await supabaseAdmin
    .from('elections')
    .select('name, election_date')
    .eq('id', codeData.election_id)
    .single();

  if (!student || !election) return notFound();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        {/* Digital ID Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-center text-white relative">
            {/* Watermark */}
            <ShieldCheck className="absolute -right-4 -top-4 w-32 h-32 opacity-10" />
            <h2 className="text-xs font-bold tracking-widest uppercase mb-1 opacity-90">Ayadi Glocal School</h2>
            <h1 className="text-xl font-bold">{election.name}</h1>
            <p className="text-sm font-medium opacity-80 mt-1">Official Voter Pass</p>
          </div>

          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Elector Name</p>
                <p className="text-lg font-bold text-slate-900">{student.full_name}</p>
                
                <div className="flex gap-4 mt-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Class</p>
                    <p className="text-sm font-semibold text-slate-700">{classTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Roll No</p>
                    <p className="text-sm font-semibold text-slate-700">{student.roll_no}</p>
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
                {plaintextCode}
              </div>
              <p className="text-xs text-purple-600 font-semibold mt-3 relative z-10">Do not share this code with anyone.</p>
            </div>

            <div className="mt-8 flex gap-2 justify-center text-xs font-medium text-slate-400">
              <span>Date: {new Date(election.election_date).toLocaleDateString()}</span>
              <span>•</span>
              <span>Status: {codeData.status === 'used' ? 'VOTED' : 'READY'}</span>
            </div>
          </div>
          
          {/* Status Overlay if used */}
          {codeData.status === 'used' && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <div className="transform -rotate-12 border-4 border-red-500 text-red-500 font-black text-4xl tracking-widest uppercase py-2 px-6 rounded-xl">
                Voted
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <a href="/vote" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-8 rounded-full shadow-lg shadow-purple-500/30 transition-all">
            Proceed to Voting Booth →
          </a>
        </div>
      </div>
    </div>
  );
}
