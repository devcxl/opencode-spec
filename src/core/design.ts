import path from "node:path"

import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "./common.js"
import { toRelativePath } from "./paths.js"

export interface UpdateDesignInput {
  projectDir: string
  name: string
  content?: string
}

/**
 * 更新（或创建）变更的设计方案文件（design.md）
 *
 * 未提供 content 时使用默认模板生成设计文档骨架。
 */
export async function updateDesign(input: UpdateDesignInput) {
  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)
  const filePath = path.join(targetDir, "design.md")

  if (!(await pathExists(targetDir))) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const content =
    input.content ?? renderTemplate(await getTemplate(input.projectDir, "design"), { name: slug, slug })

  await writeText(filePath, content)

  return {
    path: toRelativePath(input.projectDir, filePath),
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
