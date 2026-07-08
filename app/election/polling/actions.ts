'use server';

import { supabaseAdmin } from '@/lib/supabase';

export async function getOfficerElections(mentorId: string) {
  // Bypassing officer assignment check for demo purposes so all open elections are visible
  const { data: elections, error: elecError } = await supabaseAdmin
    .from('elections')
    .select('id, name, status, election_date')
    .in('status', ['open', 'published']);
    
  if (elecError) throw new Error(elecError.message);
  return elections;
}

export async function getOfficerDivisions(mentorId: string, electionId: string) {
  // Bypassing officer assignment check for demo purposes so all divisions are visible
  const { data, error } = await supabaseAdmin
    .from('classes')
    .select('id, title')
    .order('title');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getPollingRoster(divisionId: string, electionId: string) {
  const { data: students, error: stuError } = await supabaseAdmin
    .from('students')
    .select('id, full_name, roll_no')
    .eq('class_id', divisionId)
    .order('full_name');
  if (stuError) throw new Error(stuError.message);

  const { data: sessions, error: sessError } = await supabaseAdmin
    .from('election_voting_sessions')
    .select('status, secret_code_id, election_secret_codes(student_id)')
    .eq('election_id', electionId)
    .eq('division_id', divisionId);
  if (sessError) throw new Error(sessError.message);

  const statusMap = new Map();
  sessions.forEach((s: any) => {
    if (s.election_secret_codes?.student_id) {
      statusMap.set(s.election_secret_codes.student_id, s.status);
    }
  });

  return students.map(s => ({
    ...s,
    status: statusMap.get(s.id) || 'not_issued'
  }));
}
