#!/usr/bin/env node
import { archiveChange, getArchiveInstructions, getArgValue, hasFlag, runJsonCli } from "../../_shared/references/openspec.js"

const name = getArgValue("--change")
const instructionsMode = hasFlag("--instructions")
const specsState = getArgValue("--specs-state")

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: archive --change=<name> [--instructions] [--specs-state=synced|skipped|none]")
  }

  if (instructionsMode) {
    return getArchiveInstructions(undefined, name)
  }

  return archiveChange(undefined, name, { specsState })
})
