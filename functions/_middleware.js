import { verifyCookie } from "../utils/cookie";

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api")) return next(); // APIs secure separately
  if (url.pathname === "/login") return next();

  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match && match[1];
  const ok = token && (await verifyCookie(token, env.ADMIN_PASSWORD));
  if (!ok) {
    return Response.redirect(`${url.origin}/login`, 302);
  }
  return next();
};
