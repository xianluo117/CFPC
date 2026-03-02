/**
 * 全局中间件 - 处理 CORS 预检请求
 */
export async function onRequest(context) {
  const { request } = context;

  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 继续处理请求
  const response = await context.next();

  // 为所有响应添加 CORS 头
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");

  return newResponse;
}
