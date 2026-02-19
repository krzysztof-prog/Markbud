/**
 * Next.js Middleware - ochrona tras
 * Przekierowuje niezalogowanych użytkowników na /login
 * Sprawdza uprawnienia do chronionych tras
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@markbud/shared';

const TOKEN_KEY = 'auth_token';

/**
 * Strony publiczne (bez logowania)
 */
const PUBLIC_ROUTES = ['/login'];

/**
 * Mapa chronionych tras i wymaganych ról
 * Ścieżki sprawdzane są metodą startsWith(), więc:
 * - '/admin' chroni też '/admin/users', '/admin/settings' itd.
 */
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/admin': [UserRole.OWNER, UserRole.ADMIN],
  '/kierownik': [UserRole.OWNER, UserRole.ADMIN, UserRole.KIEROWNIK],
  '/importy': [UserRole.OWNER, UserRole.ADMIN],
  '/zestawienia/zlecenia': [UserRole.OWNER, UserRole.ADMIN, UserRole.KIEROWNIK, UserRole.USER],
  // Księgowa widzi TYLKO /zestawienia/miesieczne (nie /zestawienia/zlecenia)

  // Dashboard główny i operatora - tylko dla ADMIN/OWNER
  '/operator': [UserRole.OWNER, UserRole.ADMIN],
};

/**
 * Middleware - sprawdza czy użytkownik jest zalogowany i ma uprawnienia
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pozwól na dostęp do stron publicznych
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Sprawdź czy token istnieje w cookies
  const token = request.cookies.get(TOKEN_KEY)?.value;

  // Brak tokenu - przekieruj na /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sprawdź rolę użytkownika (fetch do API)
  // UWAGA: W produkcji rozważ użycie JWT decode zamiast fetch (szybsze)
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const userResponse = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      // Cache request (Next.js automatycznie cache'uje na czas request lifecycle)
      next: { revalidate: 60 } // Cache na 60s
    });

    if (!userResponse.ok) {
      // Token nieprawidłowy/wygasły - przekieruj na login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const user = await userResponse.json();

    // Specjalna logika dla dashboard głównego ("/")
    // Nieadmini są przekierowywani na /moja-praca
    if (pathname === '/') {
      const isAdmin = [UserRole.OWNER, UserRole.ADMIN].includes(user.role as UserRole);
      if (!isAdmin) {
        console.log(`[Middleware] Redirecting ${user.role} from / to /moja-praca`);
        return NextResponse.redirect(new URL('/moja-praca', request.url));
      }
    }

    // Sprawdź czy użytkownik ma dostęp do tej ścieżki
    for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(user.role as UserRole)) {
          // Brak uprawnień - przekieruj na /moja-praca (zamiast "/" aby uniknąć loop)
          console.warn(`[Middleware] User ${user.email} (${user.role}) tried to access ${pathname} but lacks permissions`);
          return NextResponse.redirect(new URL('/moja-praca', request.url));
        }
      }
    }

    // Użytkownik ma dostęp
    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Error checking user permissions:', error);
    // W przypadku błędu API - przekieruj na login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Konfiguracja matchera - które ścieżki mają być chronione
 * Używamy prostszego matchera dla lepszej kompatybilności z Next.js 15
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /_next (Next.js internals)
     * - /api (API routes - chronione przez backend)
     * - Static files
     */
    '/((?!_next|api|favicon.ico|.*\\.[\\w]+$).*)',
  ],
};
