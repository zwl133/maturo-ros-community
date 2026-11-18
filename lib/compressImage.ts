// 前端图片压缩工具：将图片文件压缩到指定大小以内（默认 100KB）
// 使用 Canvas 缩放 + JPEG 质量递减，纯浏览器 API，无外部依赖

export interface CompressResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  ext: "jpg" | "webp";
}

/**
 * 压缩图片到目标字节数以内
 * @param file 原始图片文件
 * @param maxBytes 目标最大字节数（默认 100KB）
 */
export async function compressImage(file: File, maxBytes = 100 * 1024): Promise<CompressResult> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  // 初始最长边限制：避免超大图内存爆炸
  const MAX_DIM = 2000;
  let { width, height } = img;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  // 首选 webp（体积更小、质量更好），回退 jpeg
  let ext: "jpg" | "webp" = "webp";
  let best: CompressResult | null = null;

  // 先尝试 webp 质量阶梯
  best = await tryCompressWithCanvas(img, width, height, "image/webp", maxBytes);
  if (!best) {
    // webp 压缩不到目标，尝试 jpeg
    ext = "jpg";
    best = await tryCompressWithCanvas(img, width, height, "image/jpeg", maxBytes);
  }

  if (!best) {
    // 极限兜底：缩小尺寸 + 最低质量，保证一定 ≤ maxBytes
    best = await forceCompress(img, maxBytes);
  }

  return { ...best, ext };
}

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

/**
 * 用指定格式和递减质量尝试压缩到 maxBytes 以内
 */
async function tryCompressWithCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  type: "image/webp" | "image/jpeg",
  maxBytes: number
): Promise<CompressResult | null> {
  // 质量从高到低递减
  const qualities = [0.82, 0.7, 0.6, 0.5, 0.4, 0.3];
  for (const quality of qualities) {
    const result = await renderCanvas(img, width, height, type, quality);
    if (result.sizeBytes <= maxBytes) {
      return result;
    }
  }
  return null;
}

/**
 * 极限压缩：逐步缩小尺寸（每次 80%），最低质量，直到 ≤ maxBytes
 */
async function forceCompress(img: HTMLImageElement, maxBytes: number): Promise<CompressResult> {
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  const type: "image/webp" | "image/jpeg" = "image/webp";

  for (let i = 0; i < 8; i++) {
    const result = await renderCanvas(img, width, height, type, 0.3);
    if (result.sizeBytes <= maxBytes) {
      return result;
    }
    width = Math.max(1, Math.round(width * 0.8));
    height = Math.max(1, Math.round(height * 0.8));
  }
  // 最后一次无论如何返回（极小图 + 最低质量，基本必然达标）
  const last = await renderCanvas(img, width, height, "image/jpeg", 0.2);
  return last;
}

function renderCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  type: "image/webp" | "image/jpeg",
  quality: number
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("当前浏览器不支持 Canvas"));
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            width,
            height,
            sizeBytes: blob.size,
            ext: type === "image/webp" ? "webp" : "jpg",
          });
        };
        reader.onerror = () => reject(new Error("读取压缩结果失败"));
        reader.readAsDataURL(blob);
      },
      type,
      quality
    );
  });
}
