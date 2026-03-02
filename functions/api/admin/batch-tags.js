/**
 * POST /api/admin/batch-tags - 批量更新图片标签
 * body: { keys: string[], tags: string[] }
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const token = getBearerToken(request);
    if (!token) {
      return jsonResponse({ error: "未授权" }, 401);
    }
    if (!env.ADMIN_TOKEN_SECRET) {
      return jsonResponse({ error: "管理员配置缺失" }, 500);
    }
    const valid = await verifyToken(token, env.ADMIN_TOKEN_SECRET);
    if (!valid) {
      return jsonResponse({ error: "未授权" }, 401);
    }

    const body = await request.json();
    const keys = Array.isArray(body?.keys) ? body.keys : [];
    const tagsInput = Array.isArray(body?.tags) ? body.tags : [];

    if (keys.length === 0) {
      return jsonResponse({ error: "未选择图片" }, 400);
    }

    const allowedTags = [
      "正经",
      "擦边",
      "cos服",
      "情趣",
      "上装",
      "下装",
      "连衣群",
      "袜子",
      "鞋子",
      "饰品",
    ];

    let tags = Array.from(
      new Set(tagsInput.filter((t) => allowedTags.includes(t))),
    );
    if (tags.length === 0) tags = ["正经"];

    const results = [];
    for (const key of keys) {
      const object = await env.IMAGES_BUCKET.get(key);
      if (!object) {
        results.push({ key, ok: false, error: "not_found" });
        continue;
      }

      await env.IMAGES_BUCKET.put(key, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: {
          ...(object.customMetadata || {}),
          tags: JSON.stringify(tags),
        },
      });

      results.push({ key, ok: true });
    }

    return jsonResponse({ ok: true, results, tags });
  } catch (err) {
    return jsonResponse({ error: "更新失败: " + err.message }, 500);
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
