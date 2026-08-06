#!/usr/bin/env node
import { archiveChange, getArchiveInstructions, getArgValue, hasFlag, runJsonCli } from "../../_shared/references/openspec.js"

const name = getArgValue("--change")
const instructionsMode = hasFlag("--instructions")

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: archive --change=<name> [--instructions]")
  }

  if (instructionsMode) {
    return getArchiveInstructions(undefined, name)
  }

  return archiveChange(undefined, name)
})
