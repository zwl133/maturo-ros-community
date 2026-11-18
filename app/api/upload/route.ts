import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// 允许的图片类型 → 扩展名映射（仅白名单）
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 100 * 1024; // 100KB 上限（前后端双重校验）
const MAX_COUNT = 15; // 单项目最多 15 张（由前端主要控制，此处仅作单次请求限制参考）

// 图片上传（需登录）：接收已压缩的 base64 图片，存服务器本地，返回可访问 URL
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { data?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const dataUrl = body.data;
  if (!dataUrl || typeof dataUrl !== "string") {
    return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
  }

  // 解析 data URL：data:image/jpeg;base64,xxxx
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: "不支持的图片格式，仅支持 JPG/PNG/WebP/GIF" }, { status: 400 });
  }

  const mime = match[1];
  const ext = MIME_EXT[mime];
  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return NextResponse.json({ error: "图片数据无效" }, { status: 400 });
  }

  // 大小校验（100KB 上限，兜底防前端绕过）
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `图片超过 100KB（当前 ${(buffer.byteLength / 1024).toFixed(0)}KB），请压缩后重试` },
      { status: 413 }
    );
  }
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "图片数据为空" }, { status: 400 });
  }

  // 生成唯一文件名，避免覆盖与路径穿越
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const relPath = path.join(uploadDir, filename);

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(relPath, buffer);
  } catch (e) {
    console.error("图片写入失败:", e);
    return NextResponse.json({ error: "图片保存失败，请稍后重试" }, { status: 500 });
  }

  // 返回可访问的 URL（含 basePath /community 前缀）
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/community";
  const url = `${basePath}/uploads/${filename}`;

  return NextResponse.json({ ok: true, url, size: buffer.byteLength }, { status: 201 });
}
