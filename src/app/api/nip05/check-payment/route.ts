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
      // 4. Double check handle availability/ownership before activating
      // This prevents "overwriting" if someone else paid for the same name while this invoice was pending.
      const { data: existingHandle } = await supabase
        .from('handles')
        .select('pubkey, created_at')
        .eq('name', registration.name.toLowerCase())
        .single();

      if (existingHandle) {
        const expiresAt = new Date(new Date(existingHandle.created_at).setFullYear(new Date(existingHandle.created_at).getFullYear() + 1));
        const gracePeriodEnd = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
        const now = new Date();

        // If it's owned by someone else AND not released yet
        if (existingHandle.pubkey !== registration.pubkey && now < gracePeriodEnd) {
          // This is a rare edge case where two people paid for the same handle.
          // The first one to have their payment checked by the server wins.
          // We mark the registration as 'conflict' so admin can handle refund.
          await supabase
            .from('registrations')
            .update({ status: 'conflict' })
            .eq('payment_hash', hash);
          
          return NextResponse.json({ 
            status: 'ERROR', 
            error: `Handle was claimed by someone else just before your payment was processed. Please contact support with your payment hash: ${hash}` 
          });
        }
      }

      // 5. Activate/Renew Handle
      const defaultRelays = ["wss://relay.damus.io", "wss://nos.lol"];
      const { error: activateError } = await supabase
        .from('handles')
        .upsert({
          name: registration.name,
          pubkey: registration.pubkey,
          relays: (registration.relays && registration.relays.length > 0) ? registration.relays : defaultRelays,
          created_at: new Date().toISOString()
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
