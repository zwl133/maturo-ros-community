import { NextResponse } from "next/server";
import { createCaptcha } from "@/lib/captcha";

// GET /api/auth/captcha —— 获取图形验证码
// 返回 SVG 图片（Content-Type: image/svg+xml），并把 captchaId 通过响应头返回
export async function GET() {
  const { id, svg } = createCaptcha();

  const res = new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "X-Captcha-Id": id,
    },
  });
  return res;
}
