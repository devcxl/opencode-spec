---
description: 继续创建下一个 artifact
agent: build
---

继续 OpenSpec change `$ARGUMENTS`，创建下一个 artifact。

先执行：

```bash
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后：
1. 检查 `isPlanningComplete` 状态
2. 如果已完成 → 提示用户实现
3. 如果还有 `ready` artifact → 取第一个，执行 `node .opencode/skills/openspec-propose/references/instructions.js <artifact-id> --change="$ARGUMENTS"`
4. 阅读依赖文件后创建该 artifact
5. **每次只创建一个 artifact**，然后停止