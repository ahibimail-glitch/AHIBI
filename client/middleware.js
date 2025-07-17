const { NextResponse } = require('next/server');

function middleware(request) {
  // Protect /admin except /admin/auth/login
  if (request.nextUrl.pathname.startsWith('/admin') && 
      request.nextUrl.pathname !== '/admin/login') {
    // Check for token in cookies (for SSR)
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      // If no token, redirect to login
      const url = new URL('/admin/login', request.url);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

// Export the middleware
module.exports = {
  middleware,
  config: {
    matcher: ['/admin/:path*'],
  },
};
