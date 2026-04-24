# opencode-spec

`opencode-spec` 是一个 OpenCode 插件，用于把 OpenSpec 风格的规格驱动开发流程接入 OpenCode。

它提供两类能力：

1. **插件直接提供**：custom tools、启动时资源同步、会话提示
2. **通过文件发现接入**：commands、skills、templates 自动同步到项目 `.opencode/` 目录

## 安装

在项目根目录的 `opencode.json` 中加入：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spec"]
}
```

启动 OpenCode 后，插件会自动同步：

- `.opencode/commands/opsx-*.md`
- `.opencode/skills/openspec/SKILL.md`
- `.opencode/opencode-spec/templates/*.md`

如果 commands 或 skills 首次写入或升级，建议重启 OpenCode，让原生发现机制重新扫描。

## 提供的工具

- `openspec-init`
- `openspec-propose`
- `openspec-design`
- `openspec-tasks`
- `openspec-apply`
- `openspec-archive`
- `openspec-list`

## 提供的命令

- `/opsx-propose`
- `/opsx-design`
- `/opsx-tasks`
- `/opsx-apply`
- `/opsx-archive`
- `/opsx-list`

## 工作流

1. propose
2. design
3. tasks
4. apply
5. archive

## 当前实现说明

- commands 与 skills 不是插件动态注册，而是同步到 `.opencode/` 后由 OpenCode 原生发现
- 插件会写入 `.opencode/opencode-spec.manifest.json`，用于追踪已同步资源
- 如果检测到用户修改过已同步文件，插件不会强制覆盖，而是写入 `.new` 文件供人工合并

## 已知限制

当前 OpenCode 官方公开插件 API 没有稳定的 system prompt / message context 注入 hook。

因此本插件首版采用以下替代方案：

- 通过 skill 与 command 模板承载流程约束
- 通过插件启动事件输出同步与重启提示

## 本地开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

## CI 与发布

### PR 校验

仓库内置 GitHub Actions `CI` 工作流，会在 PR 和推送到 `master` / `main` 时执行：

- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm pack --dry-run`

### 创建发布草稿并发布到 npm

仓库内置三条发布相关工作流：

1. `Release`：手动触发，读取 `package.json.version`，校验通过后创建并推送对应 tag
2. `Draft Release`：监听 `v*` tag push，自动创建 GitHub Draft Release
3. `Publish to npm`：监听 GitHub Release `published` 事件，自动发布到 npm registry

约束：

- tag 必须和 `package.json` 中的版本一致
- 目标提交必须在默认分支的提交链上
- 例如 `package.json.version = 0.1.0-beta.0`，则必须推送 tag：`v0.1.0-beta.0`

### 推荐方式：在 GitHub 页面完成发布

1. 先把 `package.json.version` 改成目标版本并合入默认分支
2. 打开 GitHub 仓库的 **Actions → Release**
3. 点击 **Run workflow**
4. 输入要发布的 `ref`（workflow 默认值当前写死为 `master`；如果仓库默认分支以后变更，请手动输入对应分支）
5. workflow 会自动执行：
   - `npm ci`
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
   - 创建并推送 `v<package.json.version>` tag
6. tag 推送成功后，`Draft Release` workflow 会自动创建 draft release
7. 打开仓库的 **Releases** 页面，进入刚创建的 draft release
8. 点击 **Publish release**
9. `Publish to npm` workflow 会自动执行：
   - `npm ci`
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
   - 根据版本号选择 npm dist-tag 并执行 `npm publish`

发布前需要在 GitHub 仓库配置 `NPM_TOKEN` secret（建议使用 npm automation token）。

- 正式版本（如 `1.2.3`）会发布到 `latest`
- 预发布版本会根据 semver prerelease 标识选择 dist-tag：
  - `1.2.3-beta.0` -> `beta`
  - `1.2.3-rc.0` -> `rc`
  - `1.2.3-alpha.1` -> `alpha`
- 发布阶段会使用 `npm publish --ignore-scripts`，避免在携带 `NPM_TOKEN` 时再次执行 npm lifecycle scripts
- 同版本重复发布会被 npm registry 拒绝，这是预期行为

### 备用方式：本地手动推 tag

示例：

```bash
# 1. 先修改 package.json 的 version

# 2. 提交版本变更
git add package.json package-lock.json
git commit -m "chore: prepare release v0.1.0-beta.0"
git push origin <默认分支>

# 3. 创建并推送 tag
git tag v0.1.0-beta.0
git push origin v0.1.0-beta.0
```

无论使用 GitHub 页面手动触发，还是本地手动推 tag，推送 tag 后都会由 GitHub Actions 自动创建对应的 draft release；只有在 GitHub 页面正式点击 **Publish release** 后，才会真正发布到 npm registry。
