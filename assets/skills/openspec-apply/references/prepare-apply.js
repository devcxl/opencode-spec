#!/usr/bin/env node
import { getArgValue, prepareApply, runJsonCli } from "../../_shared/references/openspec.js"

const name = getArgValue("--change")

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: prepare-apply --change=<name>")
  }

  return prepareApply(undefined, name)
})
