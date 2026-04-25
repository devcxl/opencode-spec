import { getSchema } from "./schema.js"
import { resolveChangeMeta } from "./change.js"
import { getArtifactStatus } from "./status.js"
import { continueChange } from "./continue.js"

export interface FastForwardChangeInput {
  projectDir: string
  name: string
}

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
