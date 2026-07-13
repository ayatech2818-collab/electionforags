'use server';

import { supabaseAdmin, getServerUser } from '@/lib/supabase';

export async function getMentorDivisions() {
  const user = await getServerUser();
  if (!user) return { error: 'Not authenticated' };

  // First resolve the mentor's ID from the mentors table using their auth user_id
  const { data: mentor } = await supabaseAdmin
    .from('mentors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!mentor) {
    return []; // User is not registered as a mentor
  }

  const { data: assignments, error } = await supabaseAdmin
    .from('mentor_class_assignments')
    .select('class_id, classes(id, title)')
    .eq('mentor_id', mentor.id)
    .eq('is_active', true);
    
  if (error) throw new Error(error.message);
  
  const data = assignments.map(a => {
    const c = a.classes as any;
    return Array.isArray(c) ? c[0] : c;
  }).filter(Boolean);
  return data as any[];
}

export async function getActiveElections() {
  const { data, error } = await supabaseAdmin
    .from('elections')
    .select('id, name, status, election_date, allow_mentor_reset, allow_mentor_generate_all')
    .in('status', ['draft', 'open']) // Mentors can generate cards before or during polling
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getDivisionRoster(divisionId: string, electionId: string) {
  // Get all students
  const { data: students, error: studentsError } = await supabaseAdmin
    .from('students')
    .select('id, full_name, roll_no, phone')
    .eq('class_id', divisionId)
    .order('full_name', { ascending: true });

  if (studentsError) throw new Error(studentsError.message);

  // Check if they have codes generated for this election
  const { data: codes, error: codesError } = await supabaseAdmin
    .from('election_secret_codes')
    .select('student_id, status')
    .eq('election_id', electionId);

  if (codesError) throw new Error(codesError.message);

  const codesMap = new Map(codes.map(c => [c.student_id, { status: c.status, code: null }]));

  return students.map(s => {
    const codeData = codesMap.get(s.id);
    return {
      ...s,
      hasCode: !!codeData,
      status: codeData?.status || 'not_issued',
      secretCode: codeData?.code || null
    };
  });
}

export async function invalidateCode(studentId: string, electionId: string) {
  try {
    // Deletes the existing code so a new one can be generated
    const { error } = await supabaseAdmin
      .from('election_secret_codes')
      .delete()
      .match({ student_id: studentId, election_id: electionId });
      
    if (error) return { error: error.message };
    
    // Log regeneration event
    await supabaseAdmin.from('election_audit_log').insert({
      election_id: electionId,
      event_type: 'code_invalidated',
      actor_role: 'mentor',
      // actor_id: auth.uid(), // in a real system
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to invalidate code.' };
  }
}

import { generateRandomCode, hashSecretCode } from '@/lib/election/code-generator';

export async function generateSingleCodeForWhatsapp(studentId: string, electionId: string) {
  try {
    const user = await getServerUser();
    if (!user) return { error: 'Not authenticated' };

    // Check if they already have an active code
    const { data: existing } = await supabaseAdmin
      .from('election_secret_codes')
      .select('id')
      .eq('student_id', studentId)
      .eq('election_id', electionId)
      .maybeSingle();

    if (existing) {
      return { error: 'Code already exists. Please regenerate it first if you lost it.' };
    }

    // Generate new code
    const plaintextCode = await generateRandomCode();
    const { hash, salt } = await hashSecretCode(plaintextCode);

    const { error } = await supabaseAdmin.from('election_secret_codes').insert({
      election_id: electionId,
      student_id: studentId,
      code_hash: hash,
      salt: salt,
      status: 'issued'
    });

    if (error) return { error: error.message };

    return { plaintextCode };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred during generation.' };
  }
}
