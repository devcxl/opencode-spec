# CI 与发布

[返回 README](../../README.md) | [English](../en/release.md)

本文档汇总仓库当前的 CI 校验与 npm 发布流程。

## PR 校验

仓库内置 GitHub Actions `CI` 工作流，会在 PR 和推送到 `master` / `main` 时执行：

- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm pack --dry-run`

## 发布相关工作流

仓库内置三条发布工作流：

1. `Release`：手动触发，读取 `package.json.version`，校验通过后创建并推送对应 tag
2. `Draft Release`：监听 `v*` tag push，自动创建 GitHub Draft Release
3. `Publish to npm`：监听 GitHub Release `published` 事件，自动发布到 npm registry

约束：

- tag 必须与 `package.json` 中的版本一致
- 目标提交必须位于默认分支的提交链上
- 例如 `package.json.version = 0.1.0-beta.0`，则必须推送 tag `v0.1.0-beta.0`

## 推荐方式：在 GitHub 页面完成发布

1. 先把 `package.json.version` 改成目标版本并合入默认分支
2. 打开 GitHub 仓库的 **Actions → Release**
3. 点击 **Run workflow**
4. 输入要发布的 `ref`（当前 workflow 默认值写死为 `master`，如果默认分支变更，请手动输入）
5. workflow 会自动执行：
   - `npm ci`
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
   - 创建并推送 `v<package.json.version>` tag
6. tag 推送成功后，`Draft Release` workflow 会自动创建 draft release
7. 打开仓库 **Releases** 页面，进入刚创建的 draft release
8. 点击 **Publish release**
9. `Publish to npm` workflow 会自动执行：
   - `npm ci`
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
   - 根据版本号选择 npm dist-tag 并执行 `npm publish`

发布前需要在 GitHub 仓库配置 `NPM_TOKEN` secret（建议使用 npm automation token）。

## npm dist-tag 规则

- 正式版本（如 `1.2.3`）发布到 `latest`
- 预发布版本根据 semver prerelease 标识选择 dist-tag：
  - `1.2.3-beta.0` → `beta`
  - `1.2.3-rc.0` → `rc`
  - `1.2.3-alpha.1` → `alpha`
- 发布阶段使用 `npm publish --ignore-scripts`，避免在携带 `NPM_TOKEN` 时再次执行 npm lifecycle scripts
- 同版本重复发布会被 npm registry 拒绝，这是预期行为

## 备用方式：本地手动推 tag

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
