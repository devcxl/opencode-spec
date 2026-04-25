#!/usr/bin/env node
import { createChangeScaffold, runJsonCli } from "../../_shared/references/openspec.js"

const name = process.argv[2]

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: new-change <name>")
  }

  return createChangeScaffold(undefined, name)
})
