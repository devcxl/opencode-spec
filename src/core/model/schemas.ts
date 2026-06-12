import { loadProjectConfig } from "../project/config.js"
import { getSchema } from "./schema.js"

/**
 * 列出当前项目可用的 schema 及其制品定义
 *
 * 返回当前激活的 schema 名称和所有可用 schema 列表，
 * 每个 schema 包含制品 ID、输出路径、前置依赖等信息。
 */
export async function listSchemas(projectDir: string) {
  const config = await loadProjectConfig(projectDir)
  const schema = getSchema(config.schema)

  return {
    activeSchema: config.schema,
    schemas: [
      {
        artifacts: schema.artifacts.map((artifact) => ({
          id: artifact.id,
          outputPaths: artifact.outputPaths,
          requires: artifact.requires,
        })),
        builtin: true,
        name: schema.name,
      },
    ],
  }
}
