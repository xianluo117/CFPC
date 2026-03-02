/**
 * GET /api/images - 获取图片列表
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const listed = await env.IMAGES_BUCKET.list({
      prefix: "",
      limit: 1000,
    });

    // 过滤掉缩略图 (thumb/ 前缀)
    const url = new URL(request.url);
    const filterTags = (url.searchParams.get("tags") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const images = listed.objects
      .filter((obj) => !obj.key.startsWith("thumb/"))
      .map((obj) => ({
        key: obj.key,
        name: obj.customMetadata?.originalName || obj.key,
        size: parseInt(obj.customMetadata?.size || obj.size || 0),
        uploaded: obj.customMetadata?.uploadedAt || obj.uploaded,
        tags: parseTags(obj.customMetadata?.tags),
      }))
      .filter((img) => {
        if (filterTags.length === 0) return true;
        const set = new Set(img.tags || []);
        return filterTags.some((t) => set.has(t));
      })
      .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

    return new Response(JSON.stringify({ images }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "获取列表失败: " + err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

function parseTags(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
