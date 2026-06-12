/** 解析后的任务项结构 */
export interface ParsedTask {
  id: string
  checked: boolean
  text: string
}

/**
 * 任务行的正则匹配模式
 *
 * 格式：- [ ] 1.1 任务描述 或 - [x] 1.1 任务描述
 * 其中 ID 采用点分数字格式（如 1.1, 2.3.4）。
 */
const TASK_LINE_PATTERN = /^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/
const CHECKBOX_LINE_PATTERN = /^- \[(?: |x)\]/

/** 检查任务 ID 中是否存在前导零的段（如 01.2） */
function hasLeadingZeroSegment(taskId: string) {
  return taskId.split(".").some((segment) => segment.length > 1 && segment.startsWith("0"))
}

/** 断言任务 ID 没有前导零 */
function assertNoLeadingZeroTaskId(taskId: string) {
  if (hasLeadingZeroSegment(taskId)) {
    throw new Error(`tasks.md 包含带前导零的任务 ID，请改为 1.1 这类格式：${taskId}`)
  }
}

/**
 * 规范化任务 ID：去除前导零
 *
 * 例如 "01.02" → "1.2"，"1.10" → "1.10"（中间的零不会被去除，只去除前导零）
 * 非点分数字格式的 ID 原样返回。
 */
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

/**
 * 校验 tasks.md 的格式
 *
 * 检查项：
 * - 所有复选框行必须匹配 TASK_LINE_PATTERN 格式
 * - 无前导零的任务 ID
 * - 无重复的规范化任务 ID
 * 任一检查失败则抛异常。
 */
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

/** 解析 tasks.md 内容，提取所有任务项 */
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

/**
 * 将指定的一组任务标记为已完成
 *
 * 在原 markdown 中查找匹配的任务行，将 [ ] 替换为 [x]。
 * 返回更新后的内容和未找到的任务 ID 列表。
 */
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

/**
 * 在 tasks.md 末尾追加验证备注
 *
 * 如果已存在相同的备注内容则跳过。
 * 如果没有 Verification Notes 章节则自动创建。
 */
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
