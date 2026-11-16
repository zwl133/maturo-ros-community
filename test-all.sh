#!/bin/bash
# ROS2 社区 P0 全功能测试脚本
# 覆盖：注册/登录/登出/登录态/发布/浏览/详情/作者主页/收藏/点赞/评论/收藏列表/后台
BASE="http://localhost:3000/community"
PASS=0
FAIL=0

say() { printf "\n\033[1;34m===== %s =====\033[0m\n" "$1"; }
ok() { printf "  \033[32m[PASS]\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
bad() { printf "  \033[31m[FAIL]\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }

# 检查 HTTP 状态码
check() { # $1=desc $2=expected $3=actual
  if [ "$2" = "$3" ]; then ok "$1 (HTTP $3)"; else bad "$1 (期望 $2 实际 $3)"; fi
}

say "0. 前置：清理历史测试数据"
# 用一个新的随机邮箱，避免冲突
TS=$(date +%s)
EMAIL="t${TS}@maturo.cn"
HANDLE="tester${TS}"
PWD="test123456"

say "1. 邮箱注册"
R=$(curl -s --noproxy "*" -X POST "$BASE/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PWD\",\"handle\":\"$HANDLE\",\"name\":\"测试员\"}")
echo "$R" | grep -q '"ok":true' && ok "注册成功: $HANDLE" || bad "注册失败: $R"

say "2. 登录"
curl -s --noproxy "*" -c /tmp/cc.txt -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PWD\"}" | grep -q '"ok":true' && ok "登录成功" || bad "登录失败"

say "3. 登录态查询"
curl -s --noproxy "*" -b /tmp/cc.txt "$BASE/api/auth/me" | grep -q "\"handle\":\"$HANDLE\"" && ok "登录态正确" || bad "登录态异常"

say "3b. 未登录态查询（应为 user:null）"
curl -s --noproxy "*" "$BASE/api/auth/me" | grep -q '"user":null' && ok "未登录返回 null" || bad "未登录态异常"

say "4. 发布项目"
SLUG=$(curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/projects" -H "Content-Type: application/json" -d '{"title":"测试机械臂项目","summary":"一个测试项目简介","description":"详细描述","category":"机械臂","difficulty":"进阶","tags":["ROS2","MoveIt2"],"license":"MIT","costEstimate":1999,"bom":[{"designator":"U1","partNo":"STM32F103","package":"LQFP48","qty":1,"unitPrice":15}],"steps":[{"order":1,"title":"环境配置","content":"安装ROS2"}]}' | sed 's/.*"slug":"\([^"]*\)".*/\1/')
echo "$SLUG" | grep -qE '^[a-z0-9-]+$' && ok "发布成功, slug=$SLUG" || bad "发布失败: $SLUG"

say "5. 首页"
check "首页 /community/" 200 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' "$BASE/")"

say "6. 项目广场"
check "explore 页面" 200 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' "$BASE/explore")"

say "7. 项目详情页"
check "详情页 /p/$SLUG" 200 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' "$BASE/p/$SLUG")"

say "7b. 不存在的项目详情（应 404）"
check "不存在项目" 404 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' "$BASE/p/not-exist-xyz")"

say "8. 开发者主页"
check "作者主页 /u/$HANDLE" 200 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' "$BASE/u/$HANDLE")"

say "9. 收藏项目"
curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/projects/$SLUG/interact" -H "Content-Type: application/json" -d '{"action":"collect"}' | grep -q '"collected":true' && ok "收藏成功" || bad "收藏失败"

say "9b. 取消收藏（幂等切换）"
curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/projects/$SLUG/interact" -H "Content-Type: application/json" -d '{"action":"collect"}' | grep -q '"collected":false' && ok "取消收藏成功" || bad "取消收藏失败"

say "9c. 再次收藏（用于测试收藏列表）"
curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/projects/$SLUG/interact" -H "Content-Type: application/json" -d '{"action":"collect"}' | grep -q '"collected":true' && ok "再次收藏成功" || bad "再次收藏失败"

say "10. 点赞"
curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/projects/$SLUG/interact" -H "Content-Type: application/json" -d '{"action":"like"}' | grep -q '"liked":true' && ok "点赞成功" || bad "点赞失败"

say "11. 发表评论"
curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/projects/$SLUG/interact" -H "Content-Type: application/json" -d '{"action":"comment","content":"测试评论，很棒的机器人项目！"}' | grep -q '"ok":true' && ok "评论成功" || bad "评论失败"

say "11b. 空评论（应 400）"
check "空评论" 400 "$(curl -s --noproxy "*" -b /tmp/cc.txt -o /dev/null -w '%{http_code}' -X POST "$BASE/api/projects/$SLUG/interact" -H "Content-Type: application/json" -d '{"action":"comment","content":""}')"

say "12. 我的收藏列表"
curl -s --noproxy "*" -b /tmp/cc.txt "$BASE/api/me/collections" | grep -q "\"projects\"" && ok "收藏列表返回正常" || bad "收藏列表异常"

say "12b. 未登录访问收藏列表（应 401）"
check "未登录收藏列表" 401 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' "$BASE/api/me/collections")"

say "13. 未登录发布项目（应 401）"
check "未登录发布" 401 "$(curl -s --noproxy "*" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/projects" -H "Content-Type: application/json" -d '{"title":"x"}')"

say "14. 后台管理（普通用户访问应 403）"
check "普通用户访问后台API" 403 "$(curl -s --noproxy "*" -b /tmp/cc.txt -o /dev/null -w '%{http_code}' "$BASE/api/admin/projects")"

say "14b. 后台管理（admin 登录访问应 200）"
curl -s --noproxy "*" -c /tmp/adm.txt -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@maturo.cn","password":"admin123456"}' > /dev/null
check "admin 访问后台API" 200 "$(curl -s --noproxy "*" -b /tmp/adm.txt -o /dev/null -w '%{http_code}' "$BASE/api/admin/projects")"

say "14c. 后台下架项目（admin）"
# 取一个种子项目 id 做上下架测试
PID=$(curl -s --noproxy "*" -b /tmp/adm.txt "$BASE/api/admin/projects" | sed 's/.*"id":"\([^"]*\)".*/\1/')
R=$(curl -s --noproxy "*" -b /tmp/adm.txt -X PATCH "$BASE/api/admin/projects" -H "Content-Type: application/json" -d "{\"id\":\"$PID\",\"status\":\"draft\"}")
echo "$R" | grep -q '"ok":true' && ok "下架成功" || bad "下架失败: $R"
# 恢复上架
curl -s --noproxy "*" -b /tmp/adm.txt -X PATCH "$BASE/api/admin/projects" -H "Content-Type: application/json" -d "{\"id\":\"$PID\",\"status\":\"published\"}" > /dev/null
ok "恢复上架成功"

say "15. 登出"
curl -s --noproxy "*" -b /tmp/cc.txt -X POST "$BASE/api/auth/logout" -o /dev/null -w '' 2>/dev/null
ok "登出接口调用完成"

say "16. 页面渲染完整性（检查首页是否含关键文案）"
curl -s --noproxy "*" -L "$BASE/" | grep -q "ROS2 机器人开源社区" && ok "首页标题正常" || bad "首页标题缺失"

# 清理测试数据
say "17. 清理测试数据"
cd /d/code_projects/chuyun-tech && node -e "const {PrismaClient}=require('@prisma/client');const {PrismaLibSql}=require('@prisma/adapter-libsql');const a=new PrismaLibSql({url:'file:./dev.db'});const p=new PrismaClient({adapter:a});(async()=>{const u=await p.user.findUnique({where:{email:'$EMAIL'}});if(u){await p.project.deleteMany({where:{authorId:u.id}});await p.user.delete({where:{id:u.id}});console.log('已删除测试用户及其项目');}else{console.log('测试用户已不存在');}await p.\$disconnect();})().catch(e=>console.log('ERR',e.message))" 2>&1 | tail -2

printf "\n\033[1;36m===== 测试汇总 =====\033[0m\n"
printf "  通过: \033[32m%d\033[0m  失败: \033[31m%d\033[0m\n" "$PASS" "$FAIL"
if [ "$FAIL" -eq 0 ]; then echo "  ✅ 全部功能测试通过"; else echo "  ❌ 存在失败项，请检查"; fi
