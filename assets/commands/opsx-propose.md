---
description: 创建 OpenSpec proposal
agent: build
---

为变更 `$ARGUMENTS` 创建新的 OpenSpec change。

先调用工具 `openspec-propose`：
- name: $ARGUMENTS

然后：
1. 阅读生成的 `proposal.md`、`design.md`、`tasks.md`、`specs/spec.md`
2. 结合仓库上下文补全 proposal、design、tasks
3. 保持 proposal / design / tasks / spec 一致
4. 对非 trivial 变更，不要跳过 proposal、design、tasks 直接实现
