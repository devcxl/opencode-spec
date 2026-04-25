# 实现原理

[返回 README](../../README.md) | [English](../en/architecture.md)

`opencode-spec` 采用“插件负责同步资源文件，commands / skills 再通过 reference scripts 执行工作流”的方案，把 OpenSpec 工作流接入 OpenCode。

## 能力边界

插件直接负责：

- 启动时同步资源文件
- 在会话创建时输出同步提示

插件间接接入：

- commands
- skills
- templates
- reference scripts

这些能力都不是通过插件动态注册，而是先写入项目 `.opencode/` 目录，再由 OpenCode 原生发现机制加载或执行。

## 启动时同步流程

启动时插件会扫描包内三个资源目录：

- `assets/commands`
- `assets/skills`
- `assets/templates`

并分别同步到：

- `.opencode/commands`
- `.opencode/skills`
- `.opencode/opencode-spec/templates`

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

同步后的 commands / skills 会通过项目根下的相对路径 `.opencode/skills/**/references/*.js` 调用 reference scripts。

同步时会执行以下策略：

1. **目标文件不存在**：直接写入
2. **目标文件内容与插件资源一致**：跳过
3. **目标文件与上次插件写入版本一致，但插件资源已升级**：直接覆盖
4. **目标文件被用户改动过**：不覆盖原文件，而是生成同名 `.new` 文件，等待人工合并

## Manifest 机制

插件会写入 `.opencode/opencode-spec.manifest.json`，记录：

- 插件版本
- 每个已同步资源的目标路径
- 每个资源的内容哈希

这个 manifest 用来判断：

- 当前文件是否仍然是插件上次写入的版本
- 这次升级是否可以安全覆盖
- 哪些文件已经进入“用户改动，需人工合并”状态

## 会话提示

在 `session.created` 事件上，插件会根据同步结果输出提示，内容通常包括：

- 已同步多少资源文件
- 是否检测到用户改动并生成 `.new`
- commands / skills 是否更新，因此是否建议重启 OpenCode
- 推荐流程：`proposal → specs → design → tasks → apply → archive`

## 当前限制

当前 OpenCode 官方公开插件 API 没有稳定的 system prompt / message context 注入 hook。

因此本插件当前版本采用替代方案：

- 用 skill 与 command 模板承载流程约束
- 用启动同步与会话提示补足引导能力

这也是为什么 commands / skills / reference scripts 的接入方式依赖文件同步，而不是纯运行时注册。
