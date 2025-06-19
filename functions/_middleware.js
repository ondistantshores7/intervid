import { verifyCookie } from "../utils/cookie";

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // ALWAYS allow these paths to be public (no authentication required)
  // Full permissive access for embedding
  if (path === '/login' || 
      path === '/' || // Also allow root path
      path.includes('embed') || // Allow ANY URL with 'embed' in it
      path.startsWith('/api/embed') || 
      path.startsWith('/js/') || 
      path.startsWith('/css/') ||
      path.startsWith('/assets/') ||
      path.startsWith('/fonts/') ||
      path.startsWith('/images/') ||
      path.endsWith('.html') || // Allow ALL html files
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.svg') ||
      path.endsWith('.ico') ||
      path.endsWith('.gif') ||
      path.endsWith('.woff') ||
      path.endsWith('.woff2') ||
      path.endsWith('.ttf')) {
    
    // For these paths, don't require authentication
    console.log('Public access granted to:', path);
    return next();
  }

  // For all other paths, require authentication
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match && match[1];
  const isVerified = token && (await verifyCookie(token, env.ADMIN_PASSWORD));

  if (!isVerified) {
    // If not authenticated and requesting an API endpoint
    if (path.startsWith("/api/")) {
      return new Response("Unauthorized", { status: 401 });
    } else {
      // For all other protected pages, redirect to login
      return Response.redirect(`${url.origin}/login`, 302);
    }
  }

  // If the cookie is valid, proceed to the requested route
  return next();
};
