import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { registerBizSelectField } from '@tianyr/schema-antd/biz-select';

// antd v5 在 React 19 下的兼容补丁（Modal.confirm / message 等静态方法）
import '@ant-design/v5-patch-for-react-19';
// antd v5 的样式重置
import 'antd/dist/reset.css';
// 站点级样式：内容区宽度、演示卡片全屏
import './styles.css';
import { PreviewFullscreen } from './PreviewFullscreen';

// BizSelect / BizMultiSelect 默认不注册，业务侧要显式注册一次
registerBizSelectField();

// Rspress v2 的主题扩展约定：具名导出 Layout，其余主题能力原样透出
export function Layout() {
  return (
    <ConfigProvider locale={zhCN}>
      <BasicLayout />
      <PreviewFullscreen />
    </ConfigProvider>
  );
}

export * from '@rspress/core/theme-original';
