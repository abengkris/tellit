import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * LNURL Pay proxy for Tell it! handles.
 * Maps <username>@tellit.id to their registered Lightning Address.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data: handle } = await supabase
      .from('handles')
      .select('lightning_address')
      .eq('name', username.toLowerCase())
      .single();

    if (!handle || !handle.lightning_address) {
      return Response.json({ error: 'Lightning Address not found for this handle' }, { status: 404 });
    }

    // A Lightning Address is user@domain.com
    // The LNURL Pay endpoint for it is domain.com/.well-known/lnurlp/user
    const [user, domain] = handle.lightning_address.split('@');
    
    if (!user || !domain) {
      return Response.json({ error: 'Invalid Lightning Address configured' }, { status: 500 });
    }

    const targetUrl = `https://${domain}/.well-known/lnurlp/${user}`;
    
    // Redirect to the actual LNURL provider
    return Response.redirect(targetUrl);

  } catch (err) {
    console.error('[LNURL Proxy] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
