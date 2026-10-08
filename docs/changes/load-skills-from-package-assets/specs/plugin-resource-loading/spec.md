## Purpose

Define how the plugin loads its bundled skills and executes their reference scripts from the installed package without copying plugin resources into temporary or project directories.

## ADDED Requirements

### Requirement: Skills load directly from packaged resources

The plugin MUST register bundled skills from the installed package's `assets/skills/` resources. It MUST render any runtime-specific script paths in memory and MUST NOT mutate the packaged skill files.

#### Scenario: Register bundled skills
- **WHEN** the plugin initializes from an installed package
- **THEN** all bundled skills and their supported aliases are registered from that package's skill resources
- **AND** each reference-script command resolves to a script shipped in that same package

#### Scenario: Preserve package resources
- **WHEN** runtime-specific paths are applied to skill instructions
- **THEN** the rendered content contains paths to the packaged reference scripts
- **AND** the source `SKILL.md` files remain unchanged

### Requirement: Skill loading creates no resource copies

The plugin MUST NOT copy bundled skills to an operating-system temporary directory or install them into the user's project as part of normal initialization. Unloading the plugin MUST NOT require deleting a generated skill-resource directory.

#### Scenario: Initialize and unload the plugin
- **WHEN** the plugin initializes and later unloads
- **THEN** it registers skills from packaged resources without creating a temporary skill-resource copy or project-local skill installation
- **AND** unloading does not leave plugin-created skill-resource files behind

### Requirement: Reference scripts remain workspace-scoped

Executing a packaged reference script MUST continue to use the OpenSpec directory resolved for that plugin context, and MUST write workflow data only beneath that configured project directory.

#### Scenario: Execute a skill in a configured workspace
- **WHEN** a skill invokes a packaged reference script for a workspace configured with `OPENSPEC_DIR`
- **THEN** the invocation passes that workspace's resolved directory to the script
- **AND** the script does not derive its data directory from the package installation path
