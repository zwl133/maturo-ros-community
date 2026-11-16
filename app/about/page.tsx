import SiteLayout from "@/components/SiteLayout";

export default function AboutPage() {
  return (
    <SiteLayout>
      <div className="container-page py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-ink">关于出云科技</h1>
          <p className="mt-4 leading-relaxed text-ink-secondary">
            出云科技是一个面向硬件爱好者与学生的开源硬件项目社区。我们整理和分享可复刻的硬件项目——
            原理图、BOM、固件、制作步骤一应俱全，让每一个想动手的人都能照着做出来。
          </p>

          <h2 id="license" className="mt-10 text-lg font-semibold text-ink">开源协议说明</h2>
          <div className="mt-3 flex flex-col gap-3 text-sm text-ink-secondary">
            <p>每个项目都标注了对应的开源协议，使用前请确认并遵守协议条款。本站常见的协议包括：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>MIT</strong>：宽松协议，允许任意使用，但需保留版权声明。</li>
              <li><strong>Apache-2.0</strong>：允许商用，需保留版权与许可证，注明修改。</li>
              <li><strong>GPL-3.0</strong>：衍生作品需同样以 GPL 开源。</li>
              <li><strong>CERN-OHL-S</strong>：开源硬件协议，硬件设计需保持开源。</li>
              <li><strong>CC-BY-SA-4.0</strong>：署名 + 相同方式共享。</li>
              <li><strong>CC-BY-NC-4.0</strong>：署名 + 非商业使用。</li>
            </ul>
          </div>

          <h2 id="disclaimer" className="mt-10 text-lg font-semibold text-ink">免责声明</h2>
          <div className="mt-3 flex flex-col gap-2 text-sm text-ink-secondary">
            <p>
              本站为演示环境。项目信息、物料型号与价格均为参考，可能存在误差，实际以官方渠道和实物为准。
            </p>
            <p>
              用户在复刻过程中产生的任何人身、财产损失，以及因使用开源项目内容引发的版权纠纷，由使用者自行承担。
            </p>
            <p>请在进行涉及高压、锂电池、焊接等操作时注意安全，遵守相关规范。</p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
