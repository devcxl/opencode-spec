export type BuiltinSchemaName = "spec-driven"

export type ArtifactId = "proposal" | "specs" | "design" | "tasks"

export type ArtifactState = "done" | "ready" | "blocked"

export interface ArtifactDefinition {
  id: ArtifactId
  requires: ArtifactId[]
  outputPaths: string[]
}

export interface SchemaDefinition {
  name: BuiltinSchemaName
  artifacts: ArtifactDefinition[]
}

export interface ChangeMeta {
  name: string
  slug: string
  schema: BuiltinSchemaName
  createdAt: string
  updatedAt: string
  archivedAt?: string
  status?: "active" | "archived"
}

export interface ArtifactStatus {
  id: ArtifactId
  state: ArtifactState
  existingPaths: string[]
  missingDeps: ArtifactId[]
}

export interface ChangeStatus {
  slug: string
  schema: BuiltinSchemaName
  artifacts: ArtifactStatus[]
}
