#!/usr/bin/env node
import { getArgValue, markChangeTasks, runJsonCli } from "../../_shared/references/openspec.js"

const name = getArgValue("--change")
const completeIds = getArgValue("--complete-ids")
const verificationSummary = getArgValue("--verification-summary")

await runJsonCli(async () => {
  if (!name) {
    throw new Error("Usage: mark-tasks --change=<name> [--complete-ids=1.1,2.1] [--verification-summary=<text>]")
  }

  const completeTaskIds = completeIds
    ? completeIds
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  return markChangeTasks(undefined, name, completeTaskIds, verificationSummary ?? undefined)
})
