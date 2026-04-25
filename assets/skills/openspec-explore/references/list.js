#!/usr/bin/env node
import { listChanges, runJsonCli } from "../../_shared/references/openspec.js"

await runJsonCli(async () => listChanges())
