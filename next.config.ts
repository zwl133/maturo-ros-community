import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 社区挂在官网 maturo.cn/community 子路径下（Nginx 反代去掉前缀）
  basePath: "/community",
  // 关闭 Cache Components 与部分预渲染，避免预渲染 shell 提前发出导致
  // notFound()/redirect() 无法返回正确的 404/3xx 状态码（返回 200 空壳）
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
