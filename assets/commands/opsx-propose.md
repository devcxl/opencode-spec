---
description: 快速创建 OpenSpec planning artifacts（规划边界：仅限规划，不编辑代码）
agent: build
---

为变更 `$ARGUMENTS` 快速创建新的 OpenSpec change 与全部 planning artifacts。

**规划边界**：此命令仅创建规划 artifact。即使用户请求中包含"实现"、"构建"等词，也仅执行规划阶段。不要在同一个响应中开始实现。

执行：

```bash
node .opencode/skills/openspec-propose/references/new-change.js "$ARGUMENTS"
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后：
1. 按 status 返回的依赖顺序逐个生成 artifact（递归遍历 `requires` 边，不只是 `applyRequires`）
2. 每个待生成 artifact 先执行 `node .opencode/skills/openspec-propose/references/instructions.js <artifact-id> --change="$ARGUMENTS"`
3. 阅读依赖文件后补全 `proposal.md`、`specs/<capability-path>/spec.md`、`design.md`、`tasks.md`
4. 保持 proposal / specs / design / tasks 一致
5. 对非 trivial 变更，不要跳过这些 planning artifacts 直接实现
6. 如果 `instruction` 返回 `skipped` 标记，按照 skip_specs 处理，不创建该 artifact
7. 如果 `instruction` 标记为条件性（如 design.md 的 "create only if..."），评估条件后决定是否跳过

**命名规则：**
- 必须使用英文 kebab-case（中文需翻译）
- 至少 3 个有意义的单词，最多 8 个
- 例如："添加用户认证" → `add-user-authentication`

**capability-path 规则：**
- 对于已有 capability，保持其完整路径
- 对于新 capability，遵循项目已有的 spec 组织结构