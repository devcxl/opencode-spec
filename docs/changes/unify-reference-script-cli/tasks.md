## 1. Implement the unified CLI entry point

- [x] 1.1 Add `assets/skills/_shared/references/openspec-cli.js` to dispatch all seven supported subcommands to the existing workflow operations, preserving argument validation and JSON error/result behavior.
- [x] 1.2 Extend reference-script integration tests to exercise every subcommand, archive instruction mode, invalid/missing arguments, and workspace isolation through the unified Node entry point.

## 2. Migrate bundled instructions

- [x] 2.1 Update all Skill instructions, including the onboard preflight check, to use the unified CLI path and matching subcommand arguments.
- [x] 2.2 Update all Command prompts to use the unified CLI path and matching subcommand arguments.
- [x] 2.3 After bundled Skill, Command, and test callers use the unified path, delete the seven operation-specific wrapper scripts and confirm none of their paths remain in the bundle.
- [x] 2.4 Update bilingual architecture, usage, and reference documentation plus explanatory Skill/Command prose to describe the unified CLI and remove obsolete entry-point names.

## 3. Verify the packaged CLI

- [x] 3.1 Run tests, typecheck, build, and `npm pack --dry-run`; verify the packed package contains the CLI and shared implementation and no bundled instructions reference removed wrapper paths.
- [x] 3.2 Smoke-test the packed CLI from a package path containing spaces and confirm `OPENSPEC_DIR` confines created/read workflow data to the selected workspace.

## 4. Address review findings

- [x] 4.1 Correct positional argument selection and boolean-flag validation in the CLI, add regression tests, and update the stale bundled task-marking suggestion.
- [x] 4.2 Normalize migrated Skill Markdown indentation, remove unused test state, and align the active sibling change's onboard preflight references with the unified CLI.

## Verification Notes
- 统一 CLI 分发已实现；reference-scripts 测试 25/25 通过，覆盖七个子命令、错误输出及 OPENSPEC_DIR 隔离。
- Skill、Command 与测试调用均已迁移到统一 CLI；删除 7 个旧入口，assets/test 中无旧路径。reference-scripts 25/25、plugin 13/13 通过。后续 apply 任务回写改用统一 CLI 的 mark-tasks 子命令。
- 补全中英文 architecture、usage、reference 文档和 Skill/Command 说明；assets 与双语用户文档中已无旧独立入口文件名，git diff --check 通过。
- npm run prepublishOnly 通过（45/45 tests、typecheck、build）；npm pack --dry-run 为 61 个文件，统一 CLI 和共享实现均包含且无旧 wrapper 文件。实际解包后的 CLI 在含空格的包路径执行成功，OPENSPEC_DIR='selected spec docs' 创建并读取对应 change，默认 openspec 目录未生成。
- 修复 CLI 选项顺序和布尔 flag 验证；更新残留 mark-tasks 建议；规范迁移后的 Skill 缩进，移除未使用变量，并同步活动 sibling change 的 preflight 路径。npm run prepublishOnly 通过（47/47），npm pack dry-run 61 个文件，打包 smoke（含空格路径、选项顺序、布尔 flag 和 OPENSPEC_DIR 隔离）通过。
