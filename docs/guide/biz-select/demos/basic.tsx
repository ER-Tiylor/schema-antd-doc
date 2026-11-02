import { useState } from 'react';
import { Divider, Space, Typography } from 'antd';
import { BizSelect, BizSelectDisplay, remote, staticList } from '@tianyr/schema-antd/biz-select';

const PROVINCES = staticList([
  { value: 'zj', label: '浙江' },
  { value: 'js', label: '江苏' },
  { value: 'gd', label: '广东' },
]);

interface CustomerRecord {
  id: string;
  name: string;
}

const CUSTOMERS: CustomerRecord[] = [
  { id: 'c1', name: '杭州西湖商贸有限公司' },
  { id: 'c2', name: '宁波港口物资有限公司' },
  { id: 'c3', name: '南京金陵百货有限公司' },
];

// 源写在模块外：函数引用稳定，缓存才能跨实例共享
const customerSource = remote({
  // 后端字段名 → 契约 { value, label }，只在入口映射一次
  recordFields: { value: 'id', label: 'name' },
  // 关键词交给「后端」：演示里用 300ms 延迟模拟一次网络往返
  search: async (keyword) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return CUSTOMERS.filter((item) => !keyword || item.name.includes(keyword));
  },
  // 只有编码时按值回显名称
  resolve: async (value) => CUSTOMERS.find((item) => item.id === value) ?? null,
});

export default function BasicDemo() {
  const [province, setProvince] = useState<string>();
  const [customer, setCustomer] = useState<string>();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Typography.Text type="secondary">
          ① 前端常量：`staticList`，不发请求
        </Typography.Text>
        <BizSelect
          source={PROVINCES}
          value={province}
          onChange={(next) => setProvince(next)}
          placeholder="请选择省份"
          style={{ width: 260 }}
        />
      </div>

      <div>
        <Typography.Text type="secondary">
          ② 远程搜索：`remote(&#123; recordFields, search, resolve &#125;)`
        </Typography.Text>
        <BizSelect
          source={customerSource}
          value={customer}
          onChange={(next) => setCustomer(next)}
          placeholder="输入关键词搜索客户"
          style={{ width: 320 }}
        />
      </div>

      <div>
        <Typography.Text type="secondary">
          ③ 只有编码的场景：`BizSelectDisplay` 按值解析名称
        </Typography.Text>
        <div style={{ marginTop: 4 }}>
          <BizSelectDisplay source={customerSource} value="c2" />
        </div>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Text type="secondary">
        当前值：{JSON.stringify({ province, customer })}
      </Typography.Text>
    </Space>
  );
}
