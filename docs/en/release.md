# CI and Release

[Back to README](../../README.en.md) | [中文](../zh/release.md)

This document summarizes the current CI checks and npm release workflow of the repository.

## PR checks

The repository includes a GitHub Actions `CI` workflow that runs on pull requests and pushes to `master` / `main`:

- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm pack --dry-run`

## Release workflows

The repository includes three release-related workflows:

1. `Release`: manually triggered, reads `package.json.version`, validates the target, then creates and pushes the matching tag
2. `Draft Release`: triggered by `v*` tag pushes and automatically creates a GitHub draft release
3. `Publish to npm`: triggered by the GitHub Release `published` event and publishes to the npm registry

Constraints:

- the tag must match the version in `package.json`
- the target commit must be reachable from the default branch history
- for example, if `package.json.version = 0.1.0-beta.0`, the required tag is `v0.1.0-beta.0`

## Recommended approach: release from the GitHub UI

1. update `package.json.version` to the target version and merge it into the default branch
2. open **Actions → Release** in the GitHub repository
3. click **Run workflow**
4. enter the release `ref` (the current workflow default is hard-coded to `master`; enter the correct branch manually if the default branch changes)
5. the workflow automatically runs:
   - `npm ci`
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
   - create and push `v<package.json.version>`
6. after the tag is pushed, the `Draft Release` workflow automatically creates a draft release
7. open the repository **Releases** page and enter the newly created draft release
8. click **Publish release**
9. the `Publish to npm` workflow automatically runs:
   - `npm ci`
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
   - choose the npm dist-tag from the version and run `npm publish`

Before releasing, configure the `NPM_TOKEN` secret in GitHub (an npm automation token is recommended).

## npm dist-tag rules

- stable versions such as `1.2.3` are published to `latest`
- prerelease versions use the semver prerelease identifier as the dist-tag:
  - `1.2.3-beta.0` → `beta`
  - `1.2.3-rc.0` → `rc`
  - `1.2.3-alpha.1` → `alpha`
- the release workflow uses `npm publish --ignore-scripts` to avoid rerunning npm lifecycle scripts while `NPM_TOKEN` is present
- publishing the same version twice will be rejected by npm, which is expected

## Fallback approach: push the tag locally

Example:

```bash
# 1. update the version in package.json

# 2. commit the version change
git add package.json package-lock.json
git commit -m "chore: prepare release v0.1.0-beta.0"
git push origin <default-branch>

# 3. create and push the tag
git tag v0.1.0-beta.0
git push origin v0.1.0-beta.0
```

Whether you trigger release from the GitHub UI or push the tag manually, the tag push will automatically create a draft release through GitHub Actions. The package is only published to npm after you click **Publish release** on GitHub.
