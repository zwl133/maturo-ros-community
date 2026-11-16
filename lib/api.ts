// 统一 API 请求封装：自动拼接 basePath，避免手写 fetch 漏掉 /community 前缀

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/community";

// 拼接 API 路径（自动加 basePath 前缀）
export function apiPath(path: string): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

// 封装的 fetch：自动加 basePath，返回原始 Response
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiPath(path), init);
}
