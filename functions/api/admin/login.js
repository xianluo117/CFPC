/**
 * POST /api/admin/login - 管理员登录
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const username = (body?.username || "").trim();
    const password = (body?.password || "").trim();

    if (!username || !password) {
      return jsonResponse({ error: "请输入用户名和密码" }, 400);
    }

    if (!env.ADMIN_USER || !env.ADMIN_PASSWORD || !env.ADMIN_TOKEN_SECRET) {
      return jsonResponse({ error: "管理员配置缺失" }, 500);
    }

    if (username !== env.ADMIN_USER || password !== env.ADMIN_PASSWORD) {
      return jsonResponse({ error: "用户名或密码错误" }, 401);
    }

    const token = await signToken(
      {
        sub: username,
        iat: Date.now(),
      },
      env.ADMIN_TOKEN_SECRET,
    );

    return jsonResponse({ token });
  } catch (err) {
    return jsonResponse({ error: "登录失败: " + err.message }, 500);
  }
}

async function signToken(payload, secret) {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureBase64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature)),
  );
  return `${data}.${signatureBase64}`;
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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
