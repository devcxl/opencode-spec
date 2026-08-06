---
description: 批量归档多个变更
agent: build
---

批量归档多个 OpenSpec changes。

先执行列出所有变更：

```bash
node .opencode/skills/openspec-explore/references/list.js
```

然后：
1. 提示用户选择要归档的变更（多选）
2. 检测 spec 冲突并 agentic 解决（检查代码库确认实际实现）
3. 显示汇总状态表
4. 确认后逐个执行归档
5. 同步 delta specs 到 main specs

**始终提示用户选择，不自动选择。**