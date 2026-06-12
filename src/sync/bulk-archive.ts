import { archiveChange } from "./archive.js"

export interface BulkArchiveChangesInput {
  projectDir: string
  names: string[]
}

/**
 * 批量归档多个已完成变更
 *
 * 逐个调用 archiveChange 进行归档，
 * 成功和失败的变更分别返回，便于调用方处理部分成功的情况。
 */
export async function bulkArchiveChanges(input: BulkArchiveChangesInput) {
  const archived: Array<{ archivedTo: string; slug: string; specsMergedTo: string[] }> = []
  const failed: Array<{ error: string; name: string }> = []

  for (const name of input.names) {
    try {
      archived.push(await archiveChange({ projectDir: input.projectDir, name }))
    } catch (error) {
      failed.push({
        error: error instanceof Error ? error.message : String(error),
        name,
      })
    }
  }

  return {
    archived,
    failed,
  }
}
