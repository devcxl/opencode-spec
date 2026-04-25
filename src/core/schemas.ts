import { loadProjectConfig } from "./config.js"
import { getSchema } from "./schema.js"

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
