import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkBlinkInvoiceStatus } from '@/lib/blink';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get('hash');

  if (!hash) {
    return NextResponse.json({ error: 'Missing payment hash' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Get registration record
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('payment_hash', hash)
      .single();

    if (fetchError || !registration) {
      const status = fetchError?.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: fetchError?.message || 'Registration not found' }, { status });
    }

    // 2. If already paid in DB, just return success
    if (registration.status === 'paid') {
      return NextResponse.json({ status: 'PAID', handle: `${registration.name}@tellit.id` });
    }

    // 3. Check status via Blink API
    const blinkStatus = await checkBlinkInvoiceStatus(hash);

    if (blinkStatus === 'PAID') {
      // 4. Activate Handle: Update or insert into 'handles' table
      const { error: activateError } = await supabase
        .from('handles')
        .upsert({
          name: registration.name,
          pubkey: registration.pubkey,
          relays: ["wss://relay.damus.io", "wss://nos.lol"],
          created_at: new Date().toISOString() // Refresh the 1-year period
        }, { onConflict: 'name' });

      if (activateError) {
        throw new Error(`Failed to activate/renew handle: ${activateError.message}`);
      }

      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'paid' })
        .eq('payment_hash', hash);

      if (updateError) {
        console.warn('[NIP-05 Check Payment] Failed to update registration status:', updateError);
      }

      return NextResponse.json({ status: 'PAID', handle: `${registration.name}@tellit.id` });
    }

    return NextResponse.json({ status: blinkStatus });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Check Payment] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
