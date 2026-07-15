import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCodesForDivision } from '@/lib/election/code-generator';
import { renderToStream } from '@react-pdf/renderer';
import { IdCardTemplate } from '@/components/election/IdCardTemplate';
import React from 'react';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    const divisionId = searchParams.get('divisionId');
    const mentorId = searchParams.get('mentorId') || 'system';

    if (!electionId || !divisionId) {
      return NextResponse.json({ error: 'Missing electionId or divisionId' }, { status: 400 });
    }

    // Optional: verify the mentor is actually the mother mentor for this division
    // In a full auth setup, this would use auth.uid() instead of query params.

    // 1. Fetch election details
    const { data: election, error: electionError } = await supabaseAdmin
      .from('elections')
      .select('name, election_date')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // 2. Fetch division name
    const { data: division, error: divisionError } = await supabaseAdmin
      .from('classes')
      .select('title')
      .eq('id', divisionId)
      .single();

    const className = division?.title || 'Unknown Class';

    const forceReset = searchParams.get('forceReset') === 'true';

    if (forceReset) {
      const { data: students } = await supabaseAdmin.from('students').select('id').eq('class_id', divisionId);
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        await supabaseAdmin.from('election_secret_codes')
          .delete()
          .eq('election_id', electionId)
          .in('student_id', studentIds);
      }
    }

    // 3. Generate codes for those who don't have them (and fetch existing readable ones)
    const genResult = await generateCodesForDivision(electionId, divisionId, mentorId);

    if (genResult.codes.length === 0) {
      return NextResponse.json({ 
        error: 'No codes available to download.',
        details: 'There are no students in this division, or the existing codes are from an older version that cannot be retrieved.'
      }, { status: 400 });
    }

    // 4. Render PDF with the codes
    const cardsToGenerate = genResult.codes.map(c => ({
      studentName: c.studentName,
      rollNo: c.rollNo,
      className: className,
      secretCode: c.secretCode,
      // photoUrl: auto-pulled if available in a real system
    }));

    const stream = await renderToStream(
      <IdCardTemplate
        cards={cardsToGenerate}
        electionTitle={election.name}
        electionDate={new Date(election.election_date).toLocaleDateString()}
      />
    );

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="voter-ids-${className.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating IDs:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
