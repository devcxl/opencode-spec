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

### 1. 直接从插件包注册 Skills

```text
<package>/assets/skills/                 OpenCode V2 Skill.Info
├── openspec-propose/SKILL.md     ───→  path 指向包内文件
│   └── references/                      content 中的脚本路径在内存中改写
└── ...
```

- 从插件包的 `assets/skills/` 读取 skill 文件，不复制到临时目录或项目目录
- 注册前在内存中把 `.opencode/skills/` 占位符改写为包内脚本路径；源文件保持不变
- 通过 `ctx.skill.transform` 注册 12 个内置技能及 2 个别名，共 14 个条目
- 卸载时无需清理资源副本
- 内置模板从包内 `assets/templates/` 读取；项目自定义模板优先，默认模板作为缺失时的兜底

### 2. Command 注册（`loadCommands`）

```
assets/commands/            ctx.command.transform
├── opsx-propose.md   →     /opsx-propose (template + description)
├── opsx-apply.md     →     /opsx-apply
├── opsx-archive.md   →     /opsx-archive
└── opsx-explore.md   →     /opsx-explore
```

- 解析 `assets/commands/*.md` 的 frontmatter 和模板内容
- 模板中 `.opencode/skills/` 路径替换为包内脚本路径
- 通过 `ctx.command.transform` 注册 12 个基础命令及 6 个别名，共 18 个条目
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
OPENSPEC_DIR='docs' node '<package-root>/assets/skills/openspec-propose/references/new-change.js' "<name>"
```

`.opencode/skills/` 是 skill 内容中的路径占位符，注册时在内存中改写为带引号的包内脚本路径。每次调用单独设置 `OPENSPEC_DIR`，不会写入共享服务进程的环境变量；默认目录为 `openspec`。
