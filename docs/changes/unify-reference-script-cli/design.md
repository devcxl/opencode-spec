## Context

`assets/skills/_shared/references/openspec.js` owns the workflow operations and shared JSON CLI helpers. Seven small scripts in the propose, apply, archive, and explore skill directories parse arguments and call those exports. Skill and command content references the separate paths; `src/plugin/skills.ts` rewrites those calls to package paths and adds a shell-quoted, per-invocation `OPENSPEC_DIR`. The package already includes `assets/`, and Node ESM is available for executing these scripts.

## Goals / Non-Goals

**Goals:**
- Give all workflow operations one package-local Node entry point.
- Keep domain operations in the existing shared module and preserve their behavior, JSON results, error handling, and workspace isolation.
- Make every bundled instruction and test use the same CLI path.

**Non-Goals:**
- Do not combine the workflow implementation and CLI dispatcher into one large module.
- Do not depend on or install the upstream OpenSpec CLI, add a dependency, or create a globally linked npm executable.
- Do not change archive semantics, artifact behavior, or the `OPENSPEC_DIR` resolution contract.

## Decisions

### Use one package-local dispatcher and keep the domain module

Add `assets/skills/_shared/references/openspec-cli.js` as the sole executable entry point. It dispatches `list`, `new-change`, `status`, `instructions`, `prepare-apply`, `mark-tasks`, and `archive` to the existing exports in `openspec.js`. The dispatcher owns subcommand selection and argument validation, then delegates result/error serialization to the existing `runJsonCli` helper. Argument parsing should reuse `getArgValue` and `hasFlag` where their existing syntax applies; operation functions remain responsible for domain validation and persistence.

This makes the agent-facing script path singular without flattening the 1,300-line workflow module or introducing a general command framework. The separate CLI file also avoids running command dispatch when tests or other code import the domain module.

### Replace bundled operation-specific paths

Update all Skill and Command examples and explanatory references to invoke the shared path with a subcommand, retaining each operation's current arguments. Update the bilingual architecture, usage, and reference documentation to show the single CLI. Change the onboard preflight check to test the single CLI file, then delete the seven old wrappers. Do not retain wrapper shims: no stable external wrapper-path contract is documented, and the bundle's own callers can migrate together.

The shared CLI remains under `assets/skills/`, so the existing skill renderer can rewrite the placeholder and inject the workspace-specific `OPENSPEC_DIR`. No plugin loader or resource-copy changes are needed.

### Preserve process and output boundaries

Each shell invocation receives its own quoted `OPENSPEC_DIR`; no workspace selection is stored in module-global state. Successful commands continue to emit the operation's current JSON result on stdout. Invalid commands/arguments and operation failures use the existing JSON error format on stderr and a non-zero exit status. The dispatcher must not reinterpret archive state or perform spec merging.

## Risks / Trade-offs

- **Invocation migration:** Skill, Command, and documentation resources contain many repeated references. A missed call would keep referencing a deleted wrapper; search the resources and manuals for old wrapper paths and test the onboard preflight.
- **Argument compatibility:** Each subcommand has positional and/or flag arguments. Exercise missing values, optional flags, values with spaces, and the archive instruction mode through the actual Node entry point.
- **Package path and shell quoting:** The unified script must be included in the npm package and continue to work when the package path contains spaces. Verify rendered calls and run a packed-package smoke test.
- **Direct wrapper callers:** Removing the old asset paths may affect undocumented consumers that invoked them directly. The bundled workflows migrate atomically; if a stable external script-path contract is required, that compatibility decision must be made before implementation rather than silently retaining shims.
- **Rollback:** Reverting the resource-reference and script changes restores the old wrappers and invocation paths; no project data migration is involved.
