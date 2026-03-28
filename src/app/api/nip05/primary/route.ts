import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyEvent } from 'nostr-tools';
import { verifySession } from '@/lib/dal';

/**
 * Set a handle as primary for a user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, handle: directHandle } = body;

    let pubkey: string;
    let handleName: string;

    // 1. Session & Auth Verification
    if (event) {
      if (!verifyEvent(event)) {
        return Response.json({ error: 'Invalid signed event' }, { status: 400 });
      }
      const handleTag = event.tags.find((t: string[]) => t[0] === 'handle');
      if (!handleTag) return Response.json({ error: 'Missing handle tag' }, { status: 400 });
      handleName = handleTag[1];
      pubkey = event.pubkey;
    } else {
      const session = await verifySession();
      if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      pubkey = session.pubkey;
      handleName = directHandle;
    }

    if (!handleName) return Response.json({ error: 'Missing handle name' }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // 2. Verify ownership and ensure the handle actually belongs to THIS pubkey
    const { data: handle, error: fetchError } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (fetchError || !handle || handle.pubkey !== pubkey) {
      return Response.json({ error: 'Unauthorized: Handle does not belong to you' }, { status: 403 });
    }

    // 3. Transaction-like update (set all others false, set this one true)
    // In Supabase we use two calls as we don't have direct SQL transactions here
    await supabase
      .from('handles')
      .update({ is_primary: false })
      .eq('pubkey', pubkey);

    const { error: updateError } = await supabase
      .from('handles')
      .update({ is_primary: true })
      .eq('name', handleName.toLowerCase())
      .eq('pubkey', pubkey); // Extra safety: ensure we only update OUR handle

    if (updateError) {
      return Response.json({ error: 'Failed to set primary handle' }, { status: 500 });
    }

    return Response.json({ success: true, message: `${handleName} is now your primary handle` });

  } catch (err: unknown) {
    console.error('[NIP-05 Primary] Fatal Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
