/**
 * POST /api/admin/verify - 验证管理员 token
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return jsonResponse({ error: "缺少 token" }, 401);
    }

    if (!env.ADMIN_TOKEN_SECRET) {
      return jsonResponse({ error: "管理员配置缺失" }, 500);
    }

    const valid = await verifyToken(token, env.ADMIN_TOKEN_SECRET);
    if (!valid) {
      return jsonResponse({ error: "token 无效" }, 401);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: "验证失败" }, 500);
  }
}

async function verifyToken(token, secret) {
  const encoder = new TextEncoder();
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signature = base64UrlDecode(sigB64);
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(data));
}

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
