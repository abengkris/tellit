import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyEvent } from 'nostr-tools';

/**
 * Update Lightning Address for a handle.
 * Kind: 4447
 * Tags: [["handle", "name"], ["lightning_address", "user@domain.com"]]
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
    const lnTag = event.tags.find((t: string[]) => t[0] === 'lightning_address');

    if (!handleTag || !lnTag) {
      return NextResponse.json({ error: 'Missing handle or lightning_address in event tags' }, { status: 400 });
    }

    const handleName = handleTag[1];
    const lightningAddress = lnTag[1];
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

    // 2. Update the lightning address
    const { error: updateError } = await supabase
      .from('handles')
      .update({ lightning_address: lightningAddress })
      .eq('name', handleName.toLowerCase());

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update lightning address' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Lightning address for ${handleName} updated` });

  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
