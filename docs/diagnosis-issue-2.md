## 诊断报告

### 发现

Issue 报告的两个问题均确认存在，属于代码审查级别的 bug：

1. **OPENSPEC_DIR 环境变量只写不读**：`src/plugin/server.ts` 中 `process.env.OPENSPEC_DIR` 仅被写入（line 23, 42），TypeScript 核心代码（`src/`）从未读取该环境变量。README 声明的"也可通过环境变量 OPENSPEC_DIR 指定，优先级高于配置"功能未在核心模块中实现。

2. **design.ts / tasks.ts 硬编码路径**：`src/core/artifact/design.ts` 和 `src/core/artifact/tasks.ts` 使用 `path.join(targetDir, "design.md")` / `path.join(targetDir, "tasks.md")` 硬编码文件名，而 `src/util/paths.ts` 中已定义了 `designPath()` 和 `tasksPath()` 函数，且 `proposal.ts` 已正确使用 `proposalPath()`。

### 原因

#### Bug 1：OPENSPEC_DIR 环境变量

**写入位置**（`src/plugin/server.ts`）：
- Line 23：`options.directory` 设置时写入 `process.env.OPENSPEC_DIR`
- Line 42：`config.openspec.directory` 设置时写入 `process.env.OPENSPEC_DIR`

**读取位置**：仅在 `assets/skills/_shared/references/openspec.js`（技能参考脚本）的 `openspecRoot()` 函数（line 486）中读取：
```js
export function openspecRoot(projectDir = projectRoot) {
  return path.join(projectDir, process.env.OPENSPEC_DIR || "openspec")
}
```

**核心模块**（`src/util/paths.ts`）的 `openspecRoot()` 函数使用模块级变量 `_openspecDir`，该变量仅通过 `setOpenspecDir()` 设置，从不读取环境变量：
```ts
let _openspecDir = "openspec"

export function setOpenspecDir(dir: string) { ... }
export function getOpenspecDir() { return _openspecDir }

export function openspecRoot(projectDir: string) {
  return path.join(projectDir, _openspecDir)
}
```

**根因**：插件工厂函数 `createOpencodeSpec()` 在启动时没有检查 `process.env.OPENSPEC_DIR` 并调用 `setOpenspecDir()`。当前优先级链为 `options > config > default`，缺少 `env` 这一层。

#### Bug 2：硬编码路径

**`src/core/artifact/design.ts`** line 20：
```ts
const filePath = path.join(targetDir, "design.md")
```
应改为使用已定义的 `designPath()`：
```ts
import { designPath } from "../../util/paths.js"
const filePath = designPath(input.projectDir, slug)
```

**`src/core/artifact/tasks.ts`** line 21：
```ts
const filePath = path.join(targetDir, "tasks.md")
```
应改为使用已定义的 `tasksPath()`：
```ts
import { tasksPath } from "../../util/paths.js"
const filePath = tasksPath(input.projectDir, slug)
```

**对比**：`src/core/artifact/proposal.ts` line 21 已正确使用 `proposalPath()`。

**额外发现**：`src/core/workflow/validate.ts`（lines 44-45）和 `src/core/change/list.ts`（line 31）也存在类似的硬编码，但 Issue 未要求修复这些位置。

### 修复建议

#### 修复 1：OPENSPEC_DIR 环境变量读取

在 `src/plugin/server.ts` 的 `createOpencodeSpec()` 函数开头，`options.directory` 检查之前，增加环境变量检查：

```ts
export function createOpencodeSpec(packageRoot: string): Plugin {
  return async (_ctx, options) => {
    // 优先级：env > options > config > default
    if (process.env.OPENSPEC_DIR?.trim()) {
      setOpenspecDir(process.env.OPENSPEC_DIR.trim())
    }

    if (options?.directory && typeof options.directory === "string" && options.directory.trim()) {
      const dir = options.directory.trim()
      setOpenspecDir(dir)
      process.env.OPENSPEC_DIR = dir
    }
    // ... 其余逻辑不变
```

注意：`options.directory` 设置时仍需同步写入 `process.env.OPENSPEC_DIR`，以确保技能参考脚本（`assets/skills/_shared/references/openspec.js`）也能读到正确的目录名。

#### 修复 2：design.ts / tasks.ts 使用 paths 函数

**`src/core/artifact/design.ts`**：
- 新增 import：`import { designPath } from "../../util/paths.js"`
- 将 `path.join(targetDir, "design.md")` 替换为 `designPath(input.projectDir, slug)`

**`src/core/artifact/tasks.ts`**：
- 新增 import：`import { tasksPath } from "../../util/paths.js"`
- 将 `path.join(targetDir, "tasks.md")` 替换为 `tasksPath(input.projectDir, slug)`

### 验证方法

1. **Bug 1 验证**：
   - 设置 `OPENSPEC_DIR=custom-dir` 环境变量后启动插件
   - 调用 `initializeOpenSpec()` 应创建 `custom-dir/specs/`、`custom-dir/changes/` 等目录
   - 未设置环境变量时，`options.directory` 和 `config.openspec.directory` 正常生效
   - 均未设置时使用默认值 `openspec`

2. **Bug 2 验证**：
   - 运行现有测试套件（`npx vitest run`），所有与 design/tasks 相关的测试应通过
   - 自定义 `OPENSPEC_DIR` 后调用 `updateDesign()` / `updateTasks()`，文件应写入正确的自定义目录

3. **回归验证**：
   - `npx vitest run` 全部通过（当前基线：60/62 passed，2 个 reference-scripts 测试失败为已有问题，非本次修复引入）
