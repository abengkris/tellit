import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateUsername } from '@/lib/nip05';

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

    // Check if name taken
    const { data: existing } = await supabase
      .from('handles')
      .select('name')
      .eq('name', name.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Placeholder for Lightning Payment logic
    // In a real app, you would generate an invoice here and return it
    // For now, we'll return a "pending" registration or just success if we want to skip payment for testing
    
    // const invoice = await generateInvoice(21000, `NIP-05: ${name}@tellit.id`);
    
    // We would save to 'registrations' table here
    
    return NextResponse.json({ 
      success: true, 
      message: 'Registration logic initiated',
      price: 21000,
      // invoice: invoice.pr
    });

  } catch (err) {
    console.error('[NIP-05 Register] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
