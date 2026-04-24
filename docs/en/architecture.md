# Architecture

[Back to README](../../README.en.md) | [中文](../zh/architecture.md)

`opencode-spec` integrates the OpenSpec workflow into OpenCode using a “plugin-provided tools + file-synced commands / skills / templates” model.

## Capability boundaries

The plugin directly handles:

- registering OpenSpec-related custom tools
- syncing asset files at startup
- emitting sync notices when a session is created

The plugin indirectly integrates:

- commands
- skills
- templates

These three are not dynamically registered by the plugin. Instead, they are written into the project's `.opencode/` directory and then loaded by OpenCode's native discovery mechanism.

## Startup sync flow

At startup, the plugin scans three bundled asset directories:

- `assets/commands`
- `assets/skills`
- `assets/templates`

It then syncs them into:

- `.opencode/commands`
- `.opencode/skills`
- `.opencode/opencode-spec/templates`

The sync strategy is:

1. **target file does not exist**: write it directly
2. **target file already matches plugin content**: skip it
3. **target file still matches the last plugin-written version, but plugin content changed**: overwrite it directly
4. **target file was modified by the user**: do not overwrite it; generate a sibling `.new` file for manual merge

## Manifest mechanism

The plugin writes `.opencode/opencode-spec.manifest.json` to track:

- plugin version
- target path of each synced asset
- content hash of each asset

This manifest is used to determine:

- whether the current file is still the version previously written by the plugin
- whether the current upgrade can safely overwrite the file
- which files are now in a “user-modified, manual merge required” state

## Session notice

On the `session.created` event, the plugin emits a notice based on sync results, typically including:

- how many asset files were synced
- whether user modifications were detected and `.new` files were generated
- whether commands / skills changed and therefore OpenCode should be restarted
- the recommended workflow: `propose → design → tasks → apply → archive`

## Current limitation

The public OpenCode plugin API currently does not expose a stable hook for injecting system prompts or message context.

Because of that, this plugin currently uses a workaround:

- workflow constraints are carried by skill and command templates
- startup sync and session notices provide the operational guidance

That is also why commands / skills are integrated through file sync instead of pure runtime registration.
