## Agent Brief

**类别：** bug
**摘要：** 修复 OPENSPEC_DIR 环境变量只写不读的 bug，以及 design.ts/tasks.ts 硬编码路径的不一致

### 问题 1：OPENSPEC_DIR 环境变量只写不读

**当前行为：**
`src/plugin/server.ts` 中 `process.env.OPENSPEC_DIR` 仅被写入（`options.directory` 和 `config.openspec.directory` 设置时），但核心模块 `src/util/paths.ts` 的 `openspecRoot()` 使用模块级变量 `_openspecDir`，从不读取环境变量。README 声明的「可通过环境变量 OPENSPEC_DIR 指定，优先级高于配置」未实现。

**期望行为：**
在 `createOpencodeSpec()` 入口处，先检查 `process.env.OPENSPEC_DIR` 并调用 `setOpenspecDir()`。优先级链：**env > options > config > default**。

**关键接口：**
- `setOpenspecDir(dir: string)` — 新增环境变量读取路径
- `getOpenspecDir()` — 返回值应正确反映环境变量设置
- `openspecRoot(projectDir)` — 使用 `_openspecDir`，由 `setOpenspecDir` 设置

### 问题 2：design.ts / tasks.ts 硬编码路径

**当前行为：**
`src/core/artifact/design.ts:20` 使用 `path.join(targetDir, "design.md")`，`src/core/artifact/tasks.ts:21` 使用 `path.join(targetDir, "tasks.md")`，而 `src/util/paths.ts` 已定义 `designPath()` 和 `tasksPath()`。

**期望行为：**
- `design.ts` 使用 `designPath(input.projectDir, slug)` 生成路径
- `tasks.ts` 使用 `tasksPath(input.projectDir, slug)` 生成路径

**验收标准：**
- [ ] 设置 `OPENSPEC_DIR` 环境变量后，`getOpenspecDir()` 返回环境变量指定的值
- [ ] 环境变量优先级高于 `options.directory` 和 `config.openspec.directory`
- [ ] 未设置环境变量时，`options.directory` 和 `config.openspec.directory` 正常生效
- [ ] 环境变量、options、config 均未设置时，使用默认值 "openspec"
- [ ] `design.ts` 使用 `designPath()` 函数生成路径
- [ ] `tasks.ts` 使用 `tasksPath()` 函数生成路径
- [ ] 所有测试通过（基线 60/62 passed，2 个 reference-scripts 失败为已有问题）
- [ ] 无回归

**不在范围内：**
- `src/core/workflow/validate.ts` 和 `src/core/change/list.ts` 中类似的硬编码路径问题
- 技能参考脚本 `assets/skills/_shared/references/openspec.js` 中的任何变更
