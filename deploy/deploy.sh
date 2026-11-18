#!/usr/bin/env bash
# ============================================================
# 苏州码拓 ROS2 社区 —— 服务器端一键部署脚本
# 目标：maturo.cn/community 子路径部署
# 原则：只加不改 —— 不动 new-api、不动官网、不动现有 Nginx 其它配置
# ============================================================
set -euo pipefail

APP_NAME="ros-community"
APP_DIR="/var/www/${APP_NAME}"
APP_PORT="3000"
SERVICE_NAME="${APP_NAME}.service"
DB_FILE="dev.db"
BACKUP_DIR="/root/backup/${APP_NAME}-$(date +%Y%m%d_%H%M%S)"

# ---------- 颜色 ----------
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${G}[OK]${NC} $*"; }
warn() { echo -e "${Y}[WARN]${NC} $*"; }
die()  { echo -e "${R}[FAIL]${NC} $*"; exit 1; }

# ---------- 0. 权限检查 ----------
[[ "$(id -u)" -eq 0 ]] || die "请用 root 运行：sudo bash deploy.sh"

# ---------- 1. 参数：解压包的根目录（deploy.sh 在 deploy/ 子目录，源码在上一级）----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
log "部署包目录：${PKG_DIR}"
log "脚本目录：${SCRIPT_DIR}"

# ---------- 2. 检查 Node ----------
if ! command -v node >/dev/null 2>&1; then
  warn "未检测到 Node，开始安装 Node.js 22（LTS）..."
  # Debian/Ubuntu 系
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
      && apt-get install -y nodejs || die "Node 安装失败"
  # CentOS/RHEL/Rocky/Alma 系
  elif command -v yum >/dev/null 2>&1 || command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - \
      && yum install -y nodejs || dnf install -y nodejs || die "Node 安装失败"
  else
    die "无法识别系统包管理器，请手动安装 Node.js 22"
  fi
fi
NODE_VER="$(node -v)"
log "Node 版本：${NODE_VER}"
node -e "process.exit(parseInt(process.versions.node.split('.')[0])>=20?0:1)" \
  || die "Node 版本过低（需要 >= 20，当前 ${NODE_VER}）"

# ---------- 3. 目录准备 + 旧版本备份 ----------
if [[ -d "${APP_DIR}" ]]; then
  warn "检测到已存在部署，备份到 ${BACKUP_DIR}"
  mkdir -p "${BACKUP_DIR}"
  cp -a "${APP_DIR}/.env" "${BACKUP_DIR}/env.bak" 2>/dev/null || true
  [[ -f "${APP_DIR}/${DB_FILE}" ]] && cp -a "${APP_DIR}/${DB_FILE}" "${BACKUP_DIR}/dev.db.bak" || true
fi
mkdir -p "${APP_DIR}"
log "应用目录：${APP_DIR}"

# ---------- 4. 拷贝源码（保留 .next 生产产物，排除 node_modules / .git / dev缓存）----------
log "拷贝源码文件（含 .next 生产产物）..."
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '.next/dev' \
  --exclude '.next/cache' \
  --exclude '.git' \
  --exclude 'deploy' \
  --exclude '*.log' \
  "${PKG_DIR}/" "${APP_DIR}/" 2>/dev/null || \
cp -a "${PKG_DIR}/." "${APP_DIR}/"

# ---------- 5. 生产环境变量 ----------
log "写入生产环境变量 .env.production..."
ENV_FILE="${APP_DIR}/.env.production"
SECRET_FILE="${SCRIPT_DIR}/SESSION_SECRET.txt"
if [[ -f "${SECRET_FILE}" ]] && [[ -s "${SECRET_FILE}" ]]; then
  SESSION_SECRET="$(tr -d '\r\n' < "${SECRET_FILE}")"
else
  warn "未找到 SESSION_SECRET.txt，自动生成新密钥"
  SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
fi

