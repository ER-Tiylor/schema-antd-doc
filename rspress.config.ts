import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import { pluginPreview } from '@rspress/plugin-preview';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'zh',
  title: 'schema-antd',
  description: 'Schema 驱动的表单与可编辑表格组件库',
  // 演示文件只作为 preview 的源码被引用，不单独生成路由页
  route: {
    exclude: ['**/demos/**'],
  },
  // 文档 + 演示一体：MDX 里的 ```tsx file="./demos/xxx.tsx" preview 直接跑组件
  plugins: [pluginPreview()],
  // 构建期生成每页的 Markdown 版本与 llms.txt / llms-full.txt（AI 友好输出）
  llms: true,
  themeConfig: {
    logo: '/schema-antd-logo.svg',
    logoText: 'schema-antd',
    // 标题下方显示「复制 Markdown」与「查看 Markdown / ChatGPT / Claude」
    llmsUI: {
      placement: 'title',
      viewOptions: ['markdownLink', 'chatgpt', 'claude'],
    },
    // 首页底部 footer；message 里可以写 HTML，仅在首页渲染
    footer: {
      message: `<div class="site-footer">
  <div class="site-footer__brand">schema-antd</div>
  <div class="site-footer__slogan">Schema 驱动的表单与可编辑表格</div>
  <div class="site-footer__links">
    <a href="/guide/start/">快速开始</a>
    <span>·</span>
    <a href="/guide/editable-table/">组件文档</a>
    <span>·</span>
    <a href="/guide/examples/delivery-single/">完整示例</a>
  </div>
  <div class="site-footer__meta">基于 <a href="https://ant.design" target="_blank" rel="noopener noreferrer">Ant Design</a> 与 Rspress · MIT License · © 2026 Yoram</div>
</div>`,
    },
    nav: [
      { text: '组件', link: '/guide/editable-table/', activeMatch: '/guide/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          collapsible: false,
          items: [{ text: '快速开始', link: '/guide/start/' }],
        },
        {
          text: '可编辑表格',
          collapsible: false,
          items: [
            { text: 'EditableTable', link: '/guide/editable-table/' },
            { text: 'FullEditableTable', link: '/guide/full-editable-table/' },
          ],
        },
        {
          text: '表单与字段',
          collapsible: false,
          items: [
            { text: 'SchemaForm', link: '/guide/schema-form/' },
            { text: 'SchemaFormField', link: '/guide/schema-form-field/' },
            { text: 'SchemaField', link: '/guide/schema-field/' },
            { text: 'FormRuntimeHost', link: '/guide/form-runtime-host/' },
            { text: 'registerField', link: '/guide/register-field/' },
            { text: 'defineFlatFields', link: '/guide/define-flat-fields/' },
          ],
        },
        {
          text: '业务下拉',
          collapsible: false,
          items: [
            { text: 'BizSelect', link: '/guide/biz-select/' },
            { text: 'BizMultiSelect', link: '/guide/biz-multi-select/' },
            { text: 'useCandidates', link: '/guide/use-candidates/' },
            { text: 'useResolvedLabels', link: '/guide/use-resolved-labels/' },
          ],
        },
        {
          text: '完整示例',
          collapsible: false,
          items: [
            { text: '送货明细 · 单活动行', link: '/guide/examples/delivery-single/' },
            { text: '送货明细 · 全行常驻', link: '/guide/examples/delivery-full/' },
            { text: 'BizSelect 全场景', link: '/guide/examples/biz-select-scenarios/' },
          ],
        },
        {
          text: '其他',
          collapsible: false,
          items: [{ text: '工具函数', link: '/guide/utilities/' }],
        },
      ],
    },
  },
});
