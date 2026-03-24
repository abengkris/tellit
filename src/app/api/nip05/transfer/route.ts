import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyEvent } from 'nostr-tools';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event } = body;

    if (!event) {
      return Response.json({ error: 'Missing signed event' }, { status: 400 });
    }

    // 1. Verify the signature
    const isValid = verifyEvent(event);
    if (!isValid) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Extract transfer details from event
    // Using custom kind 4444 for transfer request
    // Tags should include ["handle", "name"] and ["new_pubkey", "hex"]
    const handleTag = event.tags.find((t: string[]) => t[0] === 'handle');
    const newPubkeyTag = event.tags.find((t: string[]) => t[0] === 'new_pubkey');

    if (!handleTag || !newPubkeyTag) {
      return Response.json({ error: 'Missing handle or new_pubkey in event tags' }, { status: 400 });
    }

    const handleName = handleTag[1];
    const newPubkey = newPubkeyTag[1];
    const currentOwnerPubkey = event.pubkey;

    const supabase = getSupabaseAdmin();

    // 3. Check if handle exists and is owned by current owner
    const { data: handle, error: fetchError } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (fetchError || !handle) {
      return Response.json({ error: 'Handle not found' }, { status: 404 });
    }

    if (handle.pubkey !== currentOwnerPubkey) {
      return Response.json({ error: 'Unauthorized: You do not own this handle' }, { status: 403 });
    }

    // 4. Update the handle owner
    const { error: updateError } = await supabase
      .from('handles')
      .update({ pubkey: newPubkey })
      .eq('name', handleName.toLowerCase());

    if (updateError) {
      console.error('[NIP-05 Transfer] DB Update Error:', updateError);
      return Response.json({ error: 'Database update failed' }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: `Handle ${handleName}@tellit.id transferred successfully to ${newPubkey}` 
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Transfer] Error:', err);
    return Response.json({ error: message }, { status: 500 });
  }
}
