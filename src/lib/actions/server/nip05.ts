"use server";

import { getSupabaseAdmin } from '@/lib/supabase';
import { validateUsername, calculateHandlePrice } from '@/lib/nip05';
import { createBlinkInvoice } from '@/lib/blink';
import { verifySession } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { verifyEvent, type NostrEvent } from 'nostr-tools';

/**
 * Server Action to check handle availability and user handle status.
 */
export async function getHandleStatusAction(name?: string, pubkey?: string) {
  if (!name && !pubkey) {
    return { error: 'Missing name or pubkey' };
  }

  try {
    const supabase = getSupabaseAdmin();

    if (pubkey) {
      const session = await verifySession();
      if (!session || session.pubkey !== pubkey) {
        return { error: 'Unauthorized' };
      }

      const { data: handles } = await supabase
        .from('handles')
        .select('name, created_at, relays, lightning_address, is_primary')
        .eq('pubkey', pubkey);
      
      const { data: pending } = await supabase
        .from('registrations')
        .select('name, amount, payment_request, payment_hash, created_at, status')
        .eq('pubkey', pubkey)
        .in('status', ['pending', 'expired', 'conflict', 'paid']);

      let pendingWithAvailability = pending || [];
      if (pending && pending.length > 0) {
        const pendingNames = pending.map(p => p.name.toLowerCase());
        const { data: takenHandles } = await supabase
          .from('handles')
          .select('name, pubkey')
          .in('name', pendingNames);

        pendingWithAvailability = pending.map(p => {
          const taken = takenHandles?.find(th => th.name === p.name.toLowerCase());
          const isTaken = taken && taken.pubkey !== pubkey;
          return { ...p, isTaken };
        });
      }
      
      return { 
        success: true,
        existingHandle: handles && handles.length > 0 ? `${handles[0].name}@tellit.id` : null,
        handles: handles?.map(h => `${h.name}@tellit.id`) || [],
        handleDetails: handles && handles.length > 0 ? handles[0] : null,
        allHandleDetails: handles || [],
        pendingRegistrations: pendingWithAvailability
      };
    }

    if (name) {
      const validation = validateUsername(name);
      if (!validation.valid) {
        return { available: false, error: validation.error };
      }

      const { data: handleData } = await supabase
        .from('handles')
        .select('name, created_at, pubkey')
        .eq('name', name.toLowerCase())
        .single();

      if (handleData) {
        const expiresAt = new Date(new Date(handleData.created_at).setFullYear(new Date(handleData.created_at).getFullYear() + 1));
        const gracePeriodEnd = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
        if (new Date() < gracePeriodEnd) {
          return { available: false, error: 'Handle already taken' };
        }
      }

      return { 
        available: true,
        price: calculateHandlePrice(name)
      };
    }
  } catch (err) {
    console.error('[NIP-05 Action Status] Error:', err);
    return { error: 'Internal server error' };
  }
}

/**
 * Server Action to start a handle registration.
 */
export async function registerHandleAction(name: string, pubkey: string, relays?: string[]) {
  try {
    if (!name || !pubkey) return { error: 'Missing required fields' };

    const session = await verifySession();
    if (!session || session.pubkey !== pubkey) return { error: 'Unauthorized' };

    const validation = validateUsername(name);
    if (!validation.valid) return { error: validation.error };

    const supabase = getSupabaseAdmin();

    // Generate Invoice
    const price = calculateHandlePrice(name);
    const memo = `NIP-05: ${name}@tellit.id`;
    const invoice = await createBlinkInvoice(price, memo);

    if (!invoice || !invoice.paymentRequest) throw new Error("Failed to generate invoice");

    // Save pending
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
      if (regError.code === '23505') return { error: 'Registration already in progress' };
      throw regError;
    }
    
    revalidatePath('/settings/handle');
    return { 
      success: true, 
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amount: price
    };
  } catch (err) {
    console.error('[NIP-05 Action Register] Error:', err);
    return { error: 'Internal server error' };
  }
}

/**
 * Server Action to update Lightning Address for a handle.
 */
