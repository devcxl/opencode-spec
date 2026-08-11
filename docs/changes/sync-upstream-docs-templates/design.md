## Context

当前状态：
- `setupSkillsDir()` 只复制 `assets/skills/` 到临时目录，`assets/templates/` 从未被部署
- `getTemplate()` 只检查用户项目 `.opencode/opencode-spec/templates/`，失败即回退 `DEFAULT_TEMPLATES`（硬编码于 openspec.js）
- bootstrap.md / README / docs 描述 4 命令，实际 12 命令
- `server.ts` 中目录解析逻辑在插件工厂函数和 config 钩子中出现两次，依赖写 `process.env.OPENSPEC_DIR` 作为参考脚本（独立 node 进程）的唯一通信渠道

## Goals / Non-Goals

**Goals:**
- 让插件内置模板可被参考脚本访问（复制到临时目录，与 skills 同级）
- 保持用户项目模板覆盖优先（不覆盖用户自定义内容）
- 所有文档（bootstrap/README/docs）与实际命令技能清单一致
- 简化 server.ts 目录解析，消除重复代码
- onboard 技能不依赖外部 CLI

**Non-Goals:**
- 不重构 `_openspecDir` 模块级状态机制（env 同步渠道保留，仅清理代码）
- 不处理 `docs/specs/` 空目录等 P2 级技术债
- 不更新三语 docs 中的 architecture/reference/release 文档（仅 usage.md）

## Decisions

**D1: 模板部署方式 — 复制到临时目录而非用户项目**
- 选择：`setupSkillsDir()` 额外把 `assets/templates/` 复制到 `<temp>/templates/`，`getTemplate()` 通过 `import.meta.url` 相对路径向上推导临时根
- 理由：插件设计原则是"纯运行时注入，不写用户项目文件"；复制到临时目录与 skills 机制一致
- 备选：启动时写用户项目 `.opencode/opencode-spec/templates/`——会污染用户工作区，且与 skills 临时目录机制不一致

**D2: getTemplate 三级回退顺序**
- 用户目录 → 插件内置（临时目录）→ DEFAULT_TEMPLATES
- 用户覆盖永远优先；DEFAULT_TEMPLATES 仅作最后兜底（如脚本被单独拷贝运行）

**D3: 参考脚本定位内置模板**
- openspec.js 位于 `<temp>/skills/_shared/references/openspec.js`，向上推导 3 级得 `<temp>`，拼接 `templates/`
- 用 `pathExists()` 防御：目录缺失时静默回退下一级

**D4: server.ts 目录解析提取**
- 提取 `resolveDirectoryPrecedence()` 辅助函数，集中处理 env > options > config 优先级
- 保留 env 写入（参考脚本需要），但只写一次、集中处理

**D5: onboard 前置检查**
- 用 `test -f` 验证 `.opencode/skills/openspec-propose/references/new-change.js` 存在
- 移除 `openspec --version` 与 "CLI not installed" 阻塞

## Risks / Trade-offs

- **模板内容过期**：内置模板复制到临时目录后，若用户已生成过 artifact，旧内容不会自动迁移——可接受，模板仅影响新 artifact
- **临时目录推导脆弱**：`import.meta.url` 相对路径推导依赖目录布局不变（`skills/_shared/references`）；测试覆盖可防回归
- **bootstrap 长度**：12 命令分类列出会增加注入长度约 30 行——可接受，远小于上下文窗口
