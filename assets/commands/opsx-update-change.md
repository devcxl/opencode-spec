---
description: 更新 planning artifacts 并保持一致性
agent: build
---

更新 OpenSpec change `$ARGUMENTS` 的 planning artifacts。

先执行：

```bash
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后：
1. 读取所有现有 artifact
2. 按用户请求进行编辑，并检查其他 artifact 是否产生不一致
3. 每次修改前先向用户确认
4. **只编辑已存在的文件，不创建新 artifact**
5. 如果需求变更了意图而非精炼，建议新建变更

**绝不编辑代码。**