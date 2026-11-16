"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface ProfileEditorProps {
  handle: string;
  name: string;
  bio: string | null;
}

// 编辑资料（昵称 / 简介）
export default function ProfileEditor({ handle, name, bio }: ProfileEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!nameValue.trim()) {
      setError("昵称不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim(), bio: bioValue.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(data.error ?? "保存失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        编辑资料
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">编辑资料</h2>
            <p className="mt-1 text-sm text-ink-tertiary">@{handle}</p>

            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-ink-secondary">昵称</label>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-ink-secondary">个人简介</label>
                <textarea
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  maxLength={200}
                  rows={4}
                  placeholder="介绍一下你自己，比如技术方向、在做的事…"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="mt-1 text-right text-xs text-ink-tertiary">{bioValue.length}/200</div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border px-5 py-2 text-sm text-ink-secondary hover:border-primary hover:text-primary transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
