import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('handles')
      .select('name, pubkey, relays, created_at')
      .eq('name', name.toLowerCase())
      .single();

    if (error || !data) {
      if (error && error.code !== 'PGRST116') {
        console.error('[NIP-05 Resolver] DB Error:', error);
      }
      return NextResponse.json({ names: {} });
    }

    // Check if handle is expired (1 year limit)
    const expiresAt = new Date(new Date(data.created_at).setFullYear(new Date(data.created_at).getFullYear() + 1));
    if (new Date() > expiresAt) {
      return NextResponse.json({ names: {} });
    }

    const response: { names: Record<string, string>; relays?: Record<string, string[]> } = {
      names: {
        [data.name]: data.pubkey
      }
    };

    if (data.relays && data.relays.length > 0) {
      response.relays = {
        [data.pubkey]: data.relays
      };
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('[NIP-05 Resolver] Error:', err);
    return NextResponse.json({ names: {} });
  }
}
