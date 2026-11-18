// ===== 输入校验与净化（统一字段长度限制 + HTML 注入防护）=====

// 字段长度上限（与前端表单约束保持一致）
export const LIMITS = {
  title: 80, // 项目标题
  summary: 200, // 项目简介
  description: 10000, // 项目详细介绍
  category: 30,
  difficulty: 10,
  tag: 20, // 单个标签
  tags: 10, // 标签数量
  license: 30,
  bomDesignator: 30, // BOM 位号
  bomPartNo: 100, // BOM 型号
  bomPackage: 30,
  bomNote: 200,
  stepTitle: 80, // 步骤标题
  stepContent: 5000, // 步骤内容
  attachmentName: 100, // 附件名
  attachmentUrl: 500, // 附件 URL
  attachmentSize: 50,
  comment: 1000, // 评论
  bio: 500, // 个人简介
  handle: 30, // 公开昵称
  name: 50, // 展示名
} as const;

export interface ValidationError {
  field: string;
  message: string;
}

// 校验失败抛出带 field 信息的错误，便于 API 层返回精确提示
export class InputValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "InputValidationError";
    this.field = field;
  }
}

// 转义 HTML 特殊字符，防止存储的 HTML 标签被浏览器解析（双重保险：React 渲染本身会转义）
// 这里把 < > & " ' 转成实体，让攻击者输入的 <script> 变成纯文本字面量展示
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 校验并截断/净化字符串：超长则报错（不静默截断，避免数据意外丢失语义）
function checkLength(value: string | undefined | null, field: string, max: number): string {
  const v = (value ?? "").trim();
  if (v.length > max) {
    throw new InputValidationError(field, `${field}不能超过 ${max} 个字符`);
  }
  return v;
}

// 净化纯文本字段（标题、简介、步骤、评论等）：转义 HTML 标签 + 长度校验
export function cleanText(value: string | undefined | null, field: string, max: number): string {
  const v = checkLength(value, field, max);
  return escapeHtml(v);
}

// 校验单个标签（数量 + 单个长度 + 转义）
export function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const list = tags.slice(0, LIMITS.tags).map((t) => {
    if (typeof t !== "string") return "";
    const v = t.trim();
    if (v.length > LIMITS.tag) throw new InputValidationError("tag", `单个标签不能超过 ${LIMITS.tag} 个字符`);
    return escapeHtml(v);
  }).filter(Boolean);
  return list;
}

// 校验成本估算（非负数字）
export function cleanCost(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) throw new InputValidationError("costEstimate", "预估成本必须是非负数字");
  if (n > 100000000) throw new InputValidationError("costEstimate", "预估成本数值过大");
  return n;
}

// 校验 BOM 物料数组
export function cleanBom(bom: unknown) {
  if (!Array.isArray(bom)) return [];
  return bom.slice(0, 100).map((b: any, i) => ({
    designator: cleanText(b?.designator, "BOM 位号", LIMITS.bomDesignator),
    partNo: cleanText(b?.partNo, "BOM 型号", LIMITS.bomPartNo),
    package: b?.package ? cleanText(b.package, "BOM 封装", LIMITS.bomPackage) : undefined,
    qty: Math.max(1, Math.min(Number(b?.qty) || 1, 999999)),
    unitPrice: b?.unitPrice ? cleanCost(b.unitPrice) : 0,
    note: b?.note ? cleanText(b.note, "BOM 备注", LIMITS.bomNote) : undefined,
    order: i,
  }));
}

// 校验制作步骤数组
export function cleanSteps(steps: unknown) {
  if (!Array.isArray(steps)) return [];
  return steps.slice(0, 50).map((s: any, i) => ({
    order: Number(s?.order) || i + 1,
    title: cleanText(s?.title, "步骤标题", LIMITS.stepTitle),
    content: cleanText(s?.content, "步骤内容", LIMITS.stepContent),
    image: typeof s?.image === "string" && s.image.startsWith("/") ? s.image.slice(0, 500) : undefined,
  }));
}

// 校验附件数组（image/video/github 等）
export function cleanAttachments(attachments: unknown) {
  if (!Array.isArray(attachments)) return [];
  return attachments.slice(0, 20).map((a: any, i) => ({
    name: cleanText(a?.name, "附件名称", LIMITS.attachmentName),
    type: typeof a?.type === "string" ? a.type.slice(0, 30) : "file",
    url: typeof a?.url === "string" ? a.url.slice(0, LIMITS.attachmentUrl) : undefined,
    size: a?.size ? cleanText(a.size, "附件大小", LIMITS.attachmentSize) : undefined,
    order: i,
  }));
}
