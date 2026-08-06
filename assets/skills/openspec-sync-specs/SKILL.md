---
name: openspec-sync-specs
description: Sync delta specs from a change to main specs. Use when the user wants to update main specs with changes from a delta spec, without archiving the change.
compatibility: opencode
---

Sync delta specs from a change to main specs.

This is an **agent-driven** operation - you will read delta specs and directly edit main specs to apply the changes. This allows intelligent merging (e.g., adding a scenario without copying the entire requirement).

`<capability-path>` is the spec directory relative to `specs/` (for example, `user-auth` or `identity/user-auth`). Preserve the full path from each delta spec when resolving its main spec.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `node .opencode/skills/openspec-explore/references/list.js` to get available changes and use the **question tool** to let the user select

   When prompting, show changes that have delta specs (under `specs/` directory).

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-sync-specs <other>`).

2. **Resolve change context**

   Run:
   ```bash
   node .opencode/skills/openspec-propose/references/status.js "<name>"
   ```

   The JSON includes `planningHome.root`. Main specs live under `<planningHome.root>/openspec/specs/` — use that (store-aware) root for every main-spec path below.

3. **Find delta specs**

   Use `artifactPaths.specs.existingOutputPaths` from the status JSON as the only source of delta spec paths. If the `specs` entry is missing or `existingOutputPaths` is empty, report that there are no delta specs to sync and stop.

   Each delta spec file contains sections like:
   - `## ADDED Requirements` - New requirements to add
   - `## MODIFIED Requirements` - Changes to existing requirements
   - `## REMOVED Requirements` - Requirements to remove
   - `## RENAMED Requirements` - Requirements to rename (FROM:/TO: format)

   If no delta specs found, inform user and stop.

4. **For each delta spec, apply changes to main specs**

   For each capability delta spec path selected in step 3:

   a. **Read the delta spec** to understand the intended changes

   b. **Read the main spec** at `<planningHome.root>/openspec/specs/<capability-path>/spec.md` (may not exist yet)

   c. **Apply changes intelligently**:

      **ADDED Requirements:**
      - If requirement doesn't exist in main spec → add it
      - If requirement already exists → update it to match (treat as implicit MODIFIED)

      **MODIFIED Requirements:**
      - Find the requirement in main spec
      - Apply the changes - this can be adding new scenarios, modifying existing scenarios, changing the requirement description
      - Preserve scenarios/content not mentioned in the delta

      **REMOVED Requirements:**
      - Remove the entire requirement block from main spec
      - Retiring the capability: delete the whole `spec.md` only when ALL of these hold:
        1. removing the requirements left no requirement blocks;
        2. the rest of the spec is well-formed (it still has a `## Purpose`);
        3. the main spec was not already empty before this sync;
        4. the change's `.openspec.yaml` declares `retire_capabilities: true`;
        5. the `spec.md` resolves inside the real specs root (do not follow a symlink).

      **RENAMED Requirements:**
      - Find the FROM requirement, rename to TO

   d. **Create new main spec** if capability doesn't exist yet:
      - Create `<planningHome.root>/openspec/specs/<capability-path>/spec.md`
      - Add Purpose section: copy the delta's `## Purpose` body verbatim when it has one
      - Add Requirements section with the ADDED requirements

5. **Validate updated main specs**

   If `openspec validate` CLI is available, run `openspec validate --specs` to validate. If validation fails, report the problems.

6. **Show summary**

   After applying all changes, summarize:
   - Which capabilities were updated
   - What changes were made (requirements added/modified/removed/renamed)
   - Any new main spec left with a TBD Purpose placeholder
   - Any capability retired, naming the deleted `spec.md`

**Delta Spec Format Reference**

```markdown
## Purpose
Only on a delta that introduces a brand-new capability. Seeds the new main spec.

## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL keep doing the existing thing, now also handling A.

#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements
- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

**Key Principle: Intelligent Merging**

Unlike programmatic merging, you merge rather than overwrite:
- A MODIFIED block carries the whole requirement - body plus every scenario that survives the change
- Keep anything the delta does not mention, in the main spec's existing order
- Use your judgment to merge changes sensibly

**Guardrails**
- Read both delta and main specs before making changes
- Preserve existing content not mentioned in delta
- Never copy a delta file into a main spec as-is - merge its content
- If something is unclear, ask for clarification
- Show what you're changing as you go
- The operation should be idempotent - running twice should give same result
- Use only `artifactPaths.specs.existingOutputPaths`; never infer delta specs from unrelated artifacts