import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkBlinkInvoiceStatus } from '@/lib/blink';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get('hash');

  if (!hash) {
    return NextResponse.json({ error: 'Missing payment hash' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    // 1. Get registration record
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('payment_hash', hash)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // 2. If already paid in DB, just return success
    if (registration.status === 'paid') {
      return NextResponse.json({ status: 'PAID', handle: `${registration.name}@tellit.id` });
    }

    // 3. Check status via Blink API
    const blinkStatus = await checkBlinkInvoiceStatus(hash);

    if (blinkStatus === 'PAID') {
      // 4. Activate Handle: Move to 'handles' table and update registration status
      
      // Start a "transaction" via concurrent promises (or use a supabase rpc if needed)
      // For simplicity, we do sequential updates here
      
      const { error: activateError } = await supabaseAdmin
        .from('handles')
        .insert({
          name: registration.name,
          pubkey: registration.pubkey,
          relays: ["wss://relay.damus.io", "wss://nos.lol"]
        });

      if (activateError && activateError.code !== '23505') { // Ignore if already exists
        throw activateError;
      }

      await supabaseAdmin
        .from('registrations')
        .update({ status: 'paid' })
        .eq('payment_hash', hash);

      return NextResponse.json({ status: 'PAID', handle: `${registration.name}@tellit.id` });
    }

    return NextResponse.json({ status: blinkStatus });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Check Payment] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
