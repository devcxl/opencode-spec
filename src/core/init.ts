import { ensureOpenSpecStructure } from "./paths.js"

export interface InitializeOpenSpecInput {
  projectDir: string
}

/**
 * 初始化项目中的 OpenSpec 目录结构
 *
 * 在项目根目录下创建 openspec/ 目录及其子目录结构。
 * 如果目录已存在则跳过。
 */
export async function initializeOpenSpec(input: InitializeOpenSpecInput) {
  const created = await ensureOpenSpecStructure(input.projectDir)

  return {
    created,
    projectDir: input.projectDir,
  }
}