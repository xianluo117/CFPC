/**
 * GET /api/download/:key - 下载图片（Content-Disposition: attachment）
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

    const originalName = object.customMetadata?.originalName || key;
    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType || "application/octet-stream",
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    );
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "下载失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
