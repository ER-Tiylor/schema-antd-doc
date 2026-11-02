# schema-antd 文档站

`@tianyr/schema-antd` 的官方文档站，基于 Rspress 2。文档与可运行演示在同一个页面里：
演示在上，源码折叠在下，与 antd 文档站一致。

线上内容对应发布包 `@tianyr/schema-antd@0.4.1`。

## 环境要求

- Node.js 20+
- pnpm（仓库使用 `pnpm-lock.yaml`）

## 本地开发

```bash
pnpm install
pnpm dev          # 默认 http://localhost:3000
pnpm dev --port 5178
```

生产构建与本地预览：

```bash
pnpm build        # 输出到 doc_build/
pnpm preview      # 预览 doc_build/
```

## 目录结构

```
docs/
  index.md                     首页
  guide/
    start/                     快速开始
    editable-table/            可编辑表格：EditableTable
    full-editable-table/       FullEditableTable
    schema-form/               SchemaForm
    schema-form-field/         SchemaFormField
    schema-field/              SchemaField
    form-runtime-host/         FormRuntimeHost
    register-field/            registerField / 字段注册表
    define-flat-fields/        defineFlatFields
    biz-select/                BizSelect / BizSelectDisplay
    biz-multi-select/          BizMultiSelect
    use-candidates/            useCandidates
    use-resolved-labels/       useResolvedLabels
    utilities/                 工具函数
    examples/                  完整业务示例（送货明细、BizSelect 全场景）
      demos/                   示例源码
  public/                      静态资源
theme/
  index.tsx                    主题扩展：antd ConfigProvider、React 19 补丁、注册 BizSelect
  styles.css                   内容区宽度、演示卡片全屏、首页 footer 样式
  PreviewFullscreen.tsx        给官方预览卡片注入「全屏」按钮
rspress.config.ts              站点配置：路由、预览插件、nav / sidebar、logo、footer
```

## 怎么写一篇文档

1. 在 `docs/guide/<name>/index.mdx` 新建页面；
2. 需要演示时，把组件源码放到同目录的 `demos/*.tsx`，在 MDX 里直接引用：

   ````md
   ```tsx file="./demos/basic.tsx" preview
   ```
   ````

   演示文件只作为预览源码被引用，`route.exclude` 已排除 `**/demos/**`，不会单独生成页面。

3. 在 `rspress.config.ts` 的 `themeConfig.sidebar` 里登记链接；
4. 演示代码里使用发布形态的导入路径：

   ```ts
   import { SchemaForm } from '@tianyr/schema-antd';
   import { registerBizSelectField } from '@tianyr/schema-antd/biz-select';
   ```

文档内容与仓库内 `frontend/src/packages/schema/docs/*.md` 对齐；组件行为变化时两边同步更新，
仓库文档是事实来源。

## Markdown / LLMS 输出

构建期开启 Rspress 内置的 `llms` 能力（`rspress.config.ts` 顶层 `llms: true`）：

- 每个页面生成 Markdown 版本，如 `doc_build/guide/editable-table/index.md`；
- 站点根目录生成 `llms.txt`（页面索引）与 `llms-full.txt`（全文）；
- `themeConfig.llmsUI` 在每篇文档 H1 下方显示「复制 Markdown」按钮，以及
  「Markdown 链接 / 在 ChatGPT 打开 / 在 Claude 打开」下拉菜单。

注意：复制内容通过 `fetch` 读取构建产物，**`rspress dev` 下不可用**
（点击会得到提示文案），本地验证请用：

```bash
pnpm build && pnpm preview
```

## 主题与站点定制

`theme/index.tsx` 遵循 Rspress 2 的主题扩展约定：从 `@rspress/core/theme-original`
取 `Layout`，具名导出自己的 `Layout`，其余主题能力原样透出。不要从 `@rspress/core/theme`
导入 `Layout`——那会指向本文件自身，导致自引用循环。

站点额外做了四件事：

- **antd 接入**：`ConfigProvider`（zh_CN）、`antd/dist/reset.css`、
  `@ant-design/v5-patch-for-react-19`；
- **注册业务下拉字段**：入口调用一次 `registerBizSelectField()`；
- **演示全屏**：官方预览插件没有全屏能力，`PreviewFullscreen` 向预览卡片操作栏注入按钮，
  优先用 Fullscreen API，不支持时退化为铺满视口的 fixed 层（Esc 退出）。
  官方插件以后若支持全屏，删掉该组件与 `styles.css` 里对应的两条规则即可；
- **品牌与 footer**：导航栏图标是 `docs/public/schema-antd-logo.svg`，首页插图是
  `docs/public/schema-antd-hero.svg`；首页 footer 走 `themeConfig.footer.message`
  （支持 HTML，只在首页渲染）。

  注意：`logo` / `logoText` 必须写在配置**顶层**，导航栏组件读的是 `site.logo`；
  放进 `themeConfig` 不会报错也不会生效。另外两个 SVG 都要带上 `width` / `height`，
  只写 `viewBox` 时个别环境（headless Chrome 截图）会渲染成空白。

内容区默认最大宽度 1000px，宽表格演示偏窄，桌面端已在 `theme/styles.css` 中放宽到 1200px。

## 部署

`pnpm build` 产物是纯静态站点，可直接部署到任意静态托管；`doc_build/` 不需要提交。

## License

MIT
