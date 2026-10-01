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
    path === "/studio" || path.startsWith("/studio/") || path.startsWith("/preview/") ||
    path === "/preview" ||
    path.startsWith("/edit/")
  );
}
export function safeNext(value) {
  return typeof value === "string" && /^\/(?![\/\\])/.test(value)
    ? value
    : "/edit";
}
async function passwordRecord(env) { return env.DESARTLY_AUTH ? await env.DESARTLY_AUTH.get("owner-password", "json") : null; }
async function passwordHash(password,salt) {
  const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  return base64(await crypto.subtle.deriveBits({name:"PBKDF2",salt:encoder.encode(salt),iterations:100000,hash:"SHA-256"},material,256));
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
      data.version === ((await passwordRecord(env))?.version) &&
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
  if (!["/api/owner/login","/api/owner/password"].includes(path)) return json({ error: "Not found" }, 404);
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
  let password, newPassword;
  try {
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      buffer.set(part, offset);
      offset += part.length;
    }
    ({password,newPassword} = JSON.parse(new TextDecoder().decode(buffer)));
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (typeof password !== "string")
    return json({ error: "Invalid credentials" }, 401);
  if(path === "/api/owner/password" && !(await isOwner(request,env))) return json({error:"Sign in before changing your password."},401);
  const record=await passwordRecord(env);
  const expectedPassword=record?record.hash:env.OWNER_PASSWORD;
  const providedPassword=record?await passwordHash(password,record.salt):password;
  // WebCrypto verification compares the HMAC signatures, not password strings.
  const expected = await crypto.subtle.sign(
    "HMAC",
    await key(env.OWNER_SESSION_SECRET),
    encoder.encode(expectedPassword),
  );
  const correct = await crypto.subtle.verify(
    "HMAC",
    await key(env.OWNER_SESSION_SECRET),
    expected,
    encoder.encode(providedPassword),
  );
  if (!correct) return json({ error: "Invalid credentials" }, 401);
  if(path === "/api/owner/password") {
    if(!env.DESARTLY_AUTH) return json({error:"Password storage is not configured."},503);
    if(typeof newPassword!=="string" || newPassword.length<12 || newPassword.length>256) return json({error:"Use a password between 12 and 256 characters."},400);
    const salt=base64(crypto.getRandomValues(new Uint8Array(24)));
    await env.DESARTLY_AUTH.put("owner-password",JSON.stringify({salt,hash:await passwordHash(newPassword,salt),version:crypto.randomUUID()}));
    return json({ok:true},200,{"Set-Cookie":`${COOKIE}=; Max-Age=0; ${cookieAttrs}`});
  }
  const body = base64(
    encoder.encode(
      JSON.stringify({
        role: "owner",
        version: record?.version,
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
