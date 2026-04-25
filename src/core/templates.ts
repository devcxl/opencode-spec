import path from "node:path"

import { pathExists, readOptionalText } from "./fs.js"
import { pluginTemplateDir } from "./paths.js"

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

export type TemplateName = keyof typeof DEFAULT_TEMPLATES

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

export async function listTemplateInfos(projectDir: string) {
  return Promise.all((Object.keys(DEFAULT_TEMPLATES) as TemplateName[]).map((templateName) => resolveTemplateInfo(projectDir, templateName)))
}

export async function getTemplate(projectDir: string, templateName: TemplateName) {
  const projectTemplatePath = path.join(pluginTemplateDir(projectDir), `${templateName}.md`)
  const projectTemplate = await readOptionalText(projectTemplatePath)

  return projectTemplate ?? DEFAULT_TEMPLATES[templateName]
}

export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_match, key: string) => values[key] ?? "")
}
