import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createOpencodeSpec } from "./plugin/server.js"

/** 根据 import.meta.url 解析插件包的根目录路径 */
export function resolvePackageRoot(metaUrl: string) {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..")
}

/** 插件包的根目录 */
const packageRoot = resolvePackageRoot(import.meta.url)

export const OpencodeSpec: Plugin = createOpencodeSpec(packageRoot)
