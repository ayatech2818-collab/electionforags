'use server';

import crypto from 'crypto';
import { supabaseAdmin } from '../supabase';

// Unambiguous alphabet: excludes 0, O, 1, I, l
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a crypto-random 6-character code using the unambiguous alphabet.
 */
export async function generateRandomCode(): Promise<string> {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, ALPHABET.length);
    result += ALPHABET[randomIndex];
  }
  return result;
}

/**
 * Hashes a plaintext code with a given salt using SHA-256.
 * We embed the plaintext code in the salt field (with a prefix) so that it can be retrieved 
 * by the Admin and Mother Mentors without changing the DB schema.
 */
export async function hashSecretCode(code: string): Promise<{ hash: string, salt: string }> {
  const salt = 'PLAIN:' + code;
  const hash = crypto.createHash('sha256').update(code + salt).digest('hex');
  return { hash, salt };
}

/**
 * Issues new unique voter codes for all students in a given division for an election.
 * Returns an array of objects containing student details and their plaintext code.
 * Re-running this will NOT regenerate codes for students who already have them.
 */
export async function generateCodesForDivision(electionId: string, divisionId: string, actorId: string) {
  // 1. Fetch all students in the division
  const { data: students, error: studentsError } = await supabaseAdmin
    .from('students')
    .select('id, full_name, roll_no')
    .eq('class_id', divisionId);

  if (studentsError || !students) {
    throw new Error('Failed to fetch students for division');
  }

  // 2. Fetch existing codes for these students in this election
  const { data: existingCodes, error: codesError } = await supabaseAdmin
    .from('election_secret_codes')
    .select('student_id, salt')
    .eq('election_id', electionId)
    .in('student_id', students.map(s => s.id));

  if (codesError) {
    throw new Error('Failed to fetch existing codes');
  }

  const studentsWithCodes = new Set(existingCodes.map(c => c.student_id));
  const studentsNeedingCodes = students.filter(s => !studentsWithCodes.has(s.id));
  
  const generatedCodes = [];
  
  // Reconstruct existing plaintext codes if available
  for (const c of existingCodes) {
    if (c.salt && c.salt.startsWith('PLAIN:')) {
      const plaintextCode = c.salt.substring(6);
      const student = students.find(s => s.id === c.student_id);
      if (student) {
        generatedCodes.push({
          studentId: student.id,
          studentName: student.full_name,
          rollNo: student.roll_no,
          secretCode: plaintextCode
        });
      }
    }
  }

  const auditLogs = [];
  const dbInserts = [];

  // 3. Generate codes for those who need them
  for (const student of studentsNeedingCodes) {
    const plaintextCode = await generateRandomCode();
    const { hash: codeHash, salt } = await hashSecretCode(plaintextCode);

    dbInserts.push({
      election_id: electionId,
      student_id: student.id,
      code_hash: codeHash,
      salt: salt,
      status: 'issued'
    });

    auditLogs.push({
      election_id: electionId,
      event_type: 'code_issued',
      actor_role: 'system_or_mentor',
      actor_id: actorId,
      division_id: divisionId
    });

    generatedCodes.push({
      studentId: student.id,
      studentName: student.full_name,
      rollNo: student.roll_no,
      secretCode: plaintextCode
    });
  }

  // 4. Persist to database in a transaction-like manner
  if (dbInserts.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('election_secret_codes')
      .insert(dbInserts);

    if (insertError) {
      throw new Error(`Failed to insert secret codes: ${insertError.message}`);
    }

    const { error: auditError } = await supabaseAdmin
      .from('election_audit_log')
      .insert(auditLogs);

    if (auditError) {
      console.error('Failed to write audit logs', auditError);
    }
  }

  return {
    success: true,
    newlyGenerated: generatedCodes.length,
    alreadyIssued: existingCodes.length,
    codes: generatedCodes // This list contains ONLY the newly generated plaintext codes
  };
}
