import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  
  // Get authentication token from cookies
  const token = request.cookies.get('auth-token')?.value;
  const doctorId = request.cookies.get('doctor-id')?.value;
  
  // Check if user is authenticated
  const isAuthenticated = !!(token && doctorId);
  
  // Define paths
  const isRootPage = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isDashboardPath = pathname.startsWith('/dashboard');
  const isProtectedPath = isDashboardPath || pathname.startsWith('/api');
  
  // Root page redirection
  if (isRootPage) {
    if (isAuthenticated) {
      url.pathname = '/dashboard/home';
      return NextResponse.redirect(url);
    } else {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }
  
  // If user is authenticated and tries to access login page, redirect to dashboard
  if (isAuthenticated && isLoginPage) {
    url.pathname = '/dashboard/home';
    return NextResponse.redirect(url);
  }
  
  // If user is not authenticated and tries to access protected paths, redirect to login
  if (!isAuthenticated && isProtectedPath && !pathname.startsWith('/api/auth')) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$).*)',
  ],
};
