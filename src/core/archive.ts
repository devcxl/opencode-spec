import { rename } from "node:fs/promises"
import path from "node:path"

import { datedArchiveChangeDir, toRelativePath } from "./paths.js"
import { syncChangeSpecs } from "./sync.js"
import { verifyChange } from "./verify.js"
import { resolveChangeMeta, writeChangeMeta } from "./change.js"
import {
  changeDir,
  pathExists,
  slugify,
} from "./common.js"

export interface ArchiveChangeInput {
  projectDir: string
  name: string
}

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
  const meta = await resolveChangeMeta(input.projectDir, slug)
  await rename(activeDir, targetArchiveDir)
  await writeChangeMeta(input.projectDir, path.basename(targetArchiveDir), {
    ...meta,
    archivedAt: archivedAt.toISOString(),
    status: "archived",
  }, { archived: true })

  return {
    archivedTo: toRelativePath(input.projectDir, targetArchiveDir),
    slug,
    specsMergedTo: syncResult.syncedFiles,
  }
}
