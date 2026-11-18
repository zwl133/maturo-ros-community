import crypto from "crypto";

// ===== 图形验证码 =====
// 零依赖：用 Node 内置 crypto 生成随机码，手绘 SVG 图片
// 答案存服务端内存（带过期 + 一次性），防批量注册

const CAPTCHA_TTL_MS = 60 * 1000; // 60 秒过期
const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆的 0/O/1/I

type CaptchaEntry = {
  answer: string;
  expiresAt: number;
  used: boolean; // 一次性：校验后立即作废
};

// 服务端内存存储（单机部署够用；多实例需换 Redis，此处按当前单机架构）
const store = new Map<string, CaptchaEntry>();

// 周期性清理过期条目，避免内存泄漏
function cleanup() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
}
// 每 5 分钟清理一次；生产环境由模块加载后常驻
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 5 * 60 * 1000);
}

function randomCode(len = 4): string {
  const bytes = crypto.randomBytes(len);
  let code = "";
  for (let i = 0; i < len; i++) {
    code += CAPTCHA_CHARS[bytes[i] % CAPTCHA_CHARS.length];
  }
  return code;
}

// 生成一个验证码，返回 { id, svg }
export function createCaptcha(): { id: string; svg: string } {
  cleanup();
  const id = crypto.randomUUID();
  const answer = randomCode(4);
  store.set(id, {
    answer,
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
    used: false,
  });
  // 控制内存：最多保留 10000 条，超出删最旧
  if (store.size > 10000) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  return { id, svg: renderSvg(answer) };
}

// 校验验证码（一次性 + 过期检查），失败返回 false
export function verifyCaptcha(id: string, input: string): boolean {
  cleanup();
  const entry = store.get(id);
  if (!entry) return false;
  if (entry.used) return false;
  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return false;
  }
  // 校验后立即作废（无论对错，防止暴力试错）
  const ok = entry.answer === input.trim().toUpperCase();
  entry.used = true;
  store.delete(id);
  return ok;
}

// 手绘 SVG：4 个字符，随机旋转 + 随机颜色 + 干扰线，增加 OCR 难度
function renderSvg(code: string): string {
  const w = 120;
  const h = 40;
  const colors = ["#534AB7", "#0F6E56", "#D85A30", "#185FA5", "#993556"];
  const chars = code.split("");

  // 干扰线
  let noise = "";
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * w);
    const y1 = Math.floor(Math.random() * h);
    const x2 = Math.floor(Math.random() * w);
    const y2 = Math.floor(Math.random() * h);
    const c = colors[Math.floor(Math.random() * colors.length)];
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1" opacity="0.4"/>`;
  }

  // 字符
  let text = "";
  chars.forEach((ch, i) => {
    const x = 15 + i * 27 + Math.floor(Math.random() * 5);
    const y = 26 + Math.floor(Math.random() * 8);
    const rot = Math.floor(Math.random() * 30) - 15;
    const c = colors[Math.floor(Math.random() * colors.length)];
    const size = 22 + Math.floor(Math.random() * 6);
    text += `<text x="${x}" y="${y}" font-size="${size}" font-family="monospace" font-weight="700" fill="${c}" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect width="${w}" height="${h}" fill="#F1EFE8" rx="6"/>`
    + noise
    + text
    + `</svg>`;
}
