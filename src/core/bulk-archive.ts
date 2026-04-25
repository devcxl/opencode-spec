import { archiveChange } from "./archive.js"

export interface BulkArchiveChangesInput {
  projectDir: string
  names: string[]
}

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