cat > "${ENV_FILE}" <<EOF
DATABASE_URL="file:${APP_DIR}/dev.db"
SESSION_SECRET="${SESSION_SECRET}"
NEXT_PUBLIC_SITE_URL="https://www.maturo.cn"
NEXT_PUBLIC_BASE_PATH="/community"
EOF
log "已生成 .env.production（SESSION_SECRET 已写入）"

# ---------- 6. 安装依赖（服务器架构下重新编译原生二进制）----------
log "安装依赖（服务器架构，含 libsql 原生二进制 + prisma CLI）..."
cd "${APP_DIR}"
# 用全量 npm ci：确保 prisma CLI（devDep）可用于 generate/migrate；
# 原生二进制（@libsql/linux-x64-gnu）由 npm 按服务器平台自动下载
npm ci 2>/dev/null || npm install || die "依赖安装失败"

# ---------- 7. 生成 Prisma Client + 迁移数据库 ----------
log "生成 Prisma Client..."
npx prisma generate || die "prisma generate 失败"

# ---------- 8. 数据库迁移（幂等，已存在则跳过）----------
log "迁移数据库（SQLite）..."
if [[ -f "${APP_DIR}/${DB_FILE}" ]]; then
  log "检测到已上传的 dev.db，执行 migrate deploy（幂等）"
  npx prisma migrate deploy || warn "migrate deploy 有告警，继续"
else
  warn "未找到 dev.db，将按 schema 初始建库（新库，无历史数据）"
  npx prisma migrate deploy || die "初始化建库失败"
fi

# ---------- 9. 构建（优先用已上传的 .next，本地构建跨平台复用；否则服务器构建）----------
if [[ -d "${APP_DIR}/.next" ]] && [[ -f "${APP_DIR}/.next/BUILD_ID" ]]; then
  log "检测到已上传的 .next 产物（本地已修正跨平台路径），跳过服务器 build，避免小内存 OOM"
else
  log "未检测到 .next 产物，服务器端构建（小内存服务器建议本地构建后上传）..."
  # 限制 Node 内存，降低 OOM 风险
  NODE_OPTIONS="--max-old-space-size=1024" npm run build || die "构建失败"
fi

