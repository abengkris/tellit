import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Public directory of verified handles.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const supabase = getSupabaseAdmin();
    
    // Only return active, non-expired handles
    // Expiration is 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: handles, error, count } = await supabase
      .from('handles')
      .select('name, pubkey, created_at, relays', { count: 'exact' })
      .gt('created_at', oneYearAgo.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      handles: handles || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (err) {
    console.error('[Directory API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
