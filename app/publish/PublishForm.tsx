"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const CATEGORIES = ["移动机器人", "机械臂", "无人机", "ROS2 入门", "SLAM 导航", "视觉", "仿真", "其他"];
const DIFFICULTIES = ["入门", "进阶", "硬核"];
const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "CERN-OHL-S", "CC-BY-SA-4.0", "CC-BY-NC-4.0"];
const TAG_OPTIONS = ["ROS2", "SLAM", "导航", "激光雷达", "机械臂", "MoveIt2", "视觉", "YOLO", "OpenCV", "PID", "仿真", "Gazebo", "传感器", "嵌入式", "树莓派"];

interface BomRow {
  designator: string;
  partNo: string;
  package: string;
  qty: number;
  unitPrice: number;
  note: string;
}

interface StepRow {
  order: number;
  title: string;
  content: string;
}

interface RepoRow {
  platform: "github" | "gitee";
  url: string;
}

interface MediaRow {
  type: "image" | "video";
  url: string;
  note: string;
}

// 编辑模式传入的初始数据（由服务端读取项目后传入）
export interface ProjectFormInitial {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  license: string;
  costEstimate: number;
  cover: string | null;
  repos: RepoRow[];
  media: MediaRow[];
  bom: BomRow[];
  steps: StepRow[];
}

