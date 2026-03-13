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
  console.error('[NIP-05 LnAddress] Missing event');
  return NextResponse.json({ error: 'Missing signed event' }, { status: 400 });
}

// 1. Verify the signature
const isValid = verifyEvent(event);
if (!isValid) {
  console.error('[NIP-05 LnAddress] Invalid signature', event.id);
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}


    const handleTag = event.tags.find((t: string[]) => t[0] === 'handle');
    const lnTag = event.tags.find((t: string[]) => t[0] === 'lightning_address');

    if (!handleTag || !lnTag) {
      console.error('[NIP-05 LnAddress] Missing tags', { handleTag, lnTag });
      return NextResponse.json({ error: 'Missing handle or lightning_address in event tags' }, { status: 400 });
    }

    const handleName = handleTag[1];
    const lightningAddress = lnTag[1];
    const pubkey = event.pubkey;

    console.log(`[NIP-05 LnAddress] Attempting update: ${handleName} -> ${lightningAddress} by ${pubkey}`);

    const supabase = getSupabaseAdmin();

    // 1. Verify ownership
    const { data: handle } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (!handle || handle.pubkey !== pubkey) {
      console.error('[NIP-05 LnAddress] Unauthorized', { 
        handleExists: !!handle, 
        owner: handle?.pubkey, 
        requester: pubkey 
      });
      return NextResponse.json({ error: 'Unauthorized: You do not own this handle' }, { status: 403 });
    }

    // 2. Update the lightning address
    const { error: updateError } = await supabase
      .from('handles')
      .update({ lightning_address: lightningAddress })
      .eq('name', handleName.toLowerCase());

    if (updateError) {
      console.error('[NIP-05 LnAddress] DB Update Error:', updateError);
      return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 });
    }

    console.log(`[NIP-05 LnAddress] Success: ${handleName} updated to ${lightningAddress}`);
    return NextResponse.json({ success: true, message: `Lightning address for ${handleName} updated` });

  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
