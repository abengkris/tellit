import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Next.js 16 Proxy (formerly Middleware).
 * Used for optimistic route protection and redirects.
 *
 * Performance: Avoid database checks here. Use cookies for fast validation.
 */

// 1. Specify protected and public routes
const protectedRoutes = [
  '/settings',
  '/wallet',
  '/messages',
  '/notifications',
  '/bookmarks',
];

const publicOnlyRoutes = [
  '/login',
];

export async function proxy(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  
  // Check if any protected route matches the current path
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicOnlyRoute = publicOnlyRoutes.some(route => path.startsWith(route));

  // 3. Get the session from the cookie
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  // 4. Redirect to home (which shows login) if the user is not authenticated on a protected route
  if (isProtectedRoute && !session) {
    // For Nostr apps, usually the home page '/' handles the login UI if not logged in.
    // Or we could redirect to a specific /login page if it existed.
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // 5. Redirect to home if user is already authenticated on a public-only route
  if (isPublicOnlyRoute && session) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Proxy should not run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, robots.txt, sitemap.xml (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
