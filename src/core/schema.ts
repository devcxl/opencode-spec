import type { ArtifactId, SchemaDefinition } from "./types.js"

/**
 * 内置的 spec-driven schema 定义
 *
 * 工作流顺序：proposal（无依赖）→ specs（依赖 proposal）、design（依赖 proposal）→ tasks（依赖 specs + design）
 * 其中 specs 和 design 可以在 proposal 完成后并行创建。
 */
const BUILTIN_SCHEMA: SchemaDefinition = {
  name: "spec-driven",
  artifacts: [
    { id: "proposal", requires: [], outputPaths: ["proposal.md"] },
    { id: "specs", requires: ["proposal"], outputPaths: ["specs/**/*.md"] },
    { id: "design", requires: ["proposal"], outputPaths: ["design.md"] },
    { id: "tasks", requires: ["specs", "design"], outputPaths: ["tasks.md"] },
  ],
}

/** 全局 schema 注册表，目前仅内置 spec-driven */
const SCHEMA_REGISTRY = {
  "spec-driven": BUILTIN_SCHEMA,
} as const

/** 获取内置 schema 定义 */
export function getBuiltinSchema() {
  return BUILTIN_SCHEMA
}

/** 按名称获取 schema 定义，默认返回 spec-driven */
export function getSchema(name: keyof typeof SCHEMA_REGISTRY = "spec-driven") {
  const schema = SCHEMA_REGISTRY[name]
  if (!schema) {
    throw new Error(`未找到 schema 定义：${name}`)
  }

  return schema
}

/** 获取某个 schema 中特定制品的定义 */
export function getArtifactDefinition(schemaName: keyof typeof SCHEMA_REGISTRY, id: ArtifactId) {
  const schema = getSchema(schemaName)
  const artifact = schema.artifacts.find((item) => item.id === id)
  if (!artifact) {
    throw new Error(`未找到 artifact 定义：${schemaName}.${id}`)
  }

  return artifact
}
