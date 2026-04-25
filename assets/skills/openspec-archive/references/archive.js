#!/usr/bin/env node
import { archiveChange, getArgValue, runJsonCli } from "../../_shared/references/openspec.js"

const name = getArgValue("--change")

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: archive --change=<name>")
  }

  return archiveChange(undefined, name)
})
