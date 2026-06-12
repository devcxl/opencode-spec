import { fastForwardChange } from "./ff.js"
import { createChangeScaffold } from "../change/new.js"
import { updateDesign } from "../artifact/design.js"
import { updateProposal } from "../artifact/proposal.js"
import { updateSpecs } from "../artifact/specs.js"
import { updateTasks } from "../artifact/tasks.js"

export interface ProposeChangeInput {
  projectDir: string
  name: string
  proposal?: string
  design?: string
  tasks?: string
  spec?: string
}

/**
 * 一键创建变更并生成所有制品
 *
 * 两种情况：
 * 1. 如果提供了任何制品的内容（proposal/spec/design/tasks），
 *    则直接使用提供的 content 写入对应文件。
 * 2. 如果未提供任何内容，先生成 proposal，再 fast-forward
 *    自动按依赖顺序生成后续所有可生成的制品。
 */
export async function proposeChange(input: ProposeChangeInput) {
  const scaffold = await createChangeScaffold({ projectDir: input.projectDir, name: input.name })

  if (input.proposal || input.spec || input.design || input.tasks) {
    const createdArtifacts = [
      { artifact: "proposal", paths: (await updateProposal({ projectDir: input.projectDir, name: scaffold.slug, content: input.proposal })).paths },
      { artifact: "specs", paths: (await updateSpecs({ projectDir: input.projectDir, name: scaffold.slug, content: input.spec })).paths },
      { artifact: "design", paths: (await updateDesign({ projectDir: input.projectDir, name: scaffold.slug, content: input.design })).paths },
      { artifact: "tasks", paths: (await updateTasks({ projectDir: input.projectDir, name: scaffold.slug, content: input.tasks })).paths },
    ]

    return {
      createdArtifacts,
      createdFiles: [...new Set([...scaffold.created, ...createdArtifacts.flatMap((artifact) => artifact.paths)])],
      path: scaffold.path,
      schema: scaffold.schema,
      slug: scaffold.slug,
    }
  }

  const proposal = await updateProposal({ projectDir: input.projectDir, name: scaffold.slug })
  const generated = await fastForwardChange({ projectDir: input.projectDir, name: scaffold.slug })
  const createdArtifacts = [{ artifact: "proposal", paths: proposal.paths }, ...generated.createdArtifacts]

  return {
    createdArtifacts,
    createdFiles: [...new Set([...scaffold.created, ...createdArtifacts.flatMap((artifact) => artifact.paths)])],
    path: scaffold.path,
    schema: scaffold.schema,
    slug: scaffold.slug,
  }
}
