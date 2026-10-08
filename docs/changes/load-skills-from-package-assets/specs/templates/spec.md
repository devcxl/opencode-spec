## MODIFIED Requirements

### Requirement: 模板三级回退加载

参考脚本 MUST 按以下顺序查找 artifact 模板，第一个存在的文件胜出：

1. 用户项目目录 `.opencode/opencode-spec/templates/<name>.md`
2. 当前安装的插件包内置目录 `assets/templates/<name>.md`
3. 硬编码的 `DEFAULT_TEMPLATES`

#### Scenario: 用户项目存在自定义模板
- **WHEN** 用户在 `.opencode/opencode-spec/templates/` 放置自定义模板
- **THEN** `getTemplate()` 返回用户自定义内容

#### Scenario: 使用插件包内置模板
- **WHEN** 用户项目没有自定义模板且插件包内含对应模板
- **THEN** `getTemplate()` 从当前插件包的 `assets/templates/` 返回该模板内容
- **AND** 插件初始化不需要将模板复制到临时目录

#### Scenario: 插件包内置模板缺失
- **WHEN** 插件包内置模板文件不存在
- **THEN** `getTemplate()` 回退到对应的 `DEFAULT_TEMPLATES` 内容

#### Scenario: 插件包内置模板读取失败
- **WHEN** 插件包内置模板文件存在但无法读取
- **THEN** `getTemplate()` 传播读取错误，不静默回退

## REMOVED Requirements

### Requirement: 插件启动时复制内置模板

插件启动时 MUST NOT 将 `assets/templates/` 复制到临时目录。参考脚本直接从当前安装的插件包读取内置模板。
