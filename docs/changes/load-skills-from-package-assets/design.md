## Context

`createOpencodeSpec()` currently copies `assets/skills/` and `assets/templates/` into a unique OS temporary directory before registering skills. The copy allows runtime path rewriting, but the published package already contains the scripts and templates in a stable relative layout. OpenCode V2 registration accepts skill content and a source path, so the copied tree is not needed for registration.

The reference scripts must continue to write workflow data under the workspace-selected `OPENSPEC_DIR`; package resource paths are only for reading instructions, scripts, and templates.

## Goals / Non-Goals

**Goals:**
- Load skill definitions and reference scripts directly from the installed plugin package.
- Apply command/script path substitutions to the `Skill.Info` content in memory without changing packaged files.
- Resolve built-in templates from the package while preserving project override and hard-coded fallback priority.
- Remove temporary resource creation, cleanup, and error aggregation that exists only to manage that copy.
- Preserve workspace data isolation and the registered skill IDs, aliases, and behavior.

**Non-Goals:**
- Do not install or copy skills into the user's project directory.
- Do not add a configurable resource directory or a persistent cache.
- Do not change artifact templates, skill workflows, or reference-script business behavior.
- Do not change how `OPENSPEC_DIR` is resolved or how OpenCode discovers plugins.

## Decisions

### Use the installed package as the immutable resource root

Pass the existing `packageRoot` through plugin setup and use `packageRoot/assets/skills` as the source for `loadSkills()`. Set each registered skill's `path` to its package `SKILL.md` file. Transform the skill body in memory: replace `.opencode/skills/` references with the package skills directory and render script invocations with the workspace's resolved `OPENSPEC_DIR`.

This keeps packaged resources read-only and gives reference scripts a stable sibling layout for their relative imports. The plugin package is the single source of truth; there is no project-local copy to become stale.

### Remove the temporary deployment lifecycle

Delete `setupSkillsDir()` and `cleanupSkillsDir()` and remove their use from `server.ts`. Plugin setup no longer creates a temp directory, and unload has no generated resource directory to remove. Setup errors continue to propagate; they no longer need cleanup-error aggregation for this resource copy.

### Resolve templates relative to the packaged reference script

Keep the existing template precedence: project override, package-bundled template, then `DEFAULT_TEMPLATES`. The reference script's location under `assets/skills/_shared/references/` has the same relative relationship to `assets/templates/` in both source and packed package layouts, so bundled templates can be read directly without changing their contents or copying them.

Only a missing optional template falls through to the next source. If a bundled template exists but cannot be read, propagate the I/O error rather than silently masking a package or permission defect.

### Preserve workspace boundaries

Package paths locate immutable resources only. Each command continues to render its own resolved `OPENSPEC_DIR` into script invocations; scripts must not use the package path as a project data root. No mutable process-global resource or workspace state is introduced.

## Risks / Trade-offs

- **Package contents:** direct loading depends on npm distributions including `assets/skills`, `assets/templates`, and all referenced scripts. Verify the packed package and exercise a packaged plugin in tests.
- **Path rendering:** a missing or incorrectly quoted package path could make reference commands fail, especially when the package path contains spaces. Keep shell quoting in the renderer and test the rendered invocation.
- **Template-relative layout:** moving the reference script independently of `assets/templates` would break relative resolution. Keep the package layout covered by a template-loading test.
- **Rollback:** this changes only plugin resource loading; no user data migration is required. Reverting the loader and server changes restores the prior temporary-copy behavior.
