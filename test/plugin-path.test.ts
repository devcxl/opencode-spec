import path from "node:path"

import { describe, expect, it } from "vitest"

import { resolvePackageRoot } from "../src/plugin.ts"

describe("resolvePackageRoot", () => {
  it("能从 dist/plugin.js 解析到包根目录，并解码空格路径", () => {
    const root = resolvePackageRoot("file:///tmp/My%20Plugin/dist/plugin.js")
    expect(root).toBe(path.join("/tmp", "My Plugin"))
  })
})
