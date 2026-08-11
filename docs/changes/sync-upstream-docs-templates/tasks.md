## 1. 模板部署链路

- [x] 1.1 `src/plugin/skills.ts`：`setupSkillsDir()` 同时复制 `assets/templates/` 到 `<temp>/templates/`，返回前验证四个模板文件存在
- [x] 1.2 `assets/skills/_shared/references/openspec.js`：`getTemplate()` 改为三级回退（用户目录 → 插件内置临时目录 → DEFAULT_TEMPLATES），通过 `import.meta.url` 推导临时根并用 `pathExists()` 防御
- [x] 1.3 `test/reference-scripts.test.ts`：新增模板回退测试（用户覆盖优先 / 内置模板可用 / 均缺失回退 DEFAULT_TEMPLATES）

## 2. 用户可见性同步

- [x] 2.1 `assets/prompts/bootstrap.md`：命令列表更新为全部 12 个（核心 4 + 扩展 8，分类展示）
- [x] 2.2 README.md / README.zh.md / README.en.md：同步为 13 技能 12 命令
- [x] 2.3 docs/zh/usage.md 与 docs/en/usage.md：同步技能与命令清单

## 3. 功能修复

- [x] 3.1 `assets/skills/openspec-onboard/SKILL.md`：移除 `openspec --version` CLI 前置检查，改为验证内置 JS 脚本存在
- [x] 3.2 `src/plugin/server.ts`：提取目录解析辅助函数，消除 env 副作用重复代码
- [x] 3.3 `test/plugin.test.ts`：新增测试（skills 临时目录含 templates / 目录解析优先级仍正确）

## 4. 验证

- [x] 4.1 运行 `npm run typecheck` 与 `npm test`，全部通过
- [x] 4.2 手动冒烟：`node assets/skills/_shared/references/openspec.js` 相关函数在新临时目录布局下正常工作

## Verification Notes
- 模板三级回退测试 9/9 通过（用户覆盖/内置模板/默认兜底）
- bootstrap/README 三语/docs 双语已同步 12 命令 13 技能
- onboard 移除 CLI 检查；server.ts 提取 applyDirectoryCandidate；plugin 测试 15/15 通过
- typecheck 通过；30/30 测试通过；冒烟验证模板三级回退正常
