import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const db = createClient({
      url: process.env.NEXT_PUBLIC_TURSO_DATABASE_URL!,
      authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN!
    });

    const rs = await db.execute({
      sql: 'SELECT paymentScreenshotUrl FROM submissions WHERE id = ?',
      args: [id]
    });
    
    if (!rs.rows.length || !rs.rows[0].paymentScreenshotUrl) {
      return new NextResponse('Not found', { status: 404 });
    }

    const dataUri = rs.rows[0].paymentScreenshotUrl as string;
    
    // Parse data URI: data:image/png;base64,iVBORw0KGgo...
    const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return new NextResponse('Invalid image data', { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse('Internal error: ' + (error?.message || String(error)), { status: 500 });
  }
}
