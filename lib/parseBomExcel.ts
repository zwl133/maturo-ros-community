"use client";

import * as XLSX from "xlsx";

// ===== Excel 解析 BOM（纯前端，浏览器端解析）=====
// 方案 C：自动识别优先，识别不了/不全时返回未识别列，由前端弹「列映射面板」让用户手动指认。

export interface ParsedBomRow {
  designator: string; // 位号
  partNo: string; // 型号/名称
  package: string; // 封装
  qty: number; // 数量
  unitPrice: number; // 单价
  note: string; // 备注
}

// 标准字段（列映射下拉框的选项）
export const BOM_FIELDS = [
  { key: "designator", label: "位号" },
  { key: "partNo", label: "名称/型号" },
  { key: "package", label: "封装" },
  { key: "qty", label: "数量" },
  { key: "unitPrice", label: "单价" },
  { key: "note", label: "备注" },
] as const;

export type BomFieldKey = (typeof BOM_FIELDS)[number]["key"];

// 一列的表头原始文字 + 自动识别出的字段（可能为 null 表示未识别）
export interface BomColumn {
  index: number; // 列下标
  header: string; // 表头原文
  recognized: BomFieldKey | null; // 自动识别结果
}

// 常见的 BOM 表头别名 → 标准字段名（已扩充中英文 + EDA/ERP 导出格式）
const HEADER_ALIASES: Record<string, BomFieldKey> = {
  // 位号
  "位号": "designator", "designator": "designator", "reference": "designator", "ref": "designator",
  "编号": "designator", "序号": "designator", "designators": "designator", "位号/编号": "designator",
  "ref des": "designator", "refdes": "designator", "reference designator": "designator",
  // 封装
  "封装": "package", "package": "package", "封装形式": "package", "footprint": "package", "封装/型号": "package",
  // 数量
  "数量": "qty", "qty": "qty", "quantity": "qty", "用量": "qty", "count": "qty", "数量(个)": "qty", "qty.": "qty",
  // 单价
  "单价": "unitPrice", "unitprice": "unitPrice", "price": "unitPrice", "价格": "unitPrice", "金额": "unitPrice",
  "cost": "unitPrice", "unitprice(元)": "unitPrice", "单价(元)": "unitPrice", "unit price": "unitPrice",
  // 名称/型号
  "型号": "partNo", "型号/名称": "partNo", "名称": "partNo", "物料名称": "partNo", "元器件": "partNo",
  "元件名称": "partNo", "partno": "partNo", "part": "partNo", "description": "partNo", "品名": "partNo",
  "物料": "partNo", "name": "partNo", "value": "partNo", "item": "partNo", "component": "partNo",
  "device": "partNo", "comment": "partNo", "mpn": "partNo", "part number": "partNo",
  "partnumber": "partNo", "libref": "partNo",
  // 备注
  "备注": "note", "note": "note", "说明": "note", "remark": "note", "描述": "note", "notes": "note", "comment/备注": "note",
};

// 将表头解析为标准字段名
export function mapHeader(raw: string): BomFieldKey | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  // 直接匹配
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  // 模糊匹配（去掉空格/冒号/括号/斜杠/下划线）
  const cleaned = key.replace(/[\s:：()（）/_.-]/g, "");
  for (const [alias, field] of Object.entries(HEADER_ALIASES)) {
    if (alias.toLowerCase().replace(/[\s:：()（）/_.-]/g, "") === cleaned) return field;
  }
  // 包含匹配（如"单价(元)"、"数量(个)"、"Manufacturer Part Number"）
  if (cleaned.includes("单价") || cleaned.includes("价格") || cleaned.includes("金额") || cleaned.includes("price") || cleaned.includes("cost")) return "unitPrice";
  if (cleaned.includes("数量") || cleaned.includes("用量") || cleaned.includes("qty") || cleaned.includes("quantity") || cleaned.includes("count")) return "qty";
  if (cleaned.includes("封装") || cleaned.includes("footprint") || cleaned.includes("package")) return "package";
  // 名称/型号：优先精确语义，避免把 Manufacturer Part / Supplier Part / 物料编码 等误判
  if (cleaned.includes("型号") || cleaned.includes("名称") || cleaned.includes("品名") || cleaned.includes("mpn") || cleaned.includes("value") || cleaned.includes("comment") || cleaned.includes("name") || cleaned.includes("description") || cleaned.includes("libref")) return "partNo";
  // 「物料」仅当紧跟「名称」或单独出现才表示名称；「物料编码/物料号/物料代码」是编码，应忽略
  if (cleaned.includes("物料名称") || cleaned === "物料") return "partNo";
  if (cleaned.includes("位号") || cleaned.includes("序号") || cleaned.includes("designator") || cleaned.includes("reference")) return "designator";
  if (cleaned.includes("备注") || cleaned.includes("说明") || cleaned.includes("描述") || cleaned.includes("note") || cleaned.includes("remark")) return "note";
  // 兜底：含 part 但不在 Manufacturer/Supplier 语境下，才视为名称
  if (cleaned.includes("part") && !cleaned.includes("manufacturer") && !cleaned.includes("supplier")) return "partNo";
  return null;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[¥￥,，\s]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toQty(v: unknown): number {
  const n = toNumber(v);
  return n > 0 ? Math.round(n) : 1;
}

