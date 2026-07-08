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

    // 3. Generate codes for those who don't have them
    const genResult = await generateCodesForDivision(electionId, divisionId, mentorId);

    if (genResult.newlyGenerated === 0) {
      return NextResponse.json({ 
        error: 'No new codes generated. All students already have codes issued.',
        details: 'For security, plaintext codes are never stored and cannot be re-downloaded. If a student lost their code, you must explicitly invalidate it and generate a new one.'
      }, { status: 400 });
    }

    // 4. Render PDF with the newly generated codes
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
