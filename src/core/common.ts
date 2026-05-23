/**
 * common 模块：统一重导出核心模块的常用 API
 *
 * 作为外观（Facade）层，聚合 fs、paths、templates、tasks-format 等模块的公共 API，
 * 方便其他模块通过单个 import 获取所有常用功能。
 */

export {
  appendVerificationNotes,
  markTasksComplete,
  normalizeTaskId,
  parseTasks,
  validateTasksMarkdown,
} from "./tasks-format.js"
export type { ParsedTask } from "./tasks-format.js"
export { copyDirectory, ensureParentDir, listDirectories, normalizeText, pathExists, readOptionalText, writeText } from "./fs.js"
export {
  PLUGIN_ID,
  archiveChangeDir,
  archiveChangeDir as archiveDir,
  archiveRoot,
  changeDir,
  changesRoot,
  ensureOpenSpecStructure,
  openspecRoot,
  slugify,
  specsRoot,
  toRelativePath,
} from "./paths.js"
export { DEFAULT_TEMPLATES, getTemplate, renderTemplate } from "./templates.js"
export type { TemplateName } from "./templates.js"
