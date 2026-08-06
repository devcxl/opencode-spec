---
name: openspec-archive
description: Archive a completed change, merging delta specs into main. Use when the user wants to finalize and archive a change after implementation is complete.
compatibility: opencode
---

Archive a completed change in the OpenSpec workflow.

`<capability-path>` is the spec directory relative to `specs/` (for example, `user-auth` or `identity/user-auth`). Preserve the full path from each delta spec when resolving its main spec.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `node .opencode/skills/openspec-explore/references/list.js` to get available changes. Use the **question tool** to let the user select.

   When prompting, show only active changes (not already archived).
   Include the schema used for each change if available.

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-archive <name>`).

   **Load current archive inputs before the existing archive checks:**

   After resolving the selected change, run:
   ```bash
   node .opencode/skills/openspec-archive/references/archive.js --change="<name>" --instructions
   ```
   This lookup is advisory and optional: it only supplies extra prompt inputs, so it must never block archiving.
   If it exits non-zero or returns invalid JSON, continue the archive workflow with no context and no operation guidance. Do not report an error and do not stop.

   A successful response may omit both optional fields. Treat `context` as a required prompt-level input: read and consider it, and apply relevant project facts, conventions, and constraints. Treat `operationGuidance` as optional additive advice: read and consider every entry, and follow entries that are applicable and compatible with the built-in archive workflow.

   Keep both fields separate from built-in steps, explicit user choices, resolved paths, CLI checks, and command contracts. If context conflicts with one of those controlling inputs, report the conflict and preserve the controlling value. If guidance is inapplicable or conflicts with a controlling input, do not follow it and explain why. Do not infer replacement paths, skipped prompts, or flags from either field, and do not copy their text verbatim into specs, change artifacts, or archive summaries unless the user separately asks for it.

2. **Check artifact completion status**

   Run `node .opencode/skills/openspec-propose/references/status.js "<name>"` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context
   - `artifacts`: List of artifacts with their status (`done`, `skipped`, or other)

   **If any artifacts are neither `done` nor `skipped`** (skipped artifacts satisfy the requirement - the change declares skip_specs):
   - Display warning listing incomplete artifacts
   - Use the **question tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Use the **question tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Assess delta spec sync state**

   Use `artifactPaths.specs.existingOutputPaths` from status JSON as the only delta-spec source. If the `specs` entry is missing or `existingOutputPaths` is empty, proceed without a sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `<planningHome.root>/openspec/specs/<capability-path>/spec.md` (use the store-aware `planningHome.root` from step 2)
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   Route on the answer:
   - "Cancel" — stop, do not archive
   - "Archive without syncing" or "Archive now" — proceed to archive
   - "Sync now" or "Sync anyway" — sync, then verify (below)
   - Anything else — ask again rather than archiving

   Before a selected sync writes any main spec, run `node .opencode/skills/openspec-propose/references/instructions.js specs --change="<name>"` once. If the lookup fails or returns invalid JSON, report the error and stop before writing any main spec or moving the change. Apply returned `rules` only to the content and form of main specs produced by this merge; do not use them as archive guidance, change CLI behavior, or copy the rule text into any output file.

   Then run the inline sync for change '<name>', passing the delta spec analysis and the fetched specs-rule snapshot. The inline sync must reuse that snapshot without fetching instructions again. Do not delegate it to a background task — step 5 would move `changeRoot` out from under a sync that is still reading it.

   Then re-run the comparison. A successful sync leaves nothing left to apply. If the sync failed, or any capability does not match, report what differs and stop — do not archive. Nothing has moved and `changeRoot` is intact.

5. **Perform the archive**

   ```bash
   node .opencode/skills/openspec-archive/references/archive.js --change="<name>"
   ```

   Generate target name using current date: `YYYY-MM-DD-<name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable)
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")

<"All artifacts complete. All tasks complete." — or, if archived with warnings, list them instead>
```

**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- When moving to archive, the change directory moves as-is with the date prefix
- Show clear summary of what happened
- If sync is requested, run the inline sync and verify the main specs before moving `changeRoot`
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
- Apply relevant runtime context and report conflicts; operation guidance remains advisory
- Consider every guidance entry and explain any inapplicable or conflicting advice
- Existing CLI checks, resolved paths, prompts, and command contracts are unchanged
- Artifact rules constrain only the specs being written and are never operation guidance
- Never copy runtime context, operation guidance, or artifact-rule text verbatim into output files