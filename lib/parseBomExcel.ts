"use client";

import * as XLSX from "xlsx";

// ===== Excel 解析 BOM（纯前端，浏览器端解析）=====

export interface ParsedBomRow {
  designator: string; // 位号
  partNo: string; // 型号/名称
  package: string; // 封装
  qty: number; // 数量
  unitPrice: number; // 单价
  note: string; // 备注
}

// 常见的 BOM 表头别名 → 标准字段名
const HEADER_ALIASES: Record<string, keyof ParsedBomRow> = {
  // 位号
  "位号": "designator", "designator": "designator", "reference": "designator", "ref": "designator", "编号": "designator", "序号": "designator",
  // 型号/名称
  "型号": "partNo", "型号/名称": "partNo", "名称": "partNo", "物料名称": "partNo", "元器件": "partNo", "元件名称": "partNo", "partno": "partNo", "part": "partNo", "description": "partNo", "品名": "partNo", "物料": "partNo",
  // 封装
  "封装": "package", "package": "package", "封装形式": "package", "footprint": "package",
  // 数量
  "数量": "qty", "qty": "qty", "quantity": "qty", "用量": "qty", "count": "qty",
  // 单价
  "单价": "unitPrice", "unitprice": "unitPrice", "price": "unitPrice", "价格": "unitPrice", "金额": "unitPrice", "cost": "unitPrice",
  // 备注
  "备注": "note", "note": "note", "说明": "note", "remark": "note", "描述": "note",
};

// 将表头解析为标准字段名
function mapHeader(raw: string): keyof ParsedBomRow | null {
  const key = raw.trim().toLowerCase();
  // 直接匹配
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  // 模糊匹配（去掉空格/冒号/括号）
  const cleaned = key.replace(/[\s:：()（）]/g, "");
  for (const [alias, field] of Object.entries(HEADER_ALIASES)) {
    if (alias.toLowerCase().replace(/[\s:：()（）]/g, "") === cleaned) return field;
  }
  // 包含匹配（如"单价(元)"、"数量(个)"）
  if (cleaned.includes("单价") || cleaned.includes("价格") || cleaned.includes("金额")) return "unitPrice";
  if (cleaned.includes("数量") || cleaned.includes("用量")) return "qty";
  if (cleaned.includes("封装")) return "package";
  if (cleaned.includes("型号") || cleaned.includes("名称") || cleaned.includes("物料") || cleaned.includes("品名")) return "partNo";
  if (cleaned.includes("位号") || cleaned.includes("编号") || cleaned.includes("序号")) return "designator";
  if (cleaned.includes("备注") || cleaned.includes("说明") || cleaned.includes("描述")) return "note";
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

// 解析 Excel 文件，返回 BOM 行数组（自动识别表头）
export async function parseBomExcel(file: File): Promise<ParsedBomRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  // 转成二维数组（header:1 表示第一行作为表头，返回对象数组更易处理）
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length === 0) return [];

  // 定位表头行（前 5 行内找包含"型号"或"名称"等关键词的行）
  let headerRowIdx = 0;
  let headerMap: (keyof ParsedBomRow | null)[] = [];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i] as unknown[];
    const mapped = row.map((cell) => mapHeader(String(cell ?? "")));
    const recognized = mapped.filter((m) => m !== null).length;
    if (recognized >= 1) {
      headerRowIdx = i;
      headerMap = mapped;
      break;
    }
  }

  // 至少要识别出"型号/名称"字段，否则认为不是 BOM 表
  if (!headerMap.includes("partNo")) {
    // 兜底：如果没有任何表头识别，报错提示
    throw new Error("未识别到 BOM 表头，请确保 Excel 包含「型号/名称」列");
  }

  const result: ParsedBomRow[] = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const item: ParsedBomRow = { designator: "", partNo: "", package: "", qty: 1, unitPrice: 0, note: "" };
    let hasContent = false;
    headerMap.forEach((field, colIdx) => {
      if (!field) return;
      const cell = row[colIdx];
      const str = String(cell ?? "").trim();
      if (!str) return;
      hasContent = true;
      switch (field) {
        case "designator": item.designator = str; break;
        case "partNo": item.partNo = str; break;
        case "package": item.package = str; break;
        case "qty": item.qty = toQty(cell); break;
        case "unitPrice": item.unitPrice = toNumber(cell); break;
        case "note": item.note = str; break;
      }
    });
    // 跳过空行和表头重复行
    if (!hasContent) continue;
    if (!item.partNo) continue; // 没有型号/名称的行跳过
    result.push(item);
  }

  return result;
}
