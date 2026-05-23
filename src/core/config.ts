import { parse } from "yaml"

import { readOptionalText } from "./fs.js"
import { projectConfigPath, toRelativePath } from "./paths.js"
import type { BuiltinSchemaName } from "./types.js"

/** OpenSpec 项目配置结构 */
export interface OpenSpecProjectConfig {
  schema: BuiltinSchemaName
}

/** 默认配置：使用 spec-driven schema */
const DEFAULT_PROJECT_CONFIG: OpenSpecProjectConfig = {
  schema: "spec-driven",
}

/**
 * 加载项目配置文件
 *
 * 如果文件不存在、内容为空、或 schema 字段缺失，则返回默认配置。
 * 目前仅支持 "spec-driven" 这一种 schema。
 */
export async function loadProjectConfig(projectDir: string): Promise<OpenSpecProjectConfig> {
  const configPath = toRelativePath(projectDir, projectConfigPath(projectDir))
  const raw = await readOptionalText(projectConfigPath(projectDir))
  if (!raw?.trim()) {
    return { ...DEFAULT_PROJECT_CONFIG }
  }

  const parsed = parse(raw)
  if (parsed == null) {
    return { ...DEFAULT_PROJECT_CONFIG }
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} 必须是对象`)
  }

  const schema = "schema" in parsed ? parsed.schema : undefined
  if (schema == null || schema === "") {
    return { ...DEFAULT_PROJECT_CONFIG }
  }

  if (schema !== "spec-driven") {
    throw new Error(`${configPath} 指定了暂不支持的 schema：${String(schema)}`)
  }

  return { schema }
}
