---
description: 归档 OpenSpec change
agent: build
---

归档 OpenSpec change `$ARGUMENTS`。

先确认：
1. `proposal.md`、`design.md`、`tasks.md`、`specs/` 已齐全
2. `tasks.md` 中无未完成任务
3. 实现已经过验证

然后执行：

```bash
node .opencode/skills/openspec-archive/references/archive.js --change="$ARGUMENTS"
```

输出示例（成功）：

```
## Archive Complete

**Change:** <change-name>
**Schema:** spec-driven
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs

All artifacts complete. All tasks complete.
```

输出示例（无 delta specs）：

```
## Archive Complete

**Change:** <change-name>
**Schema:** spec-driven
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** No delta specs

All artifacts complete. All tasks complete.
```

输出示例（带警告）：

```
## Archive Complete (with warnings)

**Change:** <change-name>
**Schema:** spec-driven
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/

**Warnings:**
- 2 artifacts incomplete
- 3 tasks incomplete

Review the archive if this was not intentional.
```

输出示例（目标已存在）：

```
## Archive Failed

**Change:** <change-name>
**Target:** openspec/changes/archive/YYYY-MM-DD-<name>/

Target archive directory already exists.

**Options:**
1. Rename the existing archive
2. Wait until a different date to archive
```