# ---------- 10. systemd 服务 ----------
log "配置 systemd 服务 ${SERVICE_NAME}..."
cat > "/etc/systemd/system/${SERVICE_NAME}" <<EOF
[Unit]
Description=Maturo ROS2 Community (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.production
ExecStart=$(command -v node) ${APP_DIR}/node_modules/.bin/next start -p ${APP_PORT}
Restart=always
RestartSec=3
TimeoutStopSec=10
# 内存限制（服务器小内存保护，避免 OOM 拖垮整机）
MemoryMax=1G

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1 || true
systemctl restart "${SERVICE_NAME}" || die "服务启动失败，请查看：journalctl -u ${SERVICE_NAME} -n 50"

sleep 3
if curl -sf "http://127.0.0.1:${APP_PORT}/community" >/dev/null 2>&1; then
  log "服务健康检查通过：http://127.0.0.1:${APP_PORT}/community"
else
  warn "健康检查未通过，请手动确认：curl -I http://127.0.0.1:${APP_PORT}/community"
  warn "查看日志：journalctl -u ${SERVICE_NAME} -n 50"
fi

# ---------- 11. Nginx 配置（只加不改，追加 include）----------
log "配置 Nginx（精准插入 location 到 maturo.cn 的 server 块内）..."
NGINX_FRAG="${SCRIPT_DIR}/nginx/ros-community.conf"

# 关键：location 指令必须位于 maturo.cn 的 server 块内，不能作为独立文件放入 conf.d
# 自动探测 maturo.cn 配置文件真实位置（优先解析软链接到真实文件，避免 sed -i 破坏软链接）
MATURO_CONF=""
for c in /etc/nginx/conf.d/maturo.cn.conf \
         /etc/nginx/conf.d/maturo.cn \
         /etc/nginx/sites-enabled/maturo.cn \
         /etc/nginx/sites-available/maturo.cn; do
  if [[ -e "${c}" ]]; then
    # 若是软链接，解析到真实文件（sed -i 编辑真实文件，保持软链接完整）
    MATURO_CONF="$(readlink -f "${c}")"
    break
  fi
done

# 若上面都没命中，用 grep 全盘搜（排除 .bak 备份文件）
if [[ -z "${MATURO_CONF}" ]]; then
  MATURO_CONF="$(grep -rl "server_name.*maturo\.cn" /etc/nginx/ 2>/dev/null | grep -v '\.bak' | head -1)"
fi

if [[ -z "${MATURO_CONF}" ]]; then
  warn "未找到 maturo.cn 的 Nginx 配置，跳过自动插入"
  warn "请手动把 ${NGINX_FRAG} 的内容加到 maturo.cn 的 443 server 块内"
else
  log "找到 maturo.cn 配置：${MATURO_CONF}"

  # 幂等检查：已插入过则跳过
  if grep -q "location \^~ /community" "${MATURO_CONF}" 2>/dev/null; then
    log "/community 已配置过，跳过插入"
  else
    # 备份原配置到 /root/backup/（不能留在 sites-enabled 内，否则被 include 通配符二次加载导致 server_name 冲突）
    BACKUP_NGINX="/root/backup/nginx-ros-community/maturo.cn.bak.$(date +%s)"
    mkdir -p "/root/backup/nginx-ros-community"
    cp -a "${MATURO_CONF}" "${BACKUP_NGINX}"
    log "已备份 Nginx 原配置：${BACKUP_NGINX}"

    # 精准定位 443 官网主块的锚点行：
    #   location / {
    #       try_files $uri $uri/ /index.html;
    # 这是官网主入口的唯一特征（80 块是 return 308，不匹配）。
    ANCHOR_LINE="$(grep -n 'try_files \$uri \$uri\/ \/index.html;' "${MATURO_CONF}" | head -1 | cut -d: -f1)"

    if [[ -z "${ANCHOR_LINE}" ]]; then
      warn "未找到锚点 'try_files \$uri \$uri/ /index.html;'，自动插入失败"
      warn "请手动编辑 ${MATURO_CONF}，在 443 server 块内、官网主 location / 之前插入 ${NGINX_FRAG} 内容"
    else
      # 在锚点行的上一行（即 location / { 与 try_files 之间）插入片段
      sed -i "$((ANCHOR_LINE - 1))r ${NGINX_FRAG}" "${MATURO_CONF}"
      log "已在 ${MATURO_CONF} 第 $((ANCHOR_LINE - 1)) 行后插入 /community location"
    fi
  fi

  # 校验 + 平滑 reload
  if nginx -t 2>&1; then
    systemctl reload nginx 2>/dev/null || nginx -s reload || warn "nginx reload 失败，请手动执行"
    log "Nginx 已 reload，社区地址：https://www.maturo.cn/community"
  else
    warn "nginx -t 校验失败！回滚 Nginx 配置"
    cp -a "${BACKUP_NGINX}" "${MATURO_CONF}" 2>/dev/null || true
    nginx -t >/dev/null 2>&1 && (systemctl reload nginx 2>/dev/null || nginx -s reload) || true
    die "Nginx 配置校验失败，已回滚原配置，请检查 ${NGINX_FRAG} 内容"
  fi
fi

# ---------- 12. 完成 ----------
echo ""
log "================================================"
log "部署完成！"
log "社区地址：https://www.maturo.cn/community"
log "服务管理：systemctl status/restart/stop ${SERVICE_NAME}"
log "查看日志：journalctl -u ${SERVICE_NAME} -f"
log "回滚方法：systemctl stop ${SERVICE_NAME} && 恢复 Nginx 配置备份"
log "================================================"
