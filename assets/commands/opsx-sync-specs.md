---
description: 同步 delta specs 到 main specs
agent: build
---

将 OpenSpec change `$ARGUMENTS` 的 delta specs 智能合并到 main specs。

先执行：

```bash
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后：
1. 读取 delta specs 和对应的 main specs
2. 智能合并（新增/修改/删除/重命名需求）
3. 保留 main specs 中未提及的现有内容
4. 验证 main specs 更新正确

**这是 agent 驱动的操作** — 直接编辑 main specs 文件，运用智能合并。