export interface ParseBomResult {
  rows: ParsedBomRow[]; // 已解析出的物料行（可能为空）
  columns: BomColumn[]; // 所有列（含未识别列），供列映射面板使用
  headerRowIdx: number; // 表头所在行号
  data: unknown[][]; // 原始二维数据（供二次解析）
  missingFields: BomFieldKey[]; // 缺少的关键字段（partNo 等）
}

// 解析 Excel，返回结果（不再直接抛「未识别表头」错误，而是返回 columns 让前端决定下一步）
export async function parseBomExcel(file: File): Promise<ParseBomResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length === 0) {
    return { rows: [], columns: [], headerRowIdx: 0, data: [], missingFields: [] };
  }

  // 定位表头行（前 5 行内找识别到字段最多的行）
  let headerRowIdx = 0;
  let bestCount = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i] as unknown[];
    const recognized = row.filter((cell) => mapHeader(String(cell ?? "")) !== null).length;
    if (recognized > bestCount) {
      bestCount = recognized;
      headerRowIdx = i;
    }
  }

  const headerRow = (rows[headerRowIdx] as unknown[]) ?? [];
  const columns: BomColumn[] = headerRow.map((cell, idx) => ({
    index: idx,
    header: String(cell ?? "").trim(),
    recognized: mapHeader(String(cell ?? "")),
  }));

  // 用自动识别结果解析
  const autoRows = buildRows(rows, headerRowIdx, columns);
  const recognizedFields = new Set(columns.map((c) => c.recognized).filter((f): f is BomFieldKey => !!f));
  const missingFields: BomFieldKey[] = ["partNo", "qty"]
    .filter((f) => !recognizedFields.has(f as BomFieldKey)) as BomFieldKey[];

  return { rows: autoRows, columns, headerRowIdx, data: rows, missingFields };
}

// 根据「列映射」构建物料行（列映射面板确认后调用，columns 里已带用户指定字段）
export function buildRowsWithMapping(
  data: unknown[][],
  headerRowIdx: number,
  columns: BomColumn[],
): ParsedBomRow[] {
  return buildRows(data, headerRowIdx, columns);
}

function buildRows(data: unknown[][], headerRowIdx: number, columns: BomColumn[]): ParsedBomRow[] {
  // 去重：同一字段若被多列映射（如"物料名称"与"规格型号"都识别为 partNo），
  // 只保留最靠左的一列，避免后面的列覆盖前面的值
  const seen = new Set<BomFieldKey>();
  const effectiveColumns = columns.filter((col) => {
    if (!col.recognized) return false;
    if (seen.has(col.recognized)) return false;
    seen.add(col.recognized);
    return true;
  });

  const result: ParsedBomRow[] = [];
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const item: ParsedBomRow = { designator: "", partNo: "", package: "", qty: 1, unitPrice: 0, note: "" };
    let hasContent = false;
    effectiveColumns.forEach((col) => {
      if (!col.recognized) return;
      const cell = row[col.index];
      const str = String(cell ?? "").trim();
      if (!str) return;
      hasContent = true;
      switch (col.recognized) {
        case "designator": item.designator = str; break;
        case "partNo": item.partNo = str; break;
        case "package": item.package = str; break;
        case "qty": item.qty = toQty(cell); break;
        case "unitPrice": item.unitPrice = toNumber(cell); break;
        case "note": item.note = str; break;
      }
    });
    if (!hasContent) continue;
    if (!item.partNo) continue; // 没有型号/名称的行跳过
    result.push(item);
  }
  return result;
}
