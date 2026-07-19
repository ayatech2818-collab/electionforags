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

export async function updateMentorResetAccess(id: string, allowReset: boolean) {
  const { error } = await supabaseAdmin
    .from('elections')
    .update({ allow_mentor_reset: allowReset })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function updateMentorGenerateAllAccess(id: string, allowGenerateAll: boolean) {
  const { error } = await supabaseAdmin
    .from('elections')
    .update({ allow_mentor_generate_all: allowGenerateAll })
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function getPositions(electionId: string) {
  const { data, error } = await supabaseAdmin
    .from('election_positions')
    .select('*, election_candidates(*, students(id, full_name, classes(title)))')
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

export async function getLiveTallies(electionId: string, positionIds: string[], divisionIds?: string[]) {
  const tallies: Record<string, any[]> = {};
  positionIds.forEach(p => tallies[p] = []);

  if (divisionIds && divisionIds.length > 0 && divisionIds[0] !== 'all') {
    // Filtered by division(s): manually aggregate with pagination
    let allVotes: any[] = [];
    let hasMore = true;
    let page = 0;

    while (hasMore) {
      const { data: votes, error } = await supabaseAdmin
        .from('election_votes')
        .select('candidate_id, position_id, election_voting_sessions!inner(division_id)')
        .in('position_id', positionIds)
        .in('election_voting_sessions.division_id', divisionIds)
        .range(page * 1000, (page + 1) * 1000 - 1);

      if (error) {
        console.error('Error fetching filtered votes:', error);
        break;
      }

      allVotes = allVotes.concat(votes || []);
      if (!votes || votes.length < 1000) {
        hasMore = false;
      }
      page++;
    }

    if (allVotes.length > 0) {
      const voteCounts = new Map<string, number>();
      allVotes.forEach((v: any) => {
        const count = voteCounts.get(v.candidate_id) || 0;
        voteCounts.set(v.candidate_id, count + 1);
      });
      
      voteCounts.forEach((count, candidate_id) => {
        const pos_id = allVotes.find((v: any) => v.candidate_id === candidate_id)?.position_id;
        if (pos_id) {
          tallies[pos_id].push({ candidate_id, vote_count: count });
        }
      });
    }
  } else {
    // Unfiltered: use RPC
    for (const posId of positionIds) {
      const { data, error } = await supabaseAdmin.rpc('election_tally', { p_position_id: posId });
      if (!error && data) {
        tallies[posId] = data;
      }
    }
  }

  return tallies;
}

export async function getTurnoutStats(electionId: string) {
  // 1. Get all students and their class info (with pagination to bypass 1000 row limit)
  let allStudents: any[] = [];
  let hasMore = true;
  let page = 0;
  
  while (hasMore) {
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, class_id, classes(title)')
      .range(page * 1000, (page + 1) * 1000 - 1);
      
    if (studentsError) throw new Error(studentsError.message);
    
    allStudents = allStudents.concat(students || []);
    if (!students || students.length < 1000) {
      hasMore = false;
    }
    page++;
  }
  
  // 2. Get all voting sessions for this election (with pagination)
  let allSessions: any[] = [];
  hasMore = true;
  page = 0;
  
  while (hasMore) {
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('election_voting_sessions')
      .select('status, division_id')
      .eq('election_id', electionId)
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (sessionsError) throw new Error(sessionsError.message);
    
    allSessions = allSessions.concat(sessions || []);
    if (!sessions || sessions.length < 1000) {
      hasMore = false;
    }
    page++;
  }

  const classStats: Record<string, { classId: string, className: string, total: number, voted: number, voting: number }> = {};

  // Count total eligible per class based on all students
  allStudents.forEach((s: any) => {
    if (!s.class_id) return;
    const c = Array.isArray(s.classes) ? s.classes[0] : s.classes;
    const classTitle = c?.title || 'Unknown Class';
    
    if (!classStats[s.class_id]) {
      classStats[s.class_id] = { classId: s.class_id, className: classTitle, total: 0, voted: 0, voting: 0 };
    }
    classStats[s.class_id].total++;
  });

  // Count voted/voting per class based on sessions
  allSessions.forEach((session: any) => {
    const classId = session.division_id;
    if (classStats[classId]) {
      if (session.status === 'done') classStats[classId].voted++;
      if (session.status === 'doing') classStats[classId].voting++;
    } else {
      // Edge case: session exists but no total somehow
      classStats[classId] = { classId, className: 'Unknown Class', total: 0, voted: 0, voting: 0 };
      if (session.status === 'done') classStats[classId].voted++;
      if (session.status === 'doing') classStats[classId].voting++;
    }
  });

  return Object.values(classStats).sort((a, b) => a.className.localeCompare(b.className));
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

export async function removePosition(positionId: string) {
  const { error } = await supabaseAdmin
    .from('election_positions')
    .delete()
    .eq('id', positionId);
  if (error) throw new Error(error.message);
  return true;
}

export async function setDivisionVotingStatus(electionId: string, divisionId: string, isUnlocked: boolean) {
  const { error } = await supabaseAdmin
    .from('election_division_voting_status')
    .upsert({ 
      election_id: electionId, 
      division_id: divisionId, 
      is_unlocked: isUnlocked 
    }, { onConflict: 'election_id, division_id' });
  
  if (error) throw new Error(error.message);
  return true;
}

export async function getDivisionVotingStatus(electionId: string, divisionId: string) {
  const { data, error } = await supabaseAdmin
    .from('election_division_voting_status')
    .select('is_unlocked')
    .eq('election_id', electionId)
    .eq('division_id', divisionId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data?.is_unlocked || false;
}

export async function getAllDivisionStatusesForElection(electionId: string) {
  const { data, error } = await supabaseAdmin
    .from('election_division_voting_status')
    .select('division_id, is_unlocked')
    .eq('election_id', electionId);
  
  if (error) throw new Error(error.message);
  
  const statusMap: Record<string, boolean> = {};
  data?.forEach(row => {
    statusMap[row.division_id] = row.is_unlocked;
  });
  return statusMap;
}

export async function updateStudentName(studentId: string, newName: string) {
  const { error } = await supabaseAdmin
    .from('students')
    .update({ full_name: newName })
    .eq('id', studentId);
  if (error) throw new Error(error.message);
  return true;
}
