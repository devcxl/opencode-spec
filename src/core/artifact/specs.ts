import path from "node:path"

import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "../../util/common.js"
import { changeSpecsDir, toRelativePath } from "../../util/paths.js"

export interface UpdateSpecsInput {
  projectDir: string
  name: string
  content?: string
}

/**
 * 更新（或创建）变更的规格说明文件（specs/spec.md）
 *
 * 未提供 content 时使用默认模板生成规格说明骨架。
 */
export async function updateSpecs(input: UpdateSpecsInput) {
  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)

  if (!(await pathExists(targetDir))) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const filePath = path.join(changeSpecsDir(input.projectDir, slug), "spec.md")
  const content = input.content ?? renderTemplate(await getTemplate(input.projectDir, "spec"), { name: slug, slug })

  await writeText(filePath, content)

  return {
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
