const encoder = new TextEncoder();
const COOKIE = "pol_owner";
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
const base64 = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
function unbase64(value) {
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
async function key(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function sign(value, secret) {
  return base64(
    await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(value)),
  );
}
export function ownerPath(path) {
  return (
    /\/(edit|new)\/?$/.test(path) ||
    path === "/admin" ||
    path === "/preview" ||
    path.startsWith("/edit/")
  );
}
export function safeNext(value) {
  return typeof value === "string" && /^\/(?![\/\\])/.test(value)
    ? value
    : "/edit";
}
export async function isOwner(request, env) {
  if (!env.OWNER_SESSION_SECRET) return false;
  try {
    const token = request.headers
      .get("Cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1);
    if (!token) return false;
    const [body, sig] = token.split(".");
    if (!body || !sig) return false;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(env.OWNER_SESSION_SECRET),
      unbase64(sig),
      encoder.encode(body),
    );
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(unbase64(body)));
    return (
      data.role === "owner" &&
      data.exp > Date.now() &&
      data.origin === new URL(request.url).origin
    );
  } catch {
    return false;
  }
}
export async function authResponse(request, env) {
  const url = new URL(request.url),
    path = url.pathname;
  if (!path.startsWith("/api/owner/")) return null;
  if (path === "/api/owner/session" && request.method === "GET")
    return json({ authenticated: await isOwner(request, env) });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  if (request.headers.get("Origin") !== url.origin)
    return json({ error: "Request origin rejected" }, 403);
  const cookieAttrs = `Path=/; HttpOnly; SameSite=Strict${url.protocol === "https:" ? "; Secure" : ""}`;
  if (path === "/api/owner/logout")
    return json({ ok: true }, 200, {
      "Set-Cookie": `${COOKIE}=; Max-Age=0; ${cookieAttrs}`,
    });
  if (path !== "/api/owner/login") return json({ error: "Not found" }, 404);
  if (
    !env.OWNER_PASSWORD ||
    !env.OWNER_SESSION_SECRET ||
    !env.OWNER_RATE_LIMITER
  )
    return json(
      { error: "Owner access has not been configured on this server." },
      503,
    );
  const { success } = await env.OWNER_RATE_LIMITER.limit({
    key: "pol-owner-login",
  });
  if (!success)
    return json({ error: "Too many attempts. Try again in a minute." }, 429);
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    return json({ error: "Expected JSON" }, 415);
  // Bound the streamed body; Content-Length is not trusted.
  const reader = request.body?.getReader();
  let size = 0,
    parts = [];
  if (!reader) return json({ error: "Missing password" }, 400);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      return json({ error: "Request too large" }, 413);
    }
    parts.push(value);
  }
  let password;
  try {
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      buffer.set(part, offset);
      offset += part.length;
    }
    password = JSON.parse(new TextDecoder().decode(buffer)).password;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (typeof password !== "string")
    return json({ error: "Invalid credentials" }, 401);
  // WebCrypto verification compares the HMAC signatures, not password strings.
  const expected = await crypto.subtle.sign(
    "HMAC",
    await key(env.OWNER_SESSION_SECRET),
    encoder.encode(env.OWNER_PASSWORD),
  );
  const correct = await crypto.subtle.verify(
    "HMAC",
    await key(env.OWNER_SESSION_SECRET),
    expected,
    encoder.encode(password),
  );
  if (!correct) return json({ error: "Invalid credentials" }, 401);
  const body = base64(
    encoder.encode(
      JSON.stringify({
        role: "owner",
        origin: url.origin,
        exp: Date.now() + 8 * 60 * 60 * 1000,
        nonce: crypto.randomUUID(),
      }),
    ),
  );
  return json({ ok: true }, 200, {
    "Set-Cookie": `${COOKIE}=${body}.${await sign(body, env.OWNER_SESSION_SECRET)}; Max-Age=28800; ${cookieAttrs}`,
  });
}
