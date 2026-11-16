import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("开始写入种子数据...");

  // 1. 创建管理员账号（出云官方）
  const adminPassword = await bcrypt.hash("admin123456", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@maturo.cn" },
    update: {},
    create: {
      email: "admin@maturo.cn",
      passwordHash: adminPassword,
      handle: "maturo",
      name: "出云机器人",
      bio: "出云 ROS 机器人社区官方账号，提供 ROS2 学习套件与开源机器人项目。",
      role: "admin",
    },
  });

  // 2. 创建几个示例用户
  const user1 = await prisma.user.upsert({
    where: { email: "dev1@example.com" },
    update: {},
    create: {
      email: "dev1@example.com",
      passwordHash: await bcrypt.hash("123456", 10),
      handle: "ros2-learner",
      name: "小张",
      bio: "ROS2 学习者，正在做移动机器人导航项目。",
      role: "user",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "dev2@example.com" },
    update: {},
    create: {
      email: "dev2@example.com",
      passwordHash: await bcrypt.hash("123456", 10),
      handle: "robot-maker",
      name: "老王",
      bio: "机器人爱好者，专注机械臂与视觉抓取。",
      role: "user",
    },
  });

  // 3. 创建示例机器人项目
  const projects = [
    {
      slug: "ros2-turtlebot-navigation",
      title: "ROS2 双轮差速小车 · SLAM 导航",
      summary:
        "基于 LEAP_ROS 双轮小车的 ROS2 导航项目，实现 gmapping 建图 + nav2 自主导航，附带完整参数调优说明。",
      description:
        "这是一个从零到一的 ROS2 移动机器人导航项目。使用双轮差速底盘，搭载激光雷达和 IMU，在 ROS2 Humble 上实现 SLAM 建图与自主导航。项目包含：底盘运动学标定、URDF 建模、激光雷达驱动、gmapping/cartographer 建图、nav2 路径规划与避障。所有代码开源，附详细的环境配置与调参教程。",
      category: "移动机器人",
      difficulty: "进阶",
      tags: ["ROS2", "SLAM", "导航", "激光雷达"],
      license: "MIT",
      costEstimate: 899,
      authorId: user1.id,
      bom: [
        { designator: "底盘", partNo: "LEAP_ROS 双轮底盘", package: "成品", qty: 1, unitPrice: 599, note: "含编码器电机" },
        { designator: "LIDAR", partNo: "思岚 A1M8 激光雷达", package: "成品", qty: 1, unitPrice: 299, note: "建图用" },
        { designator: "IMU", partNo: "MPU6050 九轴", package: "模块", qty: 1, unitPrice: 25, note: "姿态估计" },
        { designator: "主控", partNo: "树莓派 4B 4G", package: "成品", qty: 1, unitPrice: 399, note: "运行 ROS2" },
      ],
      steps: [
        { order: 1, title: "环境配置", content: "安装 Ubuntu 22.04 + ROS2 Humble，配置工作空间，编译项目代码。" },
        { order: 2, title: "底盘标定", content: "标定轮距和轮径，运行里程计校准程序，验证线速度/角速度。" },
        { order: 3, title: "建图", content: "启动 gmapping，遥控小车遍历环境，保存地图。" },
        { order: 4, title: "导航", content: "启动 nav2，设定目标点，验证自主导航与避障。" },
      ],
    },
    {
      slug: "ros2-mecharm-grasp",
      title: "ROS2 机械臂视觉抓取",
      summary:
        "六自由度机械臂 + RGB-D 相机的视觉抓取项目，MoveIt2 运动规划 + YOLO 目标检测，实现自动分拣。",
      description:
        "机械臂视觉抓取是机器人领域的经典应用。本项目使用六轴机械臂，配合 RealSense 深度相机，在 ROS2 上实现：MoveIt2 运动规划、手眼标定、YOLOv8 目标检测、抓取位姿估计、任务规划与执行。适合有一定 ROS 基础的学习者进阶。",
      category: "机械臂",
      difficulty: "硬核",
      tags: ["ROS2", "机械臂", "MoveIt2", "视觉", "YOLO"],
      license: "Apache-2.0",
      costEstimate: 2999,
      authorId: user2.id,
      bom: [
        { designator: "机械臂", partNo: "六轴机械臂", package: "成品", qty: 1, unitPrice: 1999, note: "含控制器" },
        { designator: "相机", partNo: "RealSense D435", package: "成品", qty: 1, unitPrice: 899, note: "深度相机" },
        { designator: "主控", partNo: "NVIDIA Jetson Orin Nano", package: "成品", qty: 1, unitPrice: 1299, note: "算力" },
      ],
      steps: [
        { order: 1, title: "机械臂驱动", content: "配置 MoveIt2，加载机械臂 URDF，完成正逆解算验证。" },
        { order: 2, title: "手眼标定", content: "用棋盘格标定相机与机械臂末端坐标系。" },
        { order: 3, title: "目标检测", content: "训练或加载 YOLOv8 权重，识别待抓取物体。" },
        { order: 4, title: "抓取执行", content: "估计抓取位姿，规划运动轨迹，执行抓取与放置。" },
      ],
    },
    {
      slug: "ros2-line-follow-robot",
      title: "ROS2 视觉循迹小车",
      summary:
        "基于 OpenCV 的视觉循迹小车，摄像头识别车道线，PID 控制转向，适合 ROS2 入门学习。",
      description:
        "视觉循迹是 ROS2 入门的绝佳项目。使用普通 USB 摄像头采集图像，OpenCV 处理车道线，输出偏差给 PID 控制器调节底盘速度。项目结构清晰，代码注释完整，适合刚接触 ROS2 的学习者，理解话题通信、节点、参数等核心概念。",
      category: "移动机器人",
      difficulty: "入门",
      tags: ["ROS2", "OpenCV", "视觉", "PID"],
      license: "MIT",
      costEstimate: 399,
      authorId: user1.id,
      bom: [
        { designator: "底盘", partNo: "两轮小车底盘", package: "成品", qty: 1, unitPrice: 199, note: "含电机驱动" },
        { designator: "相机", partNo: "USB 摄像头 720P", package: "成品", qty: 1, unitPrice: 79, note: "视觉采集" },
        { designator: "主控", partNo: "树莓派 Zero 2W", package: "成品", qty: 1, unitPrice: 129, note: "运行 ROS2" },
      ],
      steps: [
        { order: 1, title: "搭建环境", content: "烧录 Ubuntu，安装 ROS2，配置摄像头驱动。" },
        { order: 2, title: "视觉处理", content: "用 OpenCV 提取车道线，计算中线偏差。" },
        { order: 3, title: "PID 控制", content: "整定 PID 参数，实现稳定循迹。" },
      ],
    },
  ];

  for (const p of projects) {
    const { bom, steps, ...projectData } = p;
    const exists = await prisma.project.findUnique({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.project.create({
        data: {
          ...projectData,
          tags: JSON.stringify(p.tags),
          bom: { create: bom },
          steps: { create: steps },
          versions: {
            create: [{ ver: "v1.0", date: "2026-11-01", changelog: "首版发布" }],
          },
        },
      });
      console.log(`已创建项目: ${p.title}`);
    } else {
      console.log(`项目已存在，跳过: ${p.title}`);
    }
  }

  console.log("种子数据写入完成！");
  console.log("管理员账号: admin@maturo.cn / admin123456");
  console.log("示例用户: dev1@example.com / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
