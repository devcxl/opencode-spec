import { fastForwardChange } from "./ff.js"
import { createChangeScaffold } from "./new.js"
import { updateDesign } from "./design.js"
import { updateProposal } from "./proposal.js"
import { updateSpecs } from "./specs.js"
import { updateTasks } from "./tasks.js"

export interface ProposeChangeInput {
  projectDir: string
  name: string
  proposal?: string
  design?: string
  tasks?: string
  spec?: string
}

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
