import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { PLUGIN_ID, ensureParentDir, pathExists } from "../core/common.js"

export interface AssetManifestFile {
  hash: string
  target: string
}

export interface AssetManifest {
  files: Record<string, AssetManifestFile>
  plugin: string
  updatedAt: string
  version: string
}

export function getManifestPath(projectDir: string) {
  return path.join(projectDir, ".opencode", `${PLUGIN_ID}.manifest.json`)
}

export async function readManifest(projectDir: string): Promise<AssetManifest | null> {
  const manifestPath = getManifestPath(projectDir)
  if (!(await pathExists(manifestPath))) {
    return null
  }

  const raw = await readFile(manifestPath, "utf8")
  return JSON.parse(raw) as AssetManifest
}

export async function writeManifest(projectDir: string, manifest: AssetManifest) {
  const manifestPath = getManifestPath(projectDir)
  await ensureParentDir(manifestPath)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
}

export function createManifest(version: string, files: Record<string, AssetManifestFile>): AssetManifest {
  return {
    files,
    plugin: PLUGIN_ID,
    updatedAt: new Date().toISOString(),
    version,
  }
}
