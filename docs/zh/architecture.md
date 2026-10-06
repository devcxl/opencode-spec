# 实现原理

[返回 README](../../README.md) | [English](../en/architecture.md)

`opencode-spec` 面向 OpenCode V2，在插件 `setup(ctx)` 阶段注册 commands 和 skills，不向项目目录写入集成文件。

## 能力边界

插件直接负责：

- 运行时注册 commands 和 skills
- 注入会话引导消息

OpenCode 调用已注册的命令和技能；命令通过 `ctx.session.prompt` 提交渲染后的提示，所需的 Node 参考脚本由 agent 执行。插件不在 OpenCode 服务进程中修改规格文件。

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
- 改写参考脚本路径，并为每次调用单独传递所属项目的 `OPENSPEC_DIR`
- 解析并通过 `ctx.skill.transform` 注册 12 个技能
- 插件卸载或启动失败时清理临时目录

### 2. Command 注册（`loadCommands`）

```
assets/commands/            ctx.command.transform
├── opsx-propose.md   →     /opsx-propose (template + description)
├── opsx-apply.md     →     /opsx-apply
├── opsx-archive.md   →     /opsx-archive
└── opsx-explore.md   →     /opsx-explore
```

- 解析 `assets/commands/*.md` 的 frontmatter 和模板内容
- 模板中 `.opencode/skills/` 路径同样替换为临时 skill 目录路径
- 通过 `ctx.command.transform` 注册 12 个命令，用户即可通过 `/` 触发
- 如果 `opencode.json` 中已存在同名 command 定义，插件不会覆盖

### 3. 会话引导（`ctx.session.hook("context")`）

- 在模型可见的系统上下文中提供 OpenSpec 工作流引导
- 内容包含可用 slash commands 列表和推荐流程
- 如果当前上下文已有引导标记，则不重复添加

## 能力边界

插件使用内置 OpenSpec 风格脚本，不依赖上游 `openspec` CLI，也不承诺覆盖其全部命令、schema 或校验规则。目录配置必须位于项目内；不支持 V1 插件入口。

## 参考脚本的调用方式

Skills 的 SKILL.md 中引用参考脚本的写法：

```
OPENSPEC_DIR='docs' node '/tmp/opencode-spec-skills-XXXX/skills/openspec-propose/references/new-change.js' "<name>"
```

`.opencode/skills/` 是源码中的路径占位符，运行时会改写成带引号的临时脚本路径。每次调用单独设置 `OPENSPEC_DIR`，不会写入共享服务进程的环境变量；默认目录为 `openspec`。
