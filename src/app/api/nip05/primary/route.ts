import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyEvent } from 'nostr-tools';

/**
 * Set a handle as primary for a user.
 * Kind: 4446
 * Tags: [["handle", "name"]]
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event } = body;

    if (!event) {
      return NextResponse.json({ error: 'Missing signed event' }, { status: 400 });
    }

    const isValid = verifyEvent(event);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const handleTag = event.tags.find((t: string[]) => t[0] === 'handle');
    if (!handleTag) {
      return NextResponse.json({ error: 'Missing handle in event tags' }, { status: 400 });
    }

    const handleName = handleTag[1];
    const pubkey = event.pubkey;

    const supabase = getSupabaseAdmin();

    // 1. Verify ownership
    const { data: handle } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (!handle || handle.pubkey !== pubkey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Set all user's handles to not primary
    await supabase
      .from('handles')
      .update({ is_primary: false })
      .eq('pubkey', pubkey);

    // 3. Set this handle as primary
    const { error: updateError } = await supabase
      .from('handles')
      .update({ is_primary: true })
      .eq('name', handleName.toLowerCase());

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set primary handle' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `${handleName} is now your primary handle` });

  } catch (err: unknown) {
    console.error('[NIP-05 Primary] Fatal Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
