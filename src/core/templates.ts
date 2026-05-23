import path from "node:path"

import { pathExists, readOptionalText } from "./fs.js"
import { pluginTemplateDir } from "./paths.js"

/**
 * 内置默认模板
 *
 * 模板使用 {{name}} 和 {{slug}} 等占位符，可以通过 renderTemplate 填充。
 * 如果项目在 .opencode/opencode-spec/templates/ 下提供了同名文件，则优先使用项目自定义模板。
 */
export const DEFAULT_TEMPLATES = {
  proposal: `# Proposal: {{name}}

## Summary

## Motivation

## Scope

## Non-Goals

## Risks
`,
  design: `# Design: {{name}}

## Overview

## Goals

## Constraints

## Technical Approach

## Alternatives Considered

## Impacted Files / Modules

## Risks and Mitigations
`,
  tasks: `# Tasks: {{name}}

## Implementation
- [ ] 1.1 完成实现

## Verification
- [ ] 2.1 完成验证
`,
  spec: `# Spec: {{name}}

## Requirements

## Behavior

## Acceptance Criteria
`,
} as const

/** 模板名称类型 */
export type TemplateName = keyof typeof DEFAULT_TEMPLATES

/** 查询某个模板的信息（是否自定义、路径、来源） */
export async function resolveTemplateInfo(projectDir: string, templateName: TemplateName) {
  const filePath = path.join(pluginTemplateDir(projectDir), `${templateName}.md`)
  const customized = await pathExists(filePath)

  return {
    customized,
    name: templateName,
    path: filePath,
    source: customized ? "project" : "builtin",
  }
}

/** 列出所有模板的信息 */
export async function listTemplateInfos(projectDir: string) {
  return Promise.all((Object.keys(DEFAULT_TEMPLATES) as TemplateName[]).map((templateName) => resolveTemplateInfo(projectDir, templateName)))
}

/**
 * 获取模板内容
 *
 * 优先使用项目自定义模板，无自定义时回退到内置默认模板。
 */
export async function getTemplate(projectDir: string, templateName: TemplateName) {
  const projectTemplatePath = path.join(pluginTemplateDir(projectDir), `${templateName}.md`)
  const projectTemplate = await readOptionalText(projectTemplatePath)

  return projectTemplate ?? DEFAULT_TEMPLATES[templateName]
}

/** 将模板中的 {{key}} 占位符替换为实际值 */
export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_match, key: string) => values[key] ?? "")
}
