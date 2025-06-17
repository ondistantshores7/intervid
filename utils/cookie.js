import { SignJWT, jwtVerify } from "jose";

const maxAge = 60 * 60 * 24 * 7; // one week

export async function createCookie(secret) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${maxAge}s`)
    .sign(new TextEncoder().encode(secret));
  return `session=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Lax`;
}

export async function verifyCookie(cookie, secret) {
  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(secret));
    return !!payload;
  } catch {
    return false;
  }
}
