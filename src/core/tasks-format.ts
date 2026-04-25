export interface ParsedTask {
  id: string
  checked: boolean
  text: string
}

const TASK_LINE_PATTERN = /^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/
const CHECKBOX_LINE_PATTERN = /^- \[(?: |x)\]/

function hasLeadingZeroSegment(taskId: string) {
  return taskId.split(".").some((segment) => segment.length > 1 && segment.startsWith("0"))
}

function assertNoLeadingZeroTaskId(taskId: string) {
  if (hasLeadingZeroSegment(taskId)) {
    throw new Error(`tasks.md 包含带前导零的任务 ID，请改为 1.1 这类格式：${taskId}`)
  }
}

export function normalizeTaskId(taskId: string) {
  const normalized = taskId.trim()
  if (!/^\d+(?:\.\d+)*$/.test(normalized)) {
    return normalized
  }

  return normalized
    .split(".")
    .map((segment) => String(Number.parseInt(segment, 10)))
    .join(".")
}

export function validateTasksMarkdown(markdown: string) {
  const invalidLines: string[] = []
  const leadingZeroIds: string[] = []
  const normalizedIdToSource = new Map<string, string>()
  const duplicateIds: string[] = []

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (!CHECKBOX_LINE_PATTERN.test(line)) {
      continue
    }

    const match = line.match(TASK_LINE_PATTERN)
    if (!match) {
      invalidLines.push(`${index + 1}: ${line}`)
      continue
    }

    const rawTaskId = match[2]
    if (hasLeadingZeroSegment(rawTaskId)) {
      leadingZeroIds.push(`${index + 1}: ${rawTaskId}`)
      continue
    }

    const normalizedTaskId = normalizeTaskId(rawTaskId)
    const previousSource = normalizedIdToSource.get(normalizedTaskId)
    if (previousSource) {
      duplicateIds.push(`${normalizedTaskId}（${previousSource} / ${index + 1}: ${rawTaskId}）`)
      continue
    }

    normalizedIdToSource.set(normalizedTaskId, `${index + 1}: ${rawTaskId}`)
  }

  if (invalidLines.length) {
    throw new Error(
      `tasks.md 包含不可识别的任务格式，请使用 - [ ] 1.1 任务描述 这种机器任务 ID 格式：${invalidLines.join("；")}`,
    )
  }

  if (leadingZeroIds.length) {
    throw new Error(`tasks.md 包含带前导零的任务 ID，请改为 1.1 这类格式：${leadingZeroIds.join("；")}`)
  }

  if (duplicateIds.length) {
    throw new Error(`tasks.md 包含重复的机器任务 ID：${duplicateIds.join("；")}`)
  }
}

export function parseTasks(markdown: string): ParsedTask[] {
  const tasks: ParsedTask[] = []
  const lines = markdown.split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(TASK_LINE_PATTERN)
    if (!match) {
      continue
    }

    assertNoLeadingZeroTaskId(match[2])

    tasks.push({
      checked: match[1] === "x",
      id: match[2],
      text: match[3],
    })
  }

  return tasks
}

export function markTasksComplete(markdown: string, completeTaskIds: string[]) {
  const requested = new Set(completeTaskIds.map((taskId) => normalizeTaskId(taskId)))
  const found = new Set<string>()

  const content = markdown.replace(/^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/gm, (line, _state, taskId, text) => {
    assertNoLeadingZeroTaskId(taskId)
    const normalizedTaskId = normalizeTaskId(taskId)
    if (!requested.has(normalizedTaskId)) {
      return line
    }

    found.add(normalizedTaskId)
    return `- [x] ${taskId} ${text}`
  })

  const missingTaskIds = completeTaskIds.filter((taskId) => !found.has(normalizeTaskId(taskId)))
  return { content, missingTaskIds }
}

export function appendVerificationNotes(markdown: string, verificationSummary?: string) {
  const note = verificationSummary?.trim()
  if (!note) {
    return markdown
  }

  const item = `- ${note}`
  if (markdown.includes(item)) {
    return markdown
  }

  const normalized = markdown.endsWith("\n") ? markdown.trimEnd() : markdown
  if (normalized.includes("## Verification Notes")) {
    return `${normalized}\n${item}\n`
  }

  return `${normalized}\n\n## Verification Notes\n${item}\n`
}
