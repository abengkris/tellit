import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateUsername, calculateHandlePrice } from '@/lib/nip05';
import { createBlinkInvoice, checkBlinkInvoiceStatus } from '@/lib/blink';
import { verifyEvent } from 'nostr-tools';
import { verifySession } from '@/lib/dal';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  const pubkey = req.nextUrl.searchParams.get('pubkey');

  if (!name && !pubkey) {
    return Response.json({ error: 'Missing name or pubkey' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    if (pubkey) {
      // Secure check: Ensure requester owns the pubkey
      const session = await verifySession();
      if (!session || session.pubkey !== pubkey) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Fetch active handles
      const { data: handles } = await supabase
        .from('handles')
        .select('name, created_at, relays, lightning_address, is_primary')
        .eq('pubkey', pubkey);
      
      // Fetch pending, expired, or conflict registrations (unpaid or contested)
      const { data: pending } = await supabase
        .from('registrations')
        .select('name, amount, payment_request, payment_hash, created_at, status')
        .eq('pubkey', pubkey)
        .in('status', ['pending', 'expired', 'conflict', 'paid']);

      // Check if any pending names are now taken in the 'handles' table
      let pendingWithAvailability = pending || [];
      if (pending && pending.length > 0) {
        const pendingNames = pending.map(p => p.name.toLowerCase());
        const { data: takenHandles } = await supabase
          .from('handles')
          .select('name, pubkey')
          .in('name', pendingNames);

        pendingWithAvailability = pending.map(p => {
          const taken = takenHandles?.find(th => th.name === p.name.toLowerCase());
          // It's taken if it exists in handles and the owner is NOT this pubkey
          const isTaken = taken && taken.pubkey !== pubkey;
          return { ...p, isTaken };
        });
      }
      
      return Response.json({ 
        existingHandle: handles && handles.length > 0 ? `${handles[0].name}@tellit.id` : null,
        handles: handles?.map(h => `${h.name}@tellit.id`) || [],
        handleDetails: handles && handles.length > 0 ? handles[0] : null,
        allHandleDetails: handles || [],
        pendingRegistrations: pendingWithAvailability
      });
    }

    if (!name) {
      return Response.json({ error: 'Missing name' }, { status: 400 });
    }

    const validation = validateUsername(name);
    if (!validation.valid) {
      return Response.json({ available: false, error: validation.error });
    }

    // 1. Check active handles
    const { data: handleData, error: handleErr } = await supabase
      .from('handles')
      .select('name, created_at, pubkey')
      .eq('name', name.toLowerCase())
      .single();

    if (handleErr && handleErr.code !== 'PGRST116') {
      throw new Error(`Database error (handles): ${handleErr.message}`);
    }

    if (handleData) {
      const expiresAt = new Date(new Date(handleData.created_at).setFullYear(new Date(handleData.created_at).getFullYear() + 1));
      const gracePeriodEnd = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
      if (new Date() < gracePeriodEnd) {
        return Response.json({ available: false, error: 'Handle already taken' });
      }
    }

    // 2. Check pending registrations (reservation logic)
    const { data: regData, error: regErr } = await supabase
      .from('registrations')
      .select('status, created_at, payment_hash, pubkey')
      .eq('name', name.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (regErr) {
      throw new Error(`Database error (registrations): ${regErr.message}`);
    }

    if (regData && regData.length > 0) {
      for (const reg of regData) {
        // If it's less than 24 hours old, check status with Blink
        const createdAt = new Date(reg.created_at);
        const now = new Date();
        const isExpiredLocally = (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000);

        if (!isExpiredLocally) {
          try {
            const blinkStatus = await checkBlinkInvoiceStatus(reg.payment_hash);
            if (blinkStatus === 'PAID') {
              return Response.json({ available: false, error: 'Handle already taken (payment processing)' });
            }
            if (blinkStatus === 'PENDING') {
              return Response.json({ 
                available: false, 
                error: 'Handle is currently reserved by another user (pending payment)' 
              });
            }
          } catch (err) {
            console.error('[NIP-05 Register Availability] Blink check failed:', err);
            // Fallback to locally "reserved" if Blink check fails
            return Response.json({ 
              available: false, 
              error: 'Handle is currently reserved' 
            });
          }
        }
      }
    }

    return Response.json({ 
      available: true,
      price: calculateHandlePrice(name)
    });
  } catch (err) {
    console.error('[NIP-05 Register Availability] Catch Error:', err);
    const message = err instanceof Error ? err.message : 'Service temporarily limited';
    return Response.json({ available: false, error: message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pubkey, relays } = body;

    if (!name || !pubkey) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Secure check: Ensure requester owns the pubkey
    const session = await verifySession();
    if (!session || session.pubkey !== pubkey) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const validation = validateUsername(name);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Check active handles
    const { data: existingHandle } = await supabase
      .from('handles')
      .select('name, pubkey, created_at')
      .eq('name', name.toLowerCase())
      .single();

    if (existingHandle) {
      const expiresAt = new Date(new Date(existingHandle.created_at).setFullYear(new Date(existingHandle.created_at).getFullYear() + 1));
      const gracePeriodEnd = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
      const now = new Date();

      if (existingHandle.pubkey !== pubkey && now < gracePeriodEnd) {
        return Response.json({ error: 'Username already taken.' }, { status: 409 });
      }
    }

    // 2. Check pending registrations (reservation logic)
    const { data: regData } = await supabase
      .from('registrations')
      .select('status, created_at, payment_hash, pubkey')
      .eq('name', name.toLowerCase())
      .eq('status', 'pending');

    if (regData && regData.length > 0) {
      for (const reg of regData) {
        // If it's another user's pending unexpired registration
        if (reg.pubkey !== pubkey) {
          const createdAt = new Date(reg.created_at);
          const now = new Date();
          const isExpiredLocally = (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000);

          if (!isExpiredLocally) {
            try {
              const blinkStatus = await checkBlinkInvoiceStatus(reg.payment_hash);
              if (blinkStatus === 'PAID' || blinkStatus === 'PENDING') {
                return Response.json({ 
                  error: 'Handle is currently reserved by another user. Please try again in 24 hours.' 
                }, { status: 409 });
              }
            } catch (err) {
              console.error('[NIP-05 Register POST] Blink check error:', err);
              return Response.json({ error: 'Handle is currently reserved.' }, { status: 409 });
            }          }
        }
      }
    }

    // 3. Generate Lightning Invoice via Blink
    const price = calculateHandlePrice(name);
    const memo = `NIP-05: ${name}@tellit.id`;
    const invoice = await createBlinkInvoice(price, memo);

    if (!invoice || !invoice.paymentRequest) {
      throw new Error("Failed to generate Lightning invoice via Blink");
    }

    // 4. Save pending registration to Supabase
    const defaultRelays = ["wss://relay.damus.io", "wss://nos.lol"];
    const { error: regError } = await supabase
      .from('registrations')
      .insert({
        name: name.toLowerCase(),
        pubkey: pubkey,
        relays: (relays && relays.length > 0) ? relays : defaultRelays,
        payment_hash: invoice.paymentHash,
        payment_request: invoice.paymentRequest,
        amount: price,
        status: 'pending'
      });

    if (regError) {
      console.error('[NIP-05 Register] DB Error:', regError);
      if (regError.code === '23505') { // Unique violation
        return Response.json({ error: 'A registration for this handle is already in progress' }, { status: 409 });
      }
      return Response.json({ error: `Database error: ${regError.message}` }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amount: price
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Register] Error:', err);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * Cancel a pending registration.
 * Kind: 4448
 * Tags: [["payment_hash", "..."]]
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { event } = body;

    if (!event || !verifyEvent(event)) {
      return Response.json({ error: 'Invalid or missing signed event' }, { status: 400 });
    }

    const hashTag = event.tags.find((t: string[]) => t[0] === 'payment_hash');
    if (!hashTag) {
      return Response.json({ error: 'Missing payment_hash tag' }, { status: 400 });
    }

    const hash = hashTag[1];
    const pubkey = event.pubkey;

    const supabase = getSupabaseAdmin();

    // 1. Verify ownership and status
    const { data: registration } = await supabase
      .from('registrations')
      .select('pubkey, status')
      .eq('payment_hash', hash)
      .single();

    if (!registration || registration.pubkey !== pubkey) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (registration.status === 'paid') {
      return Response.json({ error: 'Cannot cancel a paid registration' }, { status: 400 });
    }

    // 2. Delete the record
    const { error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .eq('payment_hash', hash);

    if (deleteError) throw deleteError;

    return Response.json({ success: true, message: 'Registration cancelled' });

  } catch (err) {
    console.error('[NIP-05 Register DELETE] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Regenerate an invoice for an expired pending registration.
 * Kind: 4449
 * Tags: [["payment_hash", "old_hash"]]
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { event } = body;

    if (!event || !verifyEvent(event)) {
      return Response.json({ error: 'Invalid or missing signed event' }, { status: 400 });
    }

    const hashTag = event.tags.find((t: string[]) => t[0] === 'payment_hash');
    if (!hashTag) {
      return Response.json({ error: 'Missing payment_hash tag' }, { status: 400 });
    }

    const oldHash = hashTag[1];
    const pubkey = event.pubkey;

    const supabase = getSupabaseAdmin();

    // 1. Fetch old registration
    const { data: registration } = await supabase
      .from('registrations')
      .select('*')
      .eq('payment_hash', oldHash)
      .single();

    if (!registration || registration.pubkey !== pubkey) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Generate New Invoice
    const price = calculateHandlePrice(registration.name);
    const memo = `NIP-05 (Renew Invoice): ${registration.name}@tellit.id`;
    const invoice = await createBlinkInvoice(price, memo);

    if (!invoice || !invoice.paymentRequest) {
      throw new Error("Failed to generate new Lightning invoice");
    }

    // 3. Update record with new invoice and reset status to pending
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        payment_hash: invoice.paymentHash,
        payment_request: invoice.paymentRequest,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .eq('payment_hash', oldHash);

    if (updateError) throw updateError;

    return Response.json({ 
      success: true, 
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amount: price
    });

  } catch (err) {
    console.error('[NIP-05 Register PATCH] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
