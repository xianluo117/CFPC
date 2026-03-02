/**
 * POST /api/upload - 上传图片
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse(
        { error: "请使用 multipart/form-data 格式上传" },
        400,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const tagsRaw = formData.get("tags");

    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: "未找到文件" }, 400);
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse(
        { error: "不支持的文件格式，仅支持 JPG/PNG/GIF/WebP" },
        400,
      );
    }

    // 验证文件大小 (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return jsonResponse({ error: "文件大小不能超过 10MB" }, 400);
    }

    // 生成唯一文件名
    const ext = file.name.split(".").pop().toLowerCase();
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const key = `${timestamp}-${randomId}.${ext}`;

    // 解析标签
    const defaultTags = [
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
    let tags = [];
    try {
      tags = tagsRaw ? JSON.parse(tagsRaw) : [];
    } catch {
      tags = [];
    }
    tags = Array.from(new Set(tags.filter((t) => defaultTags.includes(t))));
    if (tags.length === 0) tags = ["正经"];

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();

    // 存储原图到 R2
    await env.IMAGES_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        size: String(file.size),
        tags: JSON.stringify(tags),
      },
    });

    // 生成缩略图并存储
    const thumbnailKey = `thumb/${key}`;
    const thumbnail = await generateThumbnail(arrayBuffer, file.type);
    await env.IMAGES_BUCKET.put(thumbnailKey, thumbnail, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return jsonResponse({
      success: true,
      key: key,
      name: file.name,
      size: file.size,
      tags: tags,
    });
  } catch (err) {
    return jsonResponse({ error: "上传失败: " + err.message }, 500);
  }
}

/**
 * 生成缩略图 - 使用 Canvas API (OffscreenCanvas)
 * 在 Workers 环境中使用简单的缩放方式
 */
async function generateThumbnail(arrayBuffer, mimeType) {
  // Workers 环境没有 Canvas API，使用 Cloudflare Image Resizing 或直接存储
  // 这里我们通过 cf.image 属性利用 Cloudflare 的图片变换功能
  // 如果不可用，则存储原图作为缩略图（前端通过 CSS 控制显示大小）

  // 简化方案：直接返回原图数据，缩略图通过 Cloudflare Image Resizing 在请求时动态生成
  // 或者通过前端 CSS object-fit 来处理
  return arrayBuffer;
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
