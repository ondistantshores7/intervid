// A simple session verification. In a real app, you'd want to decode
// and validate the session token more robustly (e.g., check expiration).
async function verifySession(request) {
    const cookieHeader = request.headers.get("Cookie") || "";
    const match = cookieHeader.match(/session=([^;]+)/);
    return !!match; // Returns true if the session cookie exists, false otherwise.
}

export const onRequest = async ({ request, next }) => {
    const url = new URL(request.url);
    const { pathname } = url;

    // If the user is trying to access the login page or its assets, let them through.
    // Also allow the login API call and all embed-related paths.
    if (pathname === '/login' ||
        pathname === '/api/login' ||
        pathname === '/js/login.js' ||
        pathname === '/css/login.css' ||
        pathname.startsWith('/embed') ||
        pathname.includes('embed-player') ||
        pathname.startsWith('/api/embed') ||
        pathname.startsWith('/js/') ||
        pathname.startsWith('/css/') ||
        pathname.startsWith('/assets/')) {
        return next();
    }

    // For all other pages, check if the user has a valid session.
    // Temporarily disabled to allow access without session verification for testing.
    /*
    const isVerified = await verifySession(request);
    if (isVerified) {
        return next(); // User is logged in, proceed.
    }

    // If the user is not logged in, return a fallback response instead of redirecting to login.
    if (!isVerified) {
        return new Response('Access denied. Please contact support or ensure you are logged in.', { status: 403 });
    }
    */
    return next(); // Temporarily allow all requests through for testing.
};
