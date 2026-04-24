import { tool } from "@opencode-ai/plugin"

import {
  archiveChange,
  initializeOpenSpec,
  listChanges,
  prepareApply,
  proposeChange,
  updateDesign,
  updateTasks,
} from "../core/index.js"
import { formatToolResult, resolveProjectDir } from "./common.js"

export function createOpenSpecTools() {
  return {
    "openspec-apply": tool({
      description: "读取或更新指定 OpenSpec change 的任务执行状态",
      args: {
        completeTaskIds: tool.schema.array(tool.schema.string()).optional().describe("要标记完成的任务编号列表，如 1.1, 2.1"),
        name: tool.schema.string().describe("变更名或 slug"),
        verificationSummary: tool.schema.string().optional().describe("本次执行后的验证说明"),
      },
      async execute(args, context) {
        const result = await prepareApply({ ...args, projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
    "openspec-archive": tool({
      description: "校验并归档一个已完成的 OpenSpec change",
      args: {
        name: tool.schema.string().describe("变更名或 slug"),
      },
      async execute(args, context) {
        const result = await archiveChange({ ...args, projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
    "openspec-design": tool({
      description: "创建或更新指定 OpenSpec change 的 design.md",
      args: {
        content: tool.schema.string().optional().describe("新的 design.md 内容；不传则重置为模板"),
        name: tool.schema.string().describe("变更名或 slug"),
      },
      async execute(args, context) {
        const result = await updateDesign({ ...args, projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
    "openspec-init": tool({
      description: "初始化项目中的 OpenSpec 目录结构",
      args: {},
      async execute(_args, context) {
        const result = await initializeOpenSpec({ projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
    "openspec-list": tool({
      description: "列出项目中的活动与归档 OpenSpec changes",
      args: {},
      async execute(_args, context) {
        const result = await listChanges({ projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
    "openspec-propose": tool({
      description: "创建一个新的 OpenSpec change 目录与基础工件",
      args: {
        design: tool.schema.string().optional().describe("可选的 design.md 初始内容"),
        name: tool.schema.string().describe("变更名称"),
        proposal: tool.schema.string().optional().describe("可选的 proposal.md 初始内容"),
        spec: tool.schema.string().optional().describe("可选的 spec.md 初始内容"),
        tasks: tool.schema.string().optional().describe("可选的 tasks.md 初始内容"),
      },
      async execute(args, context) {
        const result = await proposeChange({ ...args, projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
    "openspec-tasks": tool({
      description: "创建或更新指定 OpenSpec change 的 tasks.md",
      args: {
        content: tool.schema.string().optional().describe("新的 tasks.md 内容；不传则重置为模板"),
        name: tool.schema.string().describe("变更名或 slug"),
      },
      async execute(args, context) {
        const result = await updateTasks({ ...args, projectDir: resolveProjectDir(context) })
        return formatToolResult(result)
      },
    }),
  }
}
