import type { ArtifactId, SchemaDefinition } from "./types.js"

const BUILTIN_SCHEMA: SchemaDefinition = {
  name: "spec-driven",
  artifacts: [
    { id: "proposal", requires: [], outputPaths: ["proposal.md"] },
    { id: "specs", requires: ["proposal"], outputPaths: ["specs/**/*.md"] },
    { id: "design", requires: ["proposal"], outputPaths: ["design.md"] },
    { id: "tasks", requires: ["specs", "design"], outputPaths: ["tasks.md"] },
  ],
}

const SCHEMA_REGISTRY = {
  "spec-driven": BUILTIN_SCHEMA,
} as const

export function getBuiltinSchema() {
  return BUILTIN_SCHEMA
}

export function getSchema(name: keyof typeof SCHEMA_REGISTRY = "spec-driven") {
  const schema = SCHEMA_REGISTRY[name]
  if (!schema) {
    throw new Error(`未找到 schema 定义：${name}`)
  }

  return schema
}

export function getArtifactDefinition(schemaName: keyof typeof SCHEMA_REGISTRY, id: ArtifactId) {
  const schema = getSchema(schemaName)
  const artifact = schema.artifacts.find((item) => item.id === id)
  if (!artifact) {
    throw new Error(`未找到 artifact 定义：${schemaName}.${id}`)
  }

  return artifact
}
