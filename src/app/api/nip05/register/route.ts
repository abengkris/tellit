import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateUsername } from '@/lib/nip05';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const validation = validateUsername(name);
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  try {
    const { data } = await supabase
      .from('handles')
      .select('name')
      .eq('name', name.toLowerCase())
      .single();

    return NextResponse.json({ available: !data });
  } catch {
    return NextResponse.json({ available: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pubkey } = body;

    if (!name || !pubkey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validation = validateUsername(name);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if name taken
    const { data: existing } = await supabase
      .from('handles')
      .select('name')
      .eq('name', name.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // --- TEST MODE: DIRECT INSERTION ---
    // In production, you would only do this after payment is verified.
    const { error: insertError } = await supabase
      .from('handles')
      .insert({
        name: name.toLowerCase(),
        pubkey: pubkey,
        relays: relays || ["wss://relay.damus.io", "wss://nos.lol"]
      });

    if (insertError) {
      console.error('[NIP-05 Register] DB Error:', insertError);
      return NextResponse.json({ error: 'Failed to activate handle' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Handle activated successfully!',
      handle: `${name}@tellit.id`
    });

  } catch (err) {
    console.error('[NIP-05 Register] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
