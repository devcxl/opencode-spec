import { rename } from "node:fs/promises"
import path from "node:path"

import { datedArchiveChangeDir, toRelativePath } from "./paths.js"
import { syncChangeSpecs } from "./sync.js"
import { verifyChange } from "./verify.js"
import {
  changeDir,
  pathExists,
  slugify,
} from "./common.js"

export interface ArchiveChangeInput {
  projectDir: string
  name: string
}

/**
 * 归档已完成变更
 *
 * 流程：
 * 1. 验证变更是否满足归档条件（所有任务完成、制品齐全）
 * 2. 将 specs 同步到全局 openspec/specs/ 目录
 * 3. 将变更目录从 openspec/changes/<slug>/ 移动到 openspec/changes/archive/<date>-<slug>/
 *
 * 归档前必须通过 verifyChange 检查，否则拒绝归档。
 */
export async function archiveChange(input: ArchiveChangeInput) {
  const slug = slugify(input.name)
  const activeDir = changeDir(input.projectDir, slug)

  if (!(await pathExists(activeDir))) {
    throw new Error(`未找到活动变更 ${slug}`)
  }

  const verification = await verifyChange({ projectDir: input.projectDir, name: slug })
  if (!verification.readyToArchive) {
    throw new Error(`归档失败：${verification.critical.join("；")}`)
  }

  const archivedAt = new Date()
  const targetArchiveDir = datedArchiveChangeDir(input.projectDir, slug, archivedAt)
  if (await pathExists(targetArchiveDir)) {
    throw new Error(`归档目标已存在：${path.basename(targetArchiveDir)}`)
  }

  const syncResult = await syncChangeSpecs({ projectDir: input.projectDir, name: slug })
  await rename(activeDir, targetArchiveDir)

  return {
    archivedTo: toRelativePath(input.projectDir, targetArchiveDir),
    slug,
    specsMergedTo: syncResult.syncedFiles,
  }
}
