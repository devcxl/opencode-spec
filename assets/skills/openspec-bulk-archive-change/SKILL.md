---
name: openspec-bulk-archive-change
description: Archive multiple completed changes at once. Use when archiving several parallel changes.
compatibility: opencode
---

Archive multiple completed changes in a single operation.

This skill allows you to batch-archive changes, handling spec conflicts intelligently by checking the codebase to determine what's actually implemented.

`<capability-path>` is the spec directory relative to `specs/` (for example, `user-auth` or `identity/user-auth`). Preserve the full path from each delta spec when resolving its main spec.

**Input**: None required (prompts for selection)

**Steps**

1. **Get active changes**

   Run `node .opencode/skills/openspec-explore/references/list.js` to get all active changes.

   If no active changes exist, inform user and stop.

2. **Prompt for change selection**

   Ask the user to choose changes (multi-select):
   - Show each change with its schema
   - Include an option for "All changes"
   - Allow any number of selections (1+ works, 2+ is the typical use case)

   **IMPORTANT**: Do NOT auto-select. Always let the user choose.

3. **Batch validation - gather status for all selected changes**

   For each selected change, collect:

   a. **Artifact status** - Run `node .opencode/skills/openspec-propose/references/status.js "<name>"`
      - Parse `schemaName`, `artifacts`, `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`
      - Note which artifacts are `done` vs other states

   b. **Task completion** - Read `artifactPaths.tasks.existingOutputPaths` from status JSON
      - Count `- [ ]` (incomplete) vs `- [x]` (complete)
      - If no tasks file exists, note as "No tasks"

   c. **Delta specs** - Check `artifactPaths.specs.existingOutputPaths` from status JSON
      - List which capability specs exist
      - For each, extract requirement names (lines matching `### Requirement: <name>`)
      - Treat this list as the only delta-spec source. If the `specs` entry is missing or the list is empty, perform no spec sync for that change.

4. **Detect spec conflicts**

   Build a map keyed by `<capability-path>`:

   ```text
   identity/user-auth -> [change-a, change-b]  <- CONFLICT (2+ changes)
   billing/user-auth  -> [change-c]            <- OK (different full path)
   ```

   A conflict exists when 2+ selected changes have delta specs for the exact same `<capability-path>`.

5. **Resolve conflicts agentically**

   **For each conflict**, investigate the codebase:

   a. **Read the delta specs** from each conflicting change
   b. **Search the codebase** for implementation evidence
   c. **Determine resolution**:
      - If only one change is actually implemented -> sync that one's specs
      - If both implemented -> apply in chronological order (older first, newer overwrites)
      - If neither implemented -> skip spec sync, warn user

6. **Show consolidated status table**

   Display a table summarizing all changes:

   ```markdown
   | Change              | Artifacts | Tasks | Specs   | Conflicts | Status |
   |---------------------|-----------|-------|---------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | None      | Ready  |
   | add-oauth           | Done      | 4/4   | 1 delta | identity/user-auth (!) | Ready* |
   ```

7. **Confirm batch operation**

   Ask the user a single confirmation question:
   - "Archive N changes?" with options based on status

   Route on the answer by intent:
   - "Cancel" — stop, do not archive. Report that nothing was archived.
   - The archive-everything option — proceed with every selected change
   - The ready-only option — proceed with only the changes marked `Ready` or `Ready*`

8. **Execute archive for each confirmed change**

   Process changes in the determined order. For each change:

   a. **Sync included delta specs**:
      - Run the sync inline (agent-driven intelligent merge) for changes with delta specs, passing only the included delta paths
      - Do not delegate to a background task — step 8c would move `changeRoot` out from under a sync

   b. **Verify included delta specs before moving changeRoot**:
      - Re-run the comparison only for delta specs that were synced
      - If sync failed, do not archive that change

   c. **Perform the archive**:
      ```bash
      node .opencode/skills/openspec-archive/references/archive.js --change="<name>"
      ```

9. **Display summary**

   Show final results:

   ```markdown
   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management-cli -> archive/YYYY-MM-DD-schema-management-cli/
   - project-config -> archive/YYYY-MM-DD-project-config/
   - add-oauth -> archive/YYYY-MM-DD-add-oauth/
   ```

**Guardrails**
- Allow any number of changes (1+ is fine, 2+ is the typical use case)
- Always prompt for selection, never auto-select
- Detect spec conflicts early and resolve by checking codebase
- When both changes are implemented, apply specs in chronological order
- Skip spec sync only when implementation is missing (warn user)
- Show clear per-change status before confirming
- Use single confirmation for entire batch
- Never archive after the user cancels the confirmation
- Track and report all outcomes (success/skip/fail)
- Never archive a change while a spec sync is still in flight