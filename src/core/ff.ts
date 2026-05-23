import { getSchema } from "./schema.js"
import { resolveChangeMeta } from "./change.js"
import { getArtifactStatus } from "./status.js"
import { continueChange } from "./continue.js"

export interface FastForwardChangeInput {
  projectDir: string
  name: string
}

/**
 * 快速前进变更：自动按依赖顺序生成所有可生成的制品
 *
 * 遍历 schema 中定义的制品列表，跳过已完成的制品，
 * 对状态为 "ready" 的制品依次调用 continueChange 生成。
 * 如果某个制品仍处于 "blocked" 状态则抛异常。
 */
export async function fastForwardChange(input: FastForwardChangeInput) {
  const meta = await resolveChangeMeta(input.projectDir, input.name)
  const schema = getSchema(meta.schema)
  const createdArtifacts: Array<{ artifact: string; paths: string[] }> = []

  for (const artifact of schema.artifacts) {
    const status = await getArtifactStatus(input.projectDir, meta.slug, artifact.id)
    if (status.state === "done") {
      continue
    }

    if (status.state !== "ready") {
      throw new Error(`无法 fast-forward 变更 ${meta.slug}：artifact ${artifact.id} 仍缺少依赖 ${status.missingDeps.join(", ")}`)
    }

    const result = await continueChange({ projectDir: input.projectDir, name: meta.slug })
    createdArtifacts.push({
      artifact: result.nextArtifact,
      paths: result.created.paths,
    })
  }

  return {
    createdArtifacts,
    slug: meta.slug,
  }
}
