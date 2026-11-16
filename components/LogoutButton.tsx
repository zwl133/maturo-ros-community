"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="text-sm text-ink-tertiary hover:text-danger transition-colors"
      title="退出登录"
    >
      {loading ? "..." : "退出"}
    </button>
  );
}
