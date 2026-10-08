## Purpose

Provide one package-bundled Node CLI entry point for the OpenSpec workflow operations currently exposed through separate reference-script paths.

## ADDED Requirements

### Requirement: Dispatch workflow operations through one CLI entry point

The bundled workflow CLI MUST expose the `list`, `new-change`, `status`, `instructions`, `prepare-apply`, `mark-tasks`, and `archive` operations through one Node-executable script. Valid invocations MUST preserve the corresponding operation's existing behavior and result data.

#### Scenario: Invoke each supported workflow operation
- **WHEN** an agent invokes one of the supported subcommands with its required arguments
- **THEN** the CLI dispatches to the matching workflow operation and returns its existing result

#### Scenario: Request archive instructions
- **WHEN** an agent invokes `archive` with `--instructions`
- **THEN** the CLI returns archive instructions without moving the change

### Requirement: Preserve CLI result and error handling

The unified CLI MUST emit successful operation results as JSON on standard output. It MUST report invalid subcommands, missing or invalid arguments, and operation failures as JSON errors on standard error and exit unsuccessfully.

#### Scenario: Invoke a valid operation
- **WHEN** a supported operation completes successfully
- **THEN** standard output contains its JSON result and the process exits successfully

#### Scenario: Invoke an invalid operation or arguments
- **WHEN** the command name or required arguments are invalid, or the operation fails
- **THEN** standard error contains a JSON error and the process exits unsuccessfully

### Requirement: Keep project data scoped to the invocation

The CLI MUST preserve the existing `OPENSPEC_DIR` behavior so workflow reads and writes remain scoped to the invoking workspace, without storing workspace selection in shared process state.

#### Scenario: Invoke the CLI for a configured workspace
- **WHEN** the CLI is invoked with the workspace's `OPENSPEC_DIR`
- **THEN** all workflow data access uses that directory and does not read or write another workspace's OpenSpec data
