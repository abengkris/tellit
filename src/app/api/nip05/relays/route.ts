import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyEvent } from 'nostr-tools';

/**
 * Update relays for a handle.
 * Requires a signed Nostr event for authorization.
 * Kind: 4445
 * Tags: [["handle", "name"], ["relays", "wss://...", "wss://..."]]
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event } = body;

    if (!event) {
      return NextResponse.json({ error: 'Missing signed event' }, { status: 400 });
    }

    // 1. Verify the signature
    const isValid = verifyEvent(event);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Extract details from event
    const handleTag = event.tags.find((t: string[]) => t[0] === 'handle');
    const relaysTag = event.tags.find((t: string[]) => t[0] === 'relays');

    if (!handleTag || !relaysTag) {
      return NextResponse.json({ error: 'Missing handle or relays in event tags' }, { status: 400 });
    }

    const handleName = handleTag[1];
    const newRelays = relaysTag.slice(1); // All elements after the tag name
    const currentOwnerPubkey = event.pubkey;

    if (newRelays.length === 0) {
      return NextResponse.json({ error: 'At least one relay is required' }, { status: 400 });
    }

    if (newRelays.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 relays allowed' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 3. Check if handle exists and is owned by current owner
    const { data: handle, error: fetchError } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (fetchError || !handle) {
      return NextResponse.json({ error: 'Handle not found' }, { status: 404 });
    }

    if (handle.pubkey !== currentOwnerPubkey) {
      return NextResponse.json({ error: 'Unauthorized: You do not own this handle' }, { status: 403 });
    }

    // 4. Update the relays
    const { error: updateError } = await supabase
      .from('handles')
      .update({ relays: newRelays })
      .eq('name', handleName.toLowerCase());

    if (updateError) {
      console.error('[NIP-05 Relays] DB Update Error:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Relays for ${handleName}@tellit.id updated successfully` 
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Relays] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
