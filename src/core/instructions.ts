import path from "node:path"

import { readOptionalText } from "./fs.js"
import { getTemplate, renderTemplate } from "./templates.js"
import { getArtifactDefinition } from "./schema.js"
import { resolveChangeMeta } from "./change.js"
import { detectArtifactPaths, getArtifactStatus } from "./status.js"
import type { ArtifactId } from "./types.js"
import { changeDir, toRelativePath } from "./paths.js"

export interface GetArtifactInstructionsInput {
  projectDir: string
  name: string
  artifact: ArtifactId
}

function getArtifactTemplateName(artifact: ArtifactId) {
  switch (artifact) {
    case "proposal":
      return "proposal"
    case "specs":
      return "spec"
    case "design":
      return "design"
    case "tasks":
      return "tasks"
  }
}

function getArtifactTargetPaths(projectDir: string, slug: string, artifact: ArtifactId) {
  const baseDir = changeDir(projectDir, slug)

  switch (artifact) {
    case "proposal":
      return [toRelativePath(projectDir, path.join(baseDir, "proposal.md"))]
    case "specs":
      return [toRelativePath(projectDir, path.join(baseDir, "specs", "spec.md"))]
    case "design":
      return [toRelativePath(projectDir, path.join(baseDir, "design.md"))]
    case "tasks":
      return [toRelativePath(projectDir, path.join(baseDir, "tasks.md"))]
  }
}

export async function getArtifactInstructions(input: GetArtifactInstructionsInput) {
  const meta = await resolveChangeMeta(input.projectDir, input.name)
  const artifactStatus = await getArtifactStatus(input.projectDir, meta.slug, input.artifact)
  const artifactDefinition = getArtifactDefinition(meta.schema, input.artifact)
  const templateName = getArtifactTemplateName(input.artifact)
  const template = renderTemplate(await getTemplate(input.projectDir, templateName), { name: meta.slug, slug: meta.slug })
  const dependencyArtifacts = await Promise.all(
    artifactDefinition.requires.map(async (artifactId) => {
      const paths = await detectArtifactPaths(input.projectDir, meta.slug, artifactId)
      const files = await Promise.all(
        paths.map(async (relativePath) => ({
          path: relativePath,
          content: (await readOptionalText(path.join(input.projectDir, relativePath))) ?? "",
        })),
      )

      return {
        artifact: artifactId,
        files,
      }
    }),
  )

  return {
    artifact: input.artifact,
    definition: {
      outputPaths: artifactDefinition.outputPaths,
      requires: artifactDefinition.requires,
    },
    missingDeps: artifactStatus.missingDeps,
    schema: meta.schema,
    state: artifactStatus.state,
    targetPaths: getArtifactTargetPaths(input.projectDir, meta.slug, input.artifact),
    template,
    dependencies: dependencyArtifacts,
  }
}
