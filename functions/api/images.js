/**
 * GET /api/images - 获取图片列表
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const url = new URL(request.url);
    const page = clampNumber(url.searchParams.get("page"), 1, 1, 100000);
    const pageSize = clampNumber(url.searchParams.get("pageSize"), 24, 1, 96);

    const listed = await env.IMAGES_BUCKET.list({
      prefix: "",
      limit: 1000,
    });

    // 过滤掉缩略图 (thumb/ 前缀)
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

    const total = images.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pagedImages = images.slice(start, start + pageSize);

    return new Response(JSON.stringify({
      images: pagedImages,
      total,
      page: safePage,
      pageSize,
      totalPages,
    }), {
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

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseTags(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
