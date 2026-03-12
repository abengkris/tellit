import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateUsername } from '@/lib/nip05';
import { createBlinkInvoice } from '@/lib/blink';

const REGISTRATION_PRICE_SATS = 21000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const validation = validateUsername(name);
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  if (!supabase) {
    return NextResponse.json({ available: true, warning: 'Service temporarily limited' });
  }

  try {
    const { data } = await supabase
      .from('handles')
      .select('name')
      .eq('name', name.toLowerCase())
      .single();

    return NextResponse.json({ available: !data });
  } catch {
    return NextResponse.json({ available: true });
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

    if (!supabase) {
      return NextResponse.json({ error: 'NIP-05 registration is currently unavailable' }, { status: 503 });
    }

    // 1. Check if name is already taken in active handles
    const { data: existing } = await supabase
      .from('handles')
      .select('name')
      .eq('name', name.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // 2. Generate Lightning Invoice via Blink
    const memo = `NIP-05: ${name}@tellit.id`;
    const invoice = await createBlinkInvoice(REGISTRATION_PRICE_SATS, memo);

    if (!invoice || !invoice.paymentRequest) {
      throw new Error("Failed to generate invoice");
    }

    // 3. Save pending registration to Supabase
    const { error: regError } = await supabase
      .from('registrations')
      .insert({
        name: name.toLowerCase(),
        pubkey: pubkey,
        payment_hash: invoice.paymentHash,
        payment_request: invoice.paymentRequest,
        amount: REGISTRATION_PRICE_SATS,
        status: 'pending'
      });

    if (regError) {
      console.error('[NIP-05 Register] DB Error:', regError);
      return NextResponse.json({ error: 'Failed to record registration' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amount: REGISTRATION_PRICE_SATS
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NIP-05 Register] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
