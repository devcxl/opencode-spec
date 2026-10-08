## Why

插件启动时会把内置 skills 和 templates 复制到系统临时目录，以便改写 skill 中的脚本路径。该副本不需要被用户编辑或持久化，却增加了启动时的文件复制、临时目录清理和生命周期错误处理。资源已经随插件包发布，直接从包内只读加载更简单，也能避免卸载或进程异常后留下临时文件。

## What Changes

- 从插件包内的 `assets/skills/` 直接加载并注册 skills；在内存中改写 skill 内容里的脚本引用，使参考脚本从包内资源路径执行。
- 从插件包内的 `assets/templates/` 读取内置模板，保留项目自定义模板优先和默认模板兜底行为。
- 移除 skills 与 templates 的临时目录复制、基于临时目录的路径推导和清理流程。
- 保持 skill 名称、指令、参考脚本行为及 `OPENSPEC_DIR` 对项目数据目录的隔离语义不变。

## Capabilities

### New Capabilities

- `plugin-resource-loading`: 从插件包只读资源直接注册 skills 并读取内置模板，不创建临时副本。

### Modified Capabilities

- `templates`: 将内置模板来源从临时副本改为插件包资源，同时保留既有覆盖和兜底优先级。

## Impact

- 主要涉及 `src/plugin/skills.ts`、`src/plugin/server.ts`、`assets/skills/_shared/references/openspec.js` 及相关插件和参考脚本测试。
- 不新增依赖、不向项目目录安装或覆盖 skill 文件；需要验证 npm 包仍包含运行所需的 skills、scripts 和 templates。