export default function PublishForm({ initial }: { initial?: ProjectFormInitial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? DIFFICULTIES[0]);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [license, setLicense] = useState(initial?.license ?? "MIT");
  const [costEstimate, setCostEstimate] = useState(initial ? String(initial.costEstimate || "") : "");
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [repos, setRepos] = useState<RepoRow[]>(
    initial?.repos?.length ? initial.repos : [{ platform: "github", url: "" }]
  );
  const [media, setMedia] = useState<MediaRow[]>(
    initial?.media?.length ? initial.media : [{ type: "image", url: "", note: "" }]
  );
  const [bom, setBom] = useState<BomRow[]>(
    initial?.bom?.length
      ? initial.bom.map((b) => ({ ...b, qty: b.qty || 1, unitPrice: b.unitPrice || 0 }))
      : [{ designator: "", partNo: "", package: "", qty: 1, unitPrice: 0, note: "" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps?.length ? initial.steps : [{ order: 1, title: "", content: "" }]
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addBomRow = () => {
    setBom((prev) => [...prev, { designator: "", partNo: "", package: "", qty: 1, unitPrice: 0, note: "" }]);
  };
  const removeBomRow = (idx: number) => {
    setBom((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateBom = (idx: number, field: keyof BomRow, value: string | number) => {
    setBom((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { order: prev.length + 1, title: "", content: "" }]);
  };
  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  };
  const updateStep = (idx: number, field: keyof StepRow, value: string) => {
    setSteps((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addRepo = () => {
    setRepos((prev) => [...prev, { platform: "github", url: "" }]);
  };
  const removeRepo = (idx: number) => {
    setRepos((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateRepo = (idx: number, field: keyof RepoRow, value: string) => {
    setRepos((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value as RepoRow[typeof field] } : row)));
  };

  const addMedia = () => {
    setMedia((prev) => [...prev, { type: "image", url: "", note: "" }]);
  };
  const removeMedia = (idx: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateMedia = (idx: number, field: keyof MediaRow, value: string) => {
    setMedia((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value as MediaRow[typeof field] } : row)));
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("请填写项目标题");
      return;
    }
    if (!summary.trim()) {
      setError("请填写项目简介");
      return;
    }
    setLoading(true);
    setError("");

    const validBom = bom.filter((b) => b.partNo.trim() && b.designator.trim());
    const validSteps = steps.filter((s) => s.title.trim() && s.content.trim());

    // 组装附件：代码仓库链接 + 图片/视频
    const attachments = [
      ...repos
        .filter((r) => r.url.trim())
        .map((r) => ({
          name: r.platform === "github" ? "GitHub 仓库" : "Gitee 仓库",
          type: r.platform,
          url: r.url.trim(),
        })),
      ...media
        .filter((m) => m.url.trim())
        .map((m) => ({
          name: m.type === "image" ? "项目图片" : "演示视频",
          type: m.type,
          url: m.url.trim(),
          size: m.note.trim() || undefined,
        })),
    ];

    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        category,
        difficulty,
        tags,
        license,
        cover: cover.trim() || undefined,
        costEstimate: costEstimate ? Number(costEstimate) : 0,
        bom: validBom,
        steps: validSteps,
        attachments,
      };

      const url = isEdit ? `/api/projects/${initial!.slug}` : "/api/projects";
      const method = isEdit ? "PATCH" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login?redirect=/publish");
        return;
      }
      if (res.ok) {
        router.push(`/p/${data.slug}`);
        router.refresh();
      } else {
        setError(data.error ?? (isEdit ? "保存失败" : "发布失败"));
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-ink">{isEdit ? "编辑项目" : "发布项目"}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {isEdit ? "修改你的项目信息，保存后立即生效。" : "分享你的机器人项目，让技术成果被看见。"}
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {/* 基本信息 */}
          <Card title="基本信息">
            <Field label="项目标题 *">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：ROS2 双轮差速小车 · SLAM 导航"
                className={inputCls}
              />
            </Field>
            <Field label="项目简介 *">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="一句话说明这个项目做什么"
                rows={2}
                className={inputCls}
              />
            </Field>
            <Field label="详细介绍">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="详细介绍项目背景、技术方案、实现细节…"
                rows={6}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="分类 *">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="难度 *">
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="开源协议">
                <select value={license} onChange={(e) => setLicense(e.target.value)} className={inputCls}>
                  {LICENSES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="预估物料成本（元）">
                <input
                  type="number"
                  value={costEstimate}
                  onChange={(e) => setCostEstimate(e.target.value)}
                  placeholder="例如：899"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="封面图 URL（可选）">
              <input
                type="url"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                placeholder="例如：https://example.com/cover.jpg（支持外链图片）"
                className={inputCls}
              />
              {cover.trim() && (
                <p className="mt-2 text-xs text-ink-tertiary">
                  支持 JPG/PNG/WebP/GIF，建议 16:9 比例，用于列表卡片和详情页展示。
                </p>
              )}
            </Field>
          </Card>

          {/* 代码仓库 */}
          <Card title="代码仓库（可选）">
            <p className="mb-3 text-xs text-ink-tertiary">
              添加 GitHub 或 Gitee 仓库链接，方便他人查看源码和复刻。
            </p>
            <div className="flex flex-col gap-2">
              {repos.map((row, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <select
                    value={row.platform}
                    onChange={(e) => updateRepo(idx, "platform", e.target.value)}
                    className="h-10 w-24 shrink-0 rounded-xl border border-border bg-white px-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="github">GitHub</option>
                    <option value="gitee">Gitee</option>
                  </select>
                  <input
                    type="url"
                    value={row.url}
                    onChange={(e) => updateRepo(idx, "url", e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-border px-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => removeRepo(idx)}
                    disabled={repos.length <= 1}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-danger hover:bg-danger/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    删除
                  </button>
                </div>
              ))}
              <button onClick={addRepo} className="self-start text-sm text-primary hover:text-primary-hover">+ 添加仓库链接</button>
            </div>
          </Card>

          {/* 图片 / 视频 */}
          <Card title="项目图片 / 演示视频（可选）">
            <p className="mb-3 text-xs text-ink-tertiary">
              添加项目实拍图或演示视频外链（图片支持 JPG/PNG/WebP，视频支持 B站/YouTube 嵌入链接或直链）。
            </p>
            <div className="flex flex-col gap-3">
              {media.map((row, idx) => (
                <div key={idx} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <select
                      value={row.type}
                      onChange={(e) => updateMedia(idx, "type", e.target.value)}
                      className="h-10 w-24 shrink-0 rounded-xl border border-border bg-white px-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="image">图片</option>
                      <option value="video">视频</option>
                    </select>
                    <input
                      type="url"
                      value={row.url}
                      onChange={(e) => updateMedia(idx, "url", e.target.value)}
                      placeholder={row.type === "image" ? "https://example.com/photo.jpg" : "https://www.bilibili.com/video/BV..."}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border px-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => removeMedia(idx)}
                      disabled={media.length <= 1}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-danger hover:bg-danger/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      删除
                    </button>
                  </div>
                  <input
                    type="text"
                    value={row.note}
                    onChange={(e) => updateMedia(idx, "note", e.target.value)}
                    placeholder="说明（可选），例如：整车组装完成图"
                    className="mt-2 h-9 w-full rounded-xl border border-border px-3 text-xs text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
              <button onClick={addMedia} className="self-start text-sm text-primary hover:text-primary-hover">+ 添加图片/视频</button>
            </div>
          </Card>

          {/* 标签 */}
          <Card title="标签">
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    tags.includes(t)
                      ? "border-primary bg-primary text-white"
                      : "border-border text-ink-secondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Card>

          {/* BOM */}
          <Card title="物料清单（BOM，可选）">
            <div className="flex flex-col gap-2">
              {bom.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input value={row.designator} onChange={(e) => updateBom(idx, "designator", e.target.value)} placeholder="位号" className={`${inputCls} col-span-2`} />
                  <input value={row.partNo} onChange={(e) => updateBom(idx, "partNo", e.target.value)} placeholder="型号/料号" className={`${inputCls} col-span-3`} />
                  <input value={row.package} onChange={(e) => updateBom(idx, "package", e.target.value)} placeholder="封装" className={`${inputCls} col-span-2`} />
                  <input type="number" value={row.qty} onChange={(e) => updateBom(idx, "qty", Number(e.target.value))} placeholder="数量" className={`${inputCls} col-span-1`} />
                  <input type="number" value={row.unitPrice} onChange={(e) => updateBom(idx, "unitPrice", Number(e.target.value))} placeholder="单价" className={`${inputCls} col-span-2`} />
                  <input value={row.note} onChange={(e) => updateBom(idx, "note", e.target.value)} placeholder="备注" className={`${inputCls} col-span-1`} />
                  <button onClick={() => removeBomRow(idx)} className="col-span-1 text-danger text-sm">删</button>
                </div>
              ))}
              <button onClick={addBomRow} className="text-sm text-primary hover:text-primary-hover">+ 添加物料</button>
            </div>
          </Card>

          {/* 制作步骤 */}
          <Card title="制作步骤（可选）">
            <div className="flex flex-col gap-3">
              {steps.map((row, idx) => (
                <div key={idx} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-secondary">步骤 {row.order}</span>
                    <button onClick={() => removeStep(idx)} className="ml-auto text-xs text-danger">删除</button>
                  </div>
                  <input
                    value={row.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                    placeholder="步骤标题，例如：环境配置"
                    className={`${inputCls} mt-2`}
                  />
                  <textarea
                    value={row.content}
                    onChange={(e) => updateStep(idx, "content", e.target.value)}
                    placeholder="步骤内容"
                    rows={2}
                    className={`${inputCls} mt-2`}
                  />
                </div>
              ))}
              <button onClick={addStep} className="text-sm text-primary hover:text-primary-hover">+ 添加步骤</button>
            </div>
          </Card>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={loading}
              className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? "保存中…" : isEdit ? "保存修改" : "发布项目"}
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-full border border-border px-6 py-2.5 text-sm text-ink-secondary hover:border-primary hover:text-primary transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm text-ink-secondary">{label}</label>
      {children}
    </div>
  );
}
