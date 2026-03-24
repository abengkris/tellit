import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get('identifier');

  if (!identifier || !identifier.includes('@')) {
    return Response.json({ error: 'Invalid identifier' }, { status: 400 });
  }

  const [name, domain] = identifier.split('@');
  const url = `https://${domain}/.well-known/nostr.json?name=${name}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store' // Don't cache the proxy request to ensure fresh verification
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch NIP-05' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('NIP-05 Proxy Error:', error);
    return Response.json({ error: 'Network error' }, { status: 500 });
  }
}
