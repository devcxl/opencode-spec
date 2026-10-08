## 1. Load skills from package resources

- [x] 1.1 Refactor skill loading to read from `packageRoot/assets/skills`, render script references in memory, and preserve package `SKILL.md` paths, skill IDs, and aliases.
- [x] 1.2 Remove temporary skill/template copying and cleanup from plugin setup; keep setup failures visible and preserve per-workspace `OPENSPEC_DIR` rendering.
- [x] 1.3 Add plugin tests proving registered skill content points to package scripts, source `SKILL.md` files remain unchanged, and setup/unload creates no resource copy.

## 2. Read templates from the package

- [x] 2.1 Update the bundled-template path documentation and resolution assumptions to use `assets/templates` relative to the packaged reference script.
- [x] 2.2 Add reference-script tests for project override, packaged template fallback, and `DEFAULT_TEMPLATES` fallback without a temporary directory.

## 3. Verify the packaged runtime

- [x] 3.1 Run tests, typecheck, build, and `npm pack --dry-run`; verify the package contains all referenced skills, scripts, and templates.
- [x] 3.2 Smoke-test the packed plugin under OpenCode V2 and confirm skills register and a reference script executes using the configured workspace directory.

## Verification Notes
- npm test -- test/plugin.test.ts：13/13 通过；验证 Skill.Info.path 指向包内 SKILL.md、指令路径在内存中渲染且源文件不变；插件 setup 返回 void，无临时目录清理流程。
- npm test -- test/plugin.test.ts test/reference-scripts.test.ts：34/34 通过；验证项目模板优先、直接读取 assets/templates、缺少包模板时回退默认模板、读取错误继续传播。
- npm test：41/41 通过；typecheck、build、git diff --check 通过；npm pack --dry-run 输出 67 个文件，7 个必要 skill/script/template 资源全部包含。
- 从实际 npm pack 解包后的插件启动 OpenCode v2.0.24；等待 /api/skill 注册完成后确认 openspec-propose、openspec-apply-change、openspec-archive-change 已注册。用包内 new-change.js 执行 OPENSPEC_DIR=smoke-specs，成功创建 smoke-specs/changes/packed-resource-check；隔离 TMPDIR 中没有 opencode-spec-skills 临时副本。
