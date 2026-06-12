/** 内置 schema 名称，目前仅支持 spec-driven */
export type BuiltinSchemaName = "spec-driven"

/** 可产出的人工制品类型：提案 / 规格说明 / 设计方案 / 任务 */
export type ArtifactId = "proposal" | "specs" | "design" | "tasks"

/** 制品状态：已完成 / 可生成 / 被依赖阻塞 */
export type ArtifactState = "done" | "ready" | "blocked"

/** 一个制品的定义：包含其 ID、前置依赖、以及产出文件路径模式 */
export interface ArtifactDefinition {
  id: ArtifactId
  requires: ArtifactId[]
  outputPaths: string[]
}

/** Schema 定义：描述工作流中制品的顺序和依赖关系 */
export interface SchemaDefinition {
  name: BuiltinSchemaName
  artifacts: ArtifactDefinition[]
}

/** 变更元信息：名称、slug、schema、时间戳等 */
export interface ChangeMeta {
  name: string
  slug: string
  schema: BuiltinSchemaName
  createdAt: string
  updatedAt: string
  archivedAt?: string
  status?: "active" | "archived"
}

/** 单个制品的状态快照 */
export interface ArtifactStatus {
  id: ArtifactId
  state: ArtifactState
  existingPaths: string[]
  missingDeps: ArtifactId[]
}

/** 整个变更的状态 */
export interface ChangeStatus {
  slug: string
  schema: BuiltinSchemaName
  artifacts: ArtifactStatus[]
}
