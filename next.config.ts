import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 社区挂在官网 maturo.cn/community 子路径下（Nginx 反代去掉前缀）
  basePath: "/community",
  cacheComponents: true,
  partialPrefetching: true,
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
