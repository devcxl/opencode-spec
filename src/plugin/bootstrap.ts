import { loadPrompt } from "./prompts.js"

/** Bootstrap text belongs to one plugin location, not the server process. */
export async function loadBootstrap(packageRoot: string, projectDir: string): Promise<string> {
  const content = await loadPrompt(packageRoot, projectDir, "bootstrap")
  if (!content) throw new Error("OpenSpec bootstrap prompt not found")
  return content
}
