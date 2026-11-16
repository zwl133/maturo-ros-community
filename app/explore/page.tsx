import { Suspense } from "react";
import SiteLayout from "@/components/SiteLayout";
import { listProjects } from "@/lib/services/project-service";
import ExploreClient from "./ExploreClient";

// 机器人社区分类与难度
const categories = ["移动机器人", "机械臂", "无人机", "ROS2 入门", "SLAM 导航", "视觉", "仿真", "其他"];
const difficulties = ["入门", "进阶", "硬核"] as const;
const tags = [
  "ROS2", "SLAM", "导航", "激光雷达", "机械臂", "MoveIt2", "视觉", "YOLO",
  "OpenCV", "PID", "仿真", "Gazebo", "传感器", "嵌入式", "树莓派",
];

export default async function ExplorePage() {
  const projects = await listProjects({});

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">项目广场</h1>
          <p className="mt-1 text-sm text-ink-secondary">浏览、搜索、筛选机器人开源项目。</p>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20 text-sm text-ink-tertiary">
              加载中…
            </div>
          }
        >
          <ExploreClient
            projects={projects}
            categories={categories}
            tags={tags}
            difficulties={difficulties}
          />
        </Suspense>
      </div>
    </SiteLayout>
  );
}
