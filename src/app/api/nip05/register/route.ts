import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateUsername, calculateHandlePrice } from '@/lib/nip05';
import { createBlinkInvoice } from '@/lib/blink';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  const pubkey = searchParams.get('pubkey');

  if (!name && !pubkey) {
    return NextResponse.json({ error: 'Missing name or pubkey' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // If pubkey is provided, check handles and pending registrations
    if (pubkey) {
      // Fetch active handles
      const { data: handles } = await supabase
        .from('handles')
        .select('name, created_at, relays, lightning_address, is_primary')
        .eq('pubkey', pubkey);
      
      // Fetch pending registrations (unpaid)
      const { data: pending } = await supabase
        .from('registrations')
        .select('name, amount, payment_request, payment_hash, created_at')
        .eq('pubkey', pubkey)
        .eq('status', 'pending');
      
      return NextResponse.json({ 
        existingHandle: handles && handles.length > 0 ? `${handles[0].name}@tellit.id` : null,
        handles: handles?.map(h => `${h.name}@tellit.id`) || [],
        handleDetails: handles && handles.length > 0 ? handles[0] : null,
        allHandleDetails: handles || [],
        pendingRegistrations: pending || []
      });
    }

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const validation = validateUsername(name);
    if (!validation.valid) {
      return NextResponse.json({ available: false, error: validation.error });
    }
    const { data, error } = await supabase
      .from('handles')
      .select('name, created_at')
      .eq('name', name.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "JSON object requested, but no rows returned"
      console.error('[NIP-05 Register Availability] DB Error:', error);
      return NextResponse.json({ available: false, error: 'Database error occurred' });
    }

    let available = !data;
    
    // If handle exists, check if it's past grace period
    if (data) {
      const expiresAt = new Date(new Date(data.created_at).setFullYear(new Date(data.created_at).getFullYear() + 1));
      const gracePeriodEnd = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
      if (new Date() > gracePeriodEnd) {
        available = true;
      }
    }

    return NextResponse.json({ 
      available,
      price: calculateHandlePrice(name)
    });
  } catch (err) {
    console.error('[NIP-05 Register Availability] Catch Error:', err);
    const message = err instanceof Error ? err.message : 'Service temporarily limited';
    return NextResponse.json({ available: false, error: message });
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

    const supabase = getSupabaseAdmin();

    // 2. Check if name is already taken in active handles
    const { data: existingHandle, error: checkError } = await supabase
      .from('handles')
      .select('name, pubkey, created_at')
      .eq('name', name.toLowerCase())
      .single();

    if (existingHandle) {
      const expiresAt = new Date(new Date(existingHandle.created_at).setFullYear(new Date(existingHandle.created_at).getFullYear() + 1));
      const gracePeriodEnd = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
      const now = new Date();

      // Block only if:
      // 1. It's not owned by the requester AND
      // 2. It's not past the grace period
      if (existingHandle.pubkey !== pubkey && now < gracePeriodEnd) {
        return NextResponse.json({ 
          error: 'Username already taken and within grace period.' 
        }, { status: 409 });
      }
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Database check failed: ${checkError.message}`);
    }

    // 2. Generate Lightning Invoice via Blink
    const price = calculateHandlePrice(name);
    const memo = `NIP-05: ${name}@tellit.id`;
    const invoice = await createBlinkInvoice(price, memo);

    if (!invoice || !invoice.paymentRequest) {
      throw new Error("Failed to generate Lightning invoice via Blink");
    }

    // 3. Save pending registration to Supabase
    const { error: regError } = await supabase
      .from('registrations')
      .insert({
        name: name.toLowerCase(),
        pubkey: pubkey,
        payment_hash: invoice.paymentHash,
        payment_request: invoice.paymentRequest,
        amount: price,
        status: 'pending'
      });

    if (regError) {
      console.error('[NIP-05 Register] DB Error:', regError);
      if (regError.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'A registration for this handle is already in progress' }, { status: 409 });
      }
      return NextResponse.json({ error: `Database error: ${regError.message}` }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amount: price
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Register] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
