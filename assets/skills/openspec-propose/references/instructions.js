#!/usr/bin/env node
import { getArgValue, getArtifactInstructions, runJsonCli } from "../../_shared/references/openspec.js"

const artifactId = process.argv[2]
const name = getArgValue("--change")

await runJsonCli(async () => {
  if (!artifactId || !name) {
    throw new Error("Usage: instructions <artifact-id> --change=<name> [--json]")
  }

  return getArtifactInstructions(undefined, name, artifactId)
})
