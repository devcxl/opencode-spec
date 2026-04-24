import { ensureOpenSpecStructure } from "./common.js"

export interface InitializeOpenSpecInput {
  projectDir: string
}

export async function initializeOpenSpec(input: InitializeOpenSpecInput) {
  const created = await ensureOpenSpecStructure(input.projectDir)

  return {
    created,
    projectDir: input.projectDir,
  }
}
