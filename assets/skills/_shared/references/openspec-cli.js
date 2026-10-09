#!/usr/bin/env node
import {
  archiveChange,
  createChangeScaffold,
  getArchiveInstructions,
  getArgValue,
  getArtifactInstructions,
  getChangeStatus,
  hasFlag,
  listChanges,
  markChangeTasks,
  prepareApply,
  runJsonCli,
} from "./openspec.js"

function validateArguments(args, positionalCount, valueFlags, booleanFlags, usage) {
  const positionals = args.filter((argument) => !argument.startsWith("--"))
  const seenFlags = new Set()

  if (positionals.length !== positionalCount) {
    throw new Error(`Usage: openspec-cli ${usage}`)
  }

  for (const argument of args.filter((value) => value.startsWith("--"))) {
    const separator = argument.indexOf("=")
    const flag = separator === -1 ? argument : argument.slice(0, separator)
    const expectsValue = valueFlags.includes(flag)
    const isBoolean = booleanFlags.includes(flag)
    if ((!expectsValue && !isBoolean) || (expectsValue && separator === -1) || (isBoolean && separator !== -1)) {
      throw new Error(`Unknown or invalid argument "${argument}". Usage: openspec-cli ${usage}`)
    }
    if (seenFlags.has(flag)) {
      throw new Error(`Argument "${flag}" may only be provided once. Usage: openspec-cli ${usage}`)
    }
    seenFlags.add(flag)
  }

  return positionals
}

const [command, ...args] = process.argv.slice(2)

await runJsonCli(async () => {
  switch (command) {
    case "list":
      validateArguments(args, 0, [], [], "list")
      return listChanges()

    case "new-change":
      validateArguments(args, 1, [], [], "new-change <name>")
      return createChangeScaffold(undefined, args[0])

    case "status":
      validateArguments(args, 1, [], [], "status <name>")
      return getChangeStatus(undefined, args[0])

    case "instructions": {
      const [artifactId] = validateArguments(args, 1, ["--change"], [], "instructions <artifact-id> --change=<name>")
      const name = getArgValue("--change", args)
      if (!name) throw new Error("Usage: openspec-cli instructions <artifact-id> --change=<name>")
      return getArtifactInstructions(undefined, name, artifactId)
    }

    case "prepare-apply": {
      validateArguments(args, 0, ["--change"], [], "prepare-apply --change=<name>")
      const name = getArgValue("--change", args)
      if (!name) throw new Error("Usage: openspec-cli prepare-apply --change=<name>")
      return prepareApply(undefined, name)
    }

    case "mark-tasks": {
      const usage = "mark-tasks --change=<name> [--complete-ids=1.1,2.1] [--verification-summary=<text>]"
      const valueFlags = ["--change", "--complete-ids", "--verification-summary"]
      validateArguments(args, 0, valueFlags, [], usage)

      const name = getArgValue("--change", args)
      if (!name) throw new Error(`Usage: openspec-cli ${usage}`)

      const completeIds = getArgValue("--complete-ids", args)
      const completeTaskIds = completeIds
        ? completeIds
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []

      return markChangeTasks(undefined, name, completeTaskIds, getArgValue("--verification-summary", args) ?? undefined)
    }

    case "archive": {
      const usage = "archive --change=<name> [--instructions] [--specs-state=synced|skipped|none]"
      validateArguments(args, 0, ["--change", "--specs-state"], ["--instructions"], usage)

      const name = getArgValue("--change", args)
      if (!name) throw new Error(`Usage: openspec-cli ${usage}`)
      if (hasFlag("--instructions", args)) return getArchiveInstructions(undefined, name)
      return archiveChange(undefined, name, { specsState: getArgValue("--specs-state", args) })
    }

    default:
      throw new Error(`Unknown command: ${command ?? "(missing)"}`)
  }
})
