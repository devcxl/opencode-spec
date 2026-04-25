#!/usr/bin/env node
import { getChangeStatus, runJsonCli } from "../../_shared/references/openspec.js"

const name = process.argv[2]

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: status <name> [--json]")
  }

  return getChangeStatus(undefined, name)
})
