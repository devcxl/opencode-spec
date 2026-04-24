import path from "node:path"

import {
  changeDir,
  ensureOpenSpecStructure,
  getTemplate,
  pathExists,
  renderTemplate,
  slugify,
  validateTasksMarkdown,
  writeText,
} from "./common.js"

export interface ProposeChangeInput {
  projectDir: string
  name: string
  proposal?: string
  design?: string
  tasks?: string
  spec?: string
}

export async function proposeChange(input: ProposeChangeInput) {
  await ensureOpenSpecStructure(input.projectDir)

  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)

  if (await pathExists(targetDir)) {
    throw new Error(`变更 ${slug} 已存在`)
  }

  const proposalTemplate = await getTemplate(input.projectDir, "proposal")
  const designTemplate = await getTemplate(input.projectDir, "design")
  const tasksTemplate = await getTemplate(input.projectDir, "tasks")
  const specTemplate = await getTemplate(input.projectDir, "spec")

  const values = { name: slug, slug }
  const tasksContent = input.tasks ?? renderTemplate(tasksTemplate, values)
  validateTasksMarkdown(tasksContent)

  const files = {
    design: path.join(targetDir, "design.md"),
    proposal: path.join(targetDir, "proposal.md"),
    spec: path.join(targetDir, "specs", "spec.md"),
    tasks: path.join(targetDir, "tasks.md"),
  }

  await writeText(files.proposal, input.proposal ?? renderTemplate(proposalTemplate, values))
  await writeText(files.design, input.design ?? renderTemplate(designTemplate, values))
  await writeText(files.tasks, tasksContent)
  await writeText(files.spec, input.spec ?? renderTemplate(specTemplate, values))

  return {
    createdFiles: Object.values(files).map((filePath) => path.relative(input.projectDir, filePath).replace(/\\/g, "/")),
    path: path.relative(input.projectDir, targetDir).replace(/\\/g, "/"),
    slug,
  }
}
