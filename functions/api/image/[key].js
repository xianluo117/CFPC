/**
 * GET /api/image/:key - 获取原图
 * DELETE /api/image/:key - 删除图片
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const key = params.key;

  if (!key) {
    return new Response(JSON.stringify({ error: "缺少图片 key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const object = await env.IMAGES_BUCKET.get(key);
    if (!object) {
      return new Response(JSON.stringify({ error: "图片不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType || "image/jpeg",
    );
    headers.set("Cache-Control", "public, max-age=31536000");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "获取图片失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestDelete(context) {
  const { env, params, request } = context;
  const key = params.key;

  if (!key) {
    return new Response(JSON.stringify({ error: "缺少图片 key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const token = getBearerToken(request);
    if (!token) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!env.ADMIN_TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: "管理员配置缺失" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const valid = await verifyToken(token, env.ADMIN_TOKEN_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 删除原图和缩略图
    await env.IMAGES_BUCKET.delete(key);
    await env.IMAGES_BUCKET.delete(`thumb/${key}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "删除失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
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
