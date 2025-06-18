import { verifyCookie } from "../utils/cookie";

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  // The /login route is always accessible
  if (url.pathname === "/login") {
    return next();
  }

  // Check for the session cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match && match[1];
  const isVerified = token && (await verifyCookie(token, env.ADMIN_PASSWORD));

  if (!isVerified) {
    // If the cookie is not valid, handle API and page requests differently
    if (url.pathname.startsWith("/api/")) {
      // For API routes, return a 401 Unauthorized error
      return new Response("Unauthorized", { status: 401 });
    } else {
      // For all other pages, redirect to the login page
      return Response.redirect(`${url.origin}/login`, 302);
    }
  }

  // If the cookie is valid, proceed to the requested route
  return next();
};
