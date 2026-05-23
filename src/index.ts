import { OpencodeSpec } from "./plugin.js"

/**
 * OpenCode 插件默认导出入口
 *
 * OpenCode 插件系统要求 mod.default 包含 { id, server } 格式，
 * 其中 id 是插件唯一标识，server 是插件工厂函数。
 */
export default {
  id: "opencode-spec",
  server: OpencodeSpec,
}
