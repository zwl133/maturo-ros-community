# ============================================================
# 苏州码拓 ROS2 社区 —— 部署准备包说明
# ============================================================

## 一、决策（已确认锁定）
- 数据库：SQLite（libsql adapter），文件 `dev.db`
- new-api：严格不动，只加 Nginx location，不触碰任何现有容器/配置
- 路径：https://www.maturo.cn/community

## 二、本包内容
```
deploy/
├── deploy.sh                  # 服务器端一键部署脚本（root 运行）
├── SESSION_SECRET.txt         # 生产 SESSION_SECRET（强随机，勿外泄）
├── README.md                  # 本文件
└── nginx/
    └── ros-community.conf     # Nginx 反向代理片段（只加不改）
```

## 三、上传打包（本地执行）
在项目根目录执行，打包要上传的文件（排除 node_modules/.next/.git）：

```bash
cd /d/code_projects/chuyun-tech
tar czf ros-community-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='deploy' \
  --exclude='*.log' \
  app components lib prisma public \
  next.config.ts package.json package-lock.json \
  tsconfig.json postcss.config.* tailwind.config.* \
  dev.db \
  deploy/
```

> 注意：`dev.db` 必须带上（含 4 用户 / 3 项目 / 2 条迁移记录）。
> 若服务器已有旧库想保留，可先手动备份后单独覆盖。

## 四、服务器执行
```bash
# 1. 上传
scp ros-community-deploy.tar.gz root@<服务器IP>:/root/

# 2. 登录解压
ssh root@<服务器IP>
mkdir -p /root/ros-community-pkg && tar xzf /root/ros-community-deploy.tar.gz -C /root/ros-community-pkg

# 3. 执行部署（自动完成：装Node→拷源码→装依赖→迁移→构建→systemd→Nginx）
cd /root/ros-community-pkg
bash deploy/deploy.sh
```

## 五、部署脚本做的事（逐步、可回滚）
1. 检查/安装 Node 22
2. 备份旧部署（.env + dev.db）
3. 拷贝源码到 /var/www/ros-community/
4. 生成 .env.production（写入 SESSION_SECRET + SITE_URL + BASE_PATH）
5. 服务器架构下 `npm ci --omit=dev`（自动下载匹配的 libsql 原生二进制）
6. `prisma generate` + `prisma migrate deploy`（幂等）
7. `npm run build`（服务器端构建）
8. 创建 systemd 服务（MemoryMax=1G 防 OOM）
9. 健康检查 curl 127.0.0.1:3000/community
10. 放置 Nginx 片段 + `nginx -t` 校验 + reload（失败自动回滚）

## 六、回滚方案
- 停服务：`systemctl stop ros-community`
- 恢复 Nginx：删除 `/etc/nginx/conf.d/ros-community.conf` 后 `nginx -s reload`
- 恢复数据：备份在 `/root/backup/ros-community-<时间戳>/`
- 官网/new-api 全程不受影响（Nginx 只加片段，未改任何现有配置）

## 七、上线后必做
1. 登录社区，确认能正常浏览/发布
2. 确认官网首页、new-api 的 /login /topup /console 全部正常
3. 修改管理员初始密码（如有）
4. 观察 `journalctl -u ros-community -f` 是否有报错
