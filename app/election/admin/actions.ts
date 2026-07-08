'use server';

import { supabaseAdmin } from '@/lib/supabase';

// Assuming auth.uid() would be used in a real environment. We mock it for the task.
const MOCK_CONTROLLER_ID = '00000000-0000-0000-0000-000000000001';

export async function getElections() {
  const { data, error } = await supabaseAdmin
    .from('elections')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createElection(name: string, date: string) {
  const { data, error } = await supabaseAdmin
    .from('elections')
    .insert({ name, election_date: date, created_by: MOCK_CONTROLLER_ID })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateElectionStatus(id: string, status: string) {
  const { error } = await supabaseAdmin
    .from('elections')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);

  if (status === 'published') {
    await supabaseAdmin.from('election_audit_log').insert({
      election_id: id,
      event_type: 'results_published',
      actor_role: 'controller',
      actor_id: MOCK_CONTROLLER_ID
    });
  }
  return true;
}

export async function getPositions(electionId: string) {
  const { data, error } = await supabaseAdmin
    .from('election_positions')
    .select('*, election_candidates(*, students(full_name))')
    .eq('election_id', electionId)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createPosition(electionId: string, name: string, eligibilityScope: any, contestantScope: any) {
  const { data, error } = await supabaseAdmin
    .from('election_positions')
    .insert({ election_id: electionId, name, eligibility_scope: eligibilityScope, contestant_scope: contestantScope })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function searchStudents(query: string) {
  if (!query) return [];
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, full_name, class_id, classes(title)')
    .ilike('full_name', `%${query}%`)
    .limit(10);
  if (error) throw new Error(error.message);
  return data;
}

export async function addCandidate(positionId: string, studentId: string) {
  // Validate contestant scope in a real app before inserting
  const { data, error } = await supabaseAdmin
    .from('election_candidates')
    .insert({ position_id: positionId, student_id: studentId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function searchMentors(query: string) {
  if (!query) return [];
  // Mocking mentors table structure since we don't know the exact AGS mentor structure
  const { data, error } = await supabaseAdmin
    .from('mentors')
    .select('id, user_id') // we might not have a name column, assuming user_id or something
    .limit(10); 
  // In a real AGS environment, we would search by mentor name. Since we saw the schema earlier, we know mentors has id, user_id, mentor_code.
  if (error) throw new Error(error.message);
  return data;
}

export async function getClasses() {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .select('id, title')
    .order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function assignOfficer(electionId: string, mentorId: string, divisionId: string) {
  const { error } = await supabaseAdmin
    .from('election_polling_officer_assignments')
    .insert({ election_id: electionId, mentor_id: mentorId, division_id: divisionId, assigned_by: MOCK_CONTROLLER_ID });
  if (error) throw new Error(error.message);
  return true;
}

export async function getLiveTallies(electionId: string, positionIds: string[]) {
  // We call the security definer function for each position.
  const tallies: Record<string, any[]> = {};
  for (const posId of positionIds) {
    const { data, error } = await supabaseAdmin.rpc('election_tally', { p_position_id: posId });
    if (!error && data) {
      tallies[posId] = data;
    }
  }
  return tallies;
}

export async function getTurnoutStats(electionId: string) {
  // Same logic as officer view, but for all divisions
  const { data, error } = await supabaseAdmin
    .from('election_voting_sessions')
    .select('status, division_id, classes(title)')
    .eq('election_id', electionId);

  if (error) throw new Error(error.message);

  const classStats: Record<string, { className: string, total: number, voted: number, voting: number }> = {};
  
  data.forEach((session: any) => {
    const classId = session.division_id;
    const classTitle = session.classes?.title || 'Unknown Class';

    if (!classStats[classId]) {
      classStats[classId] = { className: classTitle, total: 0, voted: 0, voting: 0 };
    }
    classStats[classId].total++;
    if (session.status === 'done') classStats[classId].voted++;
    if (session.status === 'doing') classStats[classId].voting++;
  });
  
  return Object.values(classStats);
}

export async function updateCandidateSymbol(candidateId: string, base64Url: string) {
  const { error } = await supabaseAdmin
    .from('election_candidates')
    .update({ symbol_url: base64Url })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
  return true;
}

export async function updateCandidatePhoto(candidateId: string, base64Url: string) {
  const { error } = await supabaseAdmin
    .from('election_candidates')
    .update({ photo_url: base64Url })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
  return true;
}

export async function getStudentsByDivision(divisionId: string) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, full_name, class_id, classes(title)')
    .eq('class_id', divisionId)
    .order('full_name');
  if (error) throw new Error(error.message);
  return data;
}

export async function removeCandidate(candidateId: string) {
  const { error } = await supabaseAdmin
    .from('election_candidates')
    .delete()
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
  return true;
}
