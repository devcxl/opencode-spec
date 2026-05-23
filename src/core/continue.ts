import { getSchema } from "./schema.js"
import { resolveChangeMeta } from "./change.js"
import { getArtifactStatus } from "./status.js"
import { updateDesign } from "./design.js"
import { updateProposal } from "./proposal.js"
import { updateTasks } from "./tasks.js"
import { updateSpecs } from "./specs.js"
import type { ArtifactId } from "./types.js"
import { getArtifactInstructions } from "./instructions.js"

export interface ContinueChangeInput {
  projectDir: string
  name: string
}

/** 根据制品类型创建对应的文件（使用模板生成默认内容） */
async function createArtifact(projectDir: string, slug: string, artifact: ArtifactId) {
  switch (artifact) {
    case "proposal":
      return updateProposal({ projectDir, name: slug })
    case "specs":
      return updateSpecs({ projectDir, name: slug })
    case "design":
      return updateDesign({ projectDir, name: slug })
    case "tasks":
      return updateTasks({ projectDir, name: slug })
  }
}

/**
 * 继续生成变更的下一个制品
 *
 * 按照 schema 定义的制品顺序，找到第一个状态为 "ready" 的制品，
 * 用模板生成其文件内容，并返回可用于 AI 进一步编辑的 instructions。
 * 如果没有可继续生成的制品则抛异常。
 */
export async function continueChange(input: ContinueChangeInput) {
  const meta = await resolveChangeMeta(input.projectDir, input.name)
  const schema = getSchema(meta.schema)

  for (const artifact of schema.artifacts) {
    const status = await getArtifactStatus(input.projectDir, meta.slug, artifact.id)
    if (status.state !== "ready") {
      continue
    }

    const created = await createArtifact(input.projectDir, meta.slug, artifact.id)
    return {
      created,
      instructions: await getArtifactInstructions({ artifact: artifact.id, name: meta.slug, projectDir: input.projectDir }),
      nextArtifact: artifact.id,
      slug: meta.slug,
    }
  }

  throw new Error(`变更 ${meta.slug} 当前没有可继续生成的 artifact`)
}
