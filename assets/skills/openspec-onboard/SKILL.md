---
name: openspec-onboard
description: Guided onboarding for OpenSpec - walk through a complete workflow cycle with narration and real codebase work.
compatibility: opencode
---

Guide the user through their first complete OpenSpec workflow cycle. This is a teaching experience—you'll do real work in their codebase while explaining each step.

---

## Preflight

Before starting, check if the OpenSpec CLI is installed:
```bash
openspec --version 2>&1 || echo "CLI_NOT_INSTALLED"
```

**If CLI not installed:**
> OpenSpec CLI is not installed. Install it first, then come back to `/opsx-onboard`.

Stop here if not installed.

---

## Phase 1: Welcome

Display:

```
## Welcome to OpenSpec!

I'll walk you through a complete change cycle—from idea to implementation—using a real task in your codebase.

**What we'll do:**
1. Pick a small, real task in your codebase
2. Explore the problem briefly
3. Create a change (the container for our work)
4. Build the artifacts: proposal → specs → design → tasks
5. Implement the tasks
6. Archive the completed change

**Time:** ~15-20 minutes

Let's start by finding something to work on.
```

---

## Phase 2: Task Selection

### Codebase Analysis

Scan the codebase for small improvement opportunities. Look for:
1. **TODO/FIXME comments** - Search for `TODO`, `FIXME`, `HACK`, `XXX` in code files
2. **Missing error handling** - `catch` blocks that swallow errors
3. **Functions without tests** - Cross-reference `src/` with test directories
4. **Type issues** - `any` types in TypeScript files
5. **Debug artifacts** - `console.log`, `console.debug`, `debugger` statements
6. **Missing validation** - User input handlers without validation

Also check recent git activity:
```bash
git log --oneline -10 2>/dev/null || echo "No git history"
```

### Present Suggestions

From your analysis, present 3-4 specific suggestions.

**If nothing found:** Fall back to asking what the user wants to build.

### Scope Guardrail

If the user picks something too large, suggest slicing it smaller.

---

## Phase 3: Explore Demo

Once a task is selected, briefly demonstrate explore mode. Spend 1-2 minutes investigating the relevant code.

**PAUSE** - Wait for user acknowledgment before proceeding.

---

## Phase 4: Create the Change

**EXPLAIN:** A "change" in OpenSpec is a container for all the thinking and planning around a piece of work.

**DO:** Create the change:
```bash
node .opencode/skills/openspec-propose/references/new-change.js "<derived-name>"
```

**SHOW:** The folder structure.

---

## Phase 5: Proposal

**EXPLAIN:** The proposal captures **why** we're making this change.

**DO:** Draft the proposal content, wait for approval, then save.

---

## Phase 6: Specs

**EXPLAIN:** Specs define **what** we're building in precise, testable terms.

**DO:** Create the spec file, explaining the WHEN/THEN format.

---

## Phase 7: Design

**EXPLAIN:** The design captures **how** we'll build it.

**DO:** Draft design.md.

---

## Phase 8: Tasks

**EXPLAIN:** Break the work into implementation tasks.

**DO:** Generate tasks based on specs and design.

**PAUSE** - Wait for user to confirm they're ready to implement.

---

## Phase 9: Apply (Implementation)

**EXPLAIN:** Now we implement each task.

**DO:** For each task, implement and mark complete.

After all tasks:
```
## Implementation Complete

All tasks done! The change is implemented! One more step—let's archive it.
```

---

## Phase 10: Archive

**EXPLAIN:** When a change is complete, we archive it. Archived changes become your project's decision history.

**DO:** Archive the change:
```bash
node .opencode/skills/openspec-archive/references/archive.js --change="<name>"
```

---

## Phase 11: Recap & Next Steps

```
## Congratulations!

You just completed a full OpenSpec cycle:

1. **Explore** - Thought through the problem
2. **New** - Created a change container
3. **Proposal** - Captured WHY
4. **Specs** - Defined WHAT in detail
5. **Design** - Decided HOW
6. **Tasks** - Broke it into steps
7. **Apply** - Implemented the work
8. **Archive** - Preserved the record

**Command Reference:**

 | Command                | What it does                    |
 |------------------------|---------------------------------|
 | `/opsx-propose`        | Create a change + all artifacts |
 | `/opsx-explore`        | Think through problems          |
 | `/opsx-apply`          | Implement tasks                 |
 | `/opsx-archive`        | Archive a completed change      |

 | Command                    | What it does                        |
 |----------------------------|-------------------------------------|
 | `/opsx-new-change`         | Start a new change, step by step    |
 | `/opsx-continue-change`    | Continue an existing change         |
 | `/opsx-ff-change`          | Fast-forward: all artifacts at once |
 | `/opsx-verify-change`      | Verify implementation               |
```

---

## Graceful Exit Handling

### User wants to stop mid-way

```
No problem! Your change is saved.

To pick up where we left off later:
- `/opsx-continue-change <name>` - Resume artifact creation
- `/opsx-apply <name>` - Jump to implementation (if tasks exist)
```

## Guardrails

- **Follow the EXPLAIN → DO → SHOW → PAUSE pattern** at key transitions
- **Keep narration light** during implementation—teach without lecturing
- **Don't skip phases** even if the change is small
- **Pause for acknowledgment** at marked points, but don't over-pause
- **Handle exits gracefully**—never pressure the user to continue
- **Use real codebase tasks**—don't simulate or use fake examples