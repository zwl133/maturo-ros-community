import { cookies } from "next/headers";
import { getUserBySessionToken } from "@/lib/services/auth-service";

const SESSION_COOKIE = "chuyun_session";
// 与 next.config.ts 的 basePath 保持一致，cookie 只对社区子路径生效
const COOKIE_PATH = process.env.COOKIE_PATH ?? "/community";

// 从请求 cookie 获取当前登录用户（无则返回 null）
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

// 设置会话 cookie（登录成功后调用）
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60, // 7 天
  });
}

// 清除会话 cookie（登出）
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
