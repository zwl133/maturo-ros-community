import { defineConfig } from "prisma/config";
import "dotenv/config";

// Prisma 7 配置：连接 URL 从 schema 移到此处
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // 与 lib/db.ts、prisma/seed.ts 保持一致：统一指向项目根 dev.db
    // （libsql 的 file: 相对运行时 cwd 解析，migrate 与 app 均为项目根）
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