export async function updateLightningAddressAction(signedEvent: NostrEvent) {
  try {
    if (!signedEvent || !verifyEvent(signedEvent)) return { error: 'Invalid authorization' };

    const handleTag = signedEvent.tags.find((t: string[]) => t[0] === 'handle');
    const addressTag = signedEvent.tags.find((t: string[]) => t[0] === 'lightning_address');
    
    if (!handleTag || !addressTag) return { error: 'Missing tags' };

    const handleName = handleTag[1];
    const address = addressTag[1];
    const pubkey = signedEvent.pubkey;

    const supabase = getSupabaseAdmin();

    const { data: handle } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (!handle || handle.pubkey !== pubkey) return { error: 'Unauthorized' };

    const { error } = await supabase
      .from('handles')
      .update({ lightning_address: address })
      .eq('name', handleName.toLowerCase());

    if (error) throw error;

    revalidatePath('/settings/handle');
    return { success: true, message: 'Lightning address updated' };
  } catch (err) {
    console.error('[NIP-05 Action LN] Error:', err);
    return { error: 'Internal server error' };
  }
}

/**
 * Server Action to update discovery relays for a handle.
 */
export async function updateRelaysAction(signedEvent: NostrEvent) {
  try {
    if (!signedEvent || !verifyEvent(signedEvent)) return { error: 'Invalid authorization' };

    const handleTag = signedEvent.tags.find((t: string[]) => t[0] === 'handle');
    const relaysTag = signedEvent.tags.find((t: string[]) => t[0] === 'relays');
    
    if (!handleTag || !relaysTag) return { error: 'Missing tags' };

    const handleName = handleTag[1];
    const relays = relaysTag.slice(1);
    const pubkey = signedEvent.pubkey;

    const supabase = getSupabaseAdmin();

    const { data: handle } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (!handle || handle.pubkey !== pubkey) return { error: 'Unauthorized' };

    const { error } = await supabase
      .from('handles')
      .update({ relays })
      .eq('name', handleName.toLowerCase());

    if (error) throw error;

    revalidatePath('/settings/handle');
    return { success: true, message: 'Discovery relays updated' };
  } catch (err) {
    console.error('[NIP-05 Action Relays] Error:', err);
    return { error: 'Internal server error' };
  }
}

/**
 * Server Action to cancel a pending registration.
 */
export async function cancelRegistrationAction(signedEvent: NostrEvent) {
  try {
    if (!signedEvent || !verifyEvent(signedEvent)) return { error: 'Invalid authorization' };

    const hashTag = signedEvent.tags.find((t: string[]) => t[0] === 'payment_hash');
    if (!hashTag) return { error: 'Missing payment_hash' };

    const hash = hashTag[1];
    const pubkey = signedEvent.pubkey;

    const supabase = getSupabaseAdmin();

    const { data: reg } = await supabase
      .from('registrations')
      .select('pubkey, status')
      .eq('payment_hash', hash)
      .single();

    if (!reg || reg.pubkey !== pubkey) return { error: 'Unauthorized' };
    if (reg.status === 'paid') return { error: 'Cannot cancel paid registration' };

    await supabase.from('registrations').delete().eq('payment_hash', hash);

    revalidatePath('/settings/handle');
    return { success: true };
  } catch (err) {
    console.error('[NIP-05 Action Cancel] Error:', err);
    return { error: 'Internal server error' };
  }
}

/**
 * Server Action to transfer a handle to another pubkey.
 */
export async function transferHandleAction(signedEvent: NostrEvent) {
  try {
    if (!signedEvent || !verifyEvent(signedEvent)) return { error: 'Invalid authorization' };

    const handleTag = signedEvent.tags.find((t: string[]) => t[0] === 'handle');
    const newPubkeyTag = signedEvent.tags.find((t: string[]) => t[0] === 'new_pubkey');
    
    if (!handleTag || !newPubkeyTag) return { error: 'Missing tags' };

    const handleName = handleTag[1];
    const newPubkey = newPubkeyTag[1];
    const currentPubkey = signedEvent.pubkey;

    const supabase = getSupabaseAdmin();

    const { data: handle } = await supabase
      .from('handles')
      .select('pubkey')
      .eq('name', handleName.toLowerCase())
      .single();

    if (!handle || handle.pubkey !== currentPubkey) return { error: 'Unauthorized' };

    const { error } = await supabase
      .from('handles')
      .update({ pubkey: newPubkey, is_primary: false })
      .eq('name', handleName.toLowerCase());

    if (error) throw error;

    revalidatePath('/settings/handle');
    revalidatePath(`/${currentPubkey}`);
    revalidatePath(`/${newPubkey}`);
    
    return { success: true, message: `Handle transferred to ${newPubkey}` };
  } catch (err) {
    console.error('[NIP-05 Action Transfer] Error:', err);
    return { error: 'Internal server error' };
  }
}
