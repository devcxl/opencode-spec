# 实现原理

[返回 README](../../README.md) | [English](../en/architecture.md)

`opencode-spec` 采用“纯运行时注入”方案，通过 OpenCode 的 `config` hook 在启动时注册 commands 和 skills，不向项目目录写入任何文件。

## 能力边界

插件直接负责：

- 运行时注册 commands 和 skills
- 注入会话引导消息

commands、skills 及其内置参考脚本的调用均由 OpenCode 原生机制执行，插件本身不介入运行时执行。

## 启动流程

插件启动时按以下步骤完成注入：

### 1. Skill 临时目录构建（`setupSkillsDir`）

```
assets/skills/                   /tmp/opencode-spec-skills-XXXX/skills/
├── openspec-propose/     →      ├── openspec-propose/
│   ├── SKILL.md                  │   ├── SKILL.md (路径已替换)
│   └── references/               │   └── references/
├── openspec-apply/        →      ├── openspec-apply/
├── openspec-archive/      →      ├── openspec-archive/
└── openspec-explore/      →      └── openspec-explore/
```

- 将插件包内 `assets/skills/` 复制到系统临时目录（`/tmp/opencode-spec-skills-<random>/skills/`）
- 遍历所有 `SKILL.md`，将 `.opencode/skills/` 路径占位符替换为临时目录实际路径
- 通过 `config.skills.paths` 将临时目录注册为 skill 搜索路径
- 进程退出时通过 `process.on("exit")` 自动清理临时目录

### 2. Command 注册（`loadCommands`）

```
assets/commands/            config.command
├── opsx-propose.md   →     /opsx-propose (template + description)
├── opsx-apply.md     →     /opsx-apply
├── opsx-archive.md   →     /opsx-archive
└── opsx-explore.md   →     /opsx-explore
```

- 解析 `assets/commands/*.md` 的 frontmatter 和模板内容
- 模板中 `.opencode/skills/` 路径同样替换为临时 skill 目录路径
- 通过 `config.command` 直接注册，用户即可通过 `/` 触发
- 如果 `opencode.json` 中已存在同名 command 定义，插件不会覆盖

### 3. 引导消息注入（`experimental.chat.messages.transform`）

- 在每条会话的**首条用户消息**中注入 OpenSpec 工作流引导
- 内容包含可用 slash commands 列表和推荐流程
- 仅在首次注入，不会重复添加

## 当前限制

`experimental.chat.messages.transform` 是实验性 API，未来可能发生变化。

如果该 API 被移除，插件将失去引导消息注入能力，但 commands 和 skills 注入不受影响（均通过 `config` hook 实现，属于稳定 API）。

## 参考脚本的调用方式

Skills 的 SKILL.md 中引用参考脚本的写法：

```
node .opencode/skills/openspec-propose/references/new-change.js "<name>"
```

`.opencode/skills/` 是路径占位符，在运行时被替换为临时目录的实际路径。脚本通过 `node` 直接执行，操作 `openspec/` 目录结构。
