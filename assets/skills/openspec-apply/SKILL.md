---
name: openspec-apply
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
compatibility: opencode
---

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

 If a name is provided, use it. Otherwise:
 - Infer from conversation context if the user mentioned a change
 - Auto-select if only one active change exists
  - If ambiguous, run `node .opencode/skills/openspec-explore/references/list.js` to get available changes and use the **question tool** to let the user select

 Always announce: "Using change: <name>" and how to override (e.g., `/opsx-apply <name>`).

2. **Check status to understand the schema**
   ```bash
    node .opencode/skills/openspec-propose/references/status.js "<name>"
   ```
 Parse the JSON to understand:
 - `schemaName`: The workflow being used (e.g., "spec-driven")
 - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   node .opencode/skills/openspec-apply/references/prepare-apply.js --change="<name>"
   ```

 This returns:
 - Context file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
 - Progress (total, complete, remaining)
 - Task list with status
 - Dynamic instruction based on current state

 **Handle states:**
 - If `state: "blocked"` (missing artifacts): show message, suggest using other workflow
 - If `state: "all_done"`: congratulate, suggest archive
 - Otherwise: proceed to implementation

4. **Read context files**

 Read the files listed in `contextFiles` from the prepare-apply output.
 The files depend on the schema being used:
 - **spec-driven**: proposal, specs, design, tasks
 - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

 Display:
 - Schema being used
 - Progress: "N/M tasks complete"
 - Remaining tasks overview
 - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

 For each pending task:
 - Show which task is being worked on
 - Make the code changes required
 - Keep changes minimal and focused
 - Mark task complete using:
   ```bash
   node .opencode/skills/openspec-apply/references/mark-tasks.js --change="<name>" --complete-ids=<task-id>
   ```
 - Continue to next task

 **Pause if:**
 - Task is unclear → ask for clarification
 - Implementation reveals a design issue → suggest updating artifacts
 - Error or blocker encountered → report and wait for guidance
 - User interrupts

7. **On completion or pause, show status**

 Display:
 - Tasks completed this session
 - Overall progress: "N/M tasks complete"
 - If all done: suggest archive
 - If paused: explain why and wait for guidance

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change.
```

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the prepare-apply output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
