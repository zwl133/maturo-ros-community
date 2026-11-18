"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 加载/刷新验证码
  const loadCaptcha = useCallback(async () => {
    setCaptcha("");
    try {
      const res = await apiFetch("/api/auth/captcha");
      if (!res.ok) return;
      const id = res.headers.get("X-Captcha-Id");
      const svg = await res.text();
      if (id && svg) {
        setCaptchaId(id);
        // 转成 data URL，供 <img> 展示（SVG 直接内联可避免额外请求）
        setCaptchaSvg(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
      }
    } catch {
      // 验证码加载失败不阻断，注册时后端会校验
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !handle) return;
    if (!captcha) {
      setError("请输入验证码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, handle, name, captchaId, captcha }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/login?registered=1");
      } else {
        setError(data.error ?? "注册失败");
        // 验证码错误/过期时自动刷新一张新的
        if (data.code === "CAPTCHA_INVALID" || data.code === "CAPTCHA_REQUIRED") {
          loadCaptcha();
        }
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-bold">出</span>
          <span className="text-lg font-semibold text-ink">注册</span>
        </div>
        <p className="mt-2 text-sm text-ink-secondary">加入出云 ROS 机器人社区，分享你的机器人项目</p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="用户名（3-20位字母数字下划线）"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称（可选）"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {/* 验证码 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              placeholder="验证码"
              maxLength={4}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm uppercase tracking-widest text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {captchaSvg ? (
              <img
                src={captchaSvg}
                alt="验证码"
                title="点击刷新"
                onClick={loadCaptcha}
                className="h-10 w-24 shrink-0 cursor-pointer rounded-lg border border-border sm:w-[120px]"
              />
            ) : (
              <button
                type="button"
                onClick={loadCaptcha}
                className="h-10 w-24 shrink-0 rounded-lg border border-border text-xs text-ink-tertiary sm:w-[120px]"
              >
                加载验证码
              </button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email || !password || !handle || !captcha}
            className="rounded-xl bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {loading ? "注册中…" : "注册"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-secondary">
          已有账号？{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover">去登录</Link>
        </p>
      </div>
    </div>
  );
}
