import { parse } from "yaml"

import { readOptionalText } from "./fs.js"
import { projectConfigPath } from "./paths.js"
import type { BuiltinSchemaName } from "./types.js"

export interface OpenSpecProjectConfig {
  schema: BuiltinSchemaName
}

const DEFAULT_PROJECT_CONFIG: OpenSpecProjectConfig = {
  schema: "spec-driven",
}

export async function loadProjectConfig(projectDir: string): Promise<OpenSpecProjectConfig> {
  const raw = await readOptionalText(projectConfigPath(projectDir))
  if (!raw?.trim()) {
    return { ...DEFAULT_PROJECT_CONFIG }
  }

  const parsed = parse(raw)
  if (parsed == null) {
    return { ...DEFAULT_PROJECT_CONFIG }
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("openspec/config.yaml 必须是对象")
  }

  const schema = "schema" in parsed ? parsed.schema : undefined
  if (schema == null || schema === "") {
    return { ...DEFAULT_PROJECT_CONFIG }
  }

  if (schema !== "spec-driven") {
    throw new Error(`openspec/config.yaml 指定了暂不支持的 schema：${String(schema)}`)
  }

  return { schema }
}
