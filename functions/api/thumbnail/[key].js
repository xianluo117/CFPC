/**
 * GET /api/thumbnail/:key - 获取缩略图
 * 优先返回存储的缩略图，如果不存在则返回原图并通过 CF Image Resizing 缩放
 */
export async function onRequestGet(context) {
  const { env, params, request } = context;
  const key = params.key;

  if (!key) {
    return new Response(JSON.stringify({ error: "缺少图片 key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 尝试获取存储的缩略图
    const thumbKey = `thumb/${key}`;
    let object = await env.IMAGES_BUCKET.get(thumbKey);

    // 如果没有缩略图，返回原图
    if (!object) {
      object = await env.IMAGES_BUCKET.get(key);
    }

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
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "获取缩略图失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
