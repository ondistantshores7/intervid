import { createCookie, verifyCookie } from "../utils/cookie";

export const onRequestGet = async ({ request }) => {
  // serve simple login form
  return new Response(`<!doctype html><html><body>
  <form method="POST">
    <input type="text" name="username" value="admin" autocomplete="username" style="display:none">
    <input name="password" type="password" placeholder="Password" autocomplete="current-password" />
    <button type="submit">Login</button>
  </form></body></html>`, { headers: { "Content-Type": "text/html" } });
};

export const onRequestPost = async ({ request, env }) => {
  const form = await request.formData();
  const password = form.get("password");
  if (password !== env.ADMIN_PASSWORD) {
    return new Response("Wrong password", { status: 401 });
  }
  const cookie = await createCookie(env.ADMIN_PASSWORD);
  return new Response(null, {
    status: 302,
    headers: { "Location": "/", "Set-Cookie": cookie },
  });
};
