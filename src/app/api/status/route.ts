import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { query } = await req.json(); // UTR number or Roll number

    if (!query || query.trim() === '') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const cleanQuery = query.trim().toLowerCase();

    // Since our db layer wraps Turso/Firebase/LocalStorage, we fetch all and filter server-side
    // This is secure because we don't send the full list to the client.
    const allSubmissions = await db.getSubmissions();

    const matches = allSubmissions.filter(sub => 
      (sub.transactionId && sub.transactionId.toLowerCase() === cleanQuery) ||
      (sub.member1Roll && sub.member1Roll.toLowerCase() === cleanQuery) ||
      (sub.id && sub.id.toLowerCase() === cleanQuery)
    );

    if (matches.length === 0) {
       return NextResponse.json({ found: false });
    }

    // Return only safe data for the first match to avoid leaking PII
    const sub = matches[0];
    
    return NextResponse.json({
      found: true,
      data: {
        id: sub.id,
        teamName: sub.teamName,
        member1Name: sub.member1Name,
        status: sub.status,
        submittedAt: sub.submittedAt
      }
    });

  } catch (error: any) {
    console.error('Error checking status:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
