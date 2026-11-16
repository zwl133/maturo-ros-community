import { defineConfig } from "prisma/config";
import "dotenv/config";

// Prisma 7 配置：连接 URL 从 schema 移到此处
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